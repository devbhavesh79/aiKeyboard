package com.langflow.keyboard.ime

import android.content.Intent
import android.inputmethodservice.InputMethodService
import android.util.Log
import android.view.View
import android.view.inputmethod.EditorInfo
import android.widget.Toast
import com.langflow.keyboard.client.LangFlowApiClient
import com.langflow.keyboard.manager.*
import com.langflow.keyboard.model.*
import kotlinx.coroutines.*
import java.util.Stack
import java.util.concurrent.atomic.AtomicLong

/**
 * LangFlowIME - Complete Production Android InputMethodService
 *
 * Implements Android Input Method Framework (IMF) compliance:
 * 1. Strictly local normal typing with 0ms network latency.
 * 2. EditorInfo inspection for password, PIN, and sensitive field isolation.
 * 3. Exact selected text retrieval via InputConnection.getSelectedText().
 * 4. Selection-aware text replacement preserving surrounding content, emojis & spaces.
 * 5. App-switching and session lifecycle protection - in-flight requests safely cancelled.
 * 6. Multi-language management: Target language, Reply language, Grammar language, "No Translation" mode.
 * 7. Real-time Indic phonetic transliteration (e.g. "namaste" -> "नमस्ते", "kem cho" -> "કેમ છો").
 * 8. Entity protection (masking personal terms) & deterministic glossary enforcement.
 * 9. Never auto-sends without user intent - commits into active editor for user review.
 * 10. Real-time speech-to-text integration with fallback.
 * 11. Undo/redo history stack.
 */
class LangFlowIME : InputMethodService(), KeyboardView.KeyEventListener {

    companion object {
        private const val TAG = "LangFlowIME"
        private const val MAX_CONTEXT_LENGTH = 1000
    }

    private val serviceScope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    // Specialized Managers
    private lateinit var settingsManager: SettingsManager
    private lateinit var languageManager: LanguageManager
    private lateinit var dictGlossaryManager: DictionaryGlossaryManager
    private lateinit var voiceInputManager: VoiceInputManager
    private lateinit var clipboardManager: ClipboardManager
    private val icManager = InputConnectionManager()
    private var apiClient = LangFlowApiClient()

    // View
    private var keyboardView: KeyboardView? = null

    // Undo stack
    private val undoStack = Stack<TextSnapshot>()

    // Session & Lifecycle Safety
    private val sessionCounter = AtomicLong(0)
    private var currentSessionId: Long = 0
    private var activePackageName: String? = null
    private var isSecureField: Boolean = false
    private var currentActiveJob: Job? = null
    private var debounceTranslationJob: Job? = null

    data class TextSnapshot(
        val originalText: String,
        val replacedText: String,
        val isSelection: Boolean,
        val timestamp: Long = System.currentTimeMillis()
    )

    override fun onCreate() {
        super.onCreate()
        settingsManager = SettingsManager(this)
        languageManager = LanguageManager(settingsManager.sourceLanguage, settingsManager.targetLanguage)
        dictGlossaryManager = DictionaryGlossaryManager()
        voiceInputManager = VoiceInputManager(this)
        clipboardManager = ClipboardManager(this)
        apiClient = LangFlowApiClient(settingsManager.serverUrl)

        Log.i(TAG, "LangFlowIME created.")
    }

    override fun onCreateInputView(): View {
        val view = KeyboardView(this)
        view.listener = this
        view.setTranslationMode(settingsManager.translationMode)
        view.setLanguages(languageManager.currentSourceLang.code, languageManager.currentTargetLang.code)
        keyboardView = view
        return view
    }

    override fun onStartInputView(info: EditorInfo?, restarting: Boolean) {
        super.onStartInputView(info, restarting)

        currentSessionId = sessionCounter.incrementAndGet()
        currentActiveJob?.cancel()
        debounceTranslationJob?.cancel()
        undoStack.clear()

        info?.let { editorInfo ->
            activePackageName = editorInfo.packageName
            isSecureField = SecureFieldDetector.isSecureField(editorInfo)
            keyboardView?.setSecureState(isSecureField)
        } ?: run {
            activePackageName = null
            isSecureField = false
            keyboardView?.setSecureState(false)
        }
    }

    override fun onFinishInputView(finishingInput: Boolean) {
        super.onFinishInputView(finishingInput)
        currentSessionId = sessionCounter.incrementAndGet()
        currentActiveJob?.cancel()
        debounceTranslationJob?.cancel()
        voiceInputManager.stopListening()
    }

    override fun onDestroy() {
        super.onDestroy()
        voiceInputManager.stopListening()
        serviceScope.cancel()
    }

    // --- KEYBOARD VIEW LISTENER CALLBACKS ---

    override fun onCharacter(char: String) {
        icManager.commitText(currentInputConnection, char)
        handleTypingStateChanged()
    }

    override fun onDelete() {
        icManager.handleDelete(currentInputConnection)
        handleTypingStateChanged()
    }

    override fun onEnter() {
        if (settingsManager.translationMode == TranslationMode.TRANSLATE_ON_SEND && !isSecureField) {
            triggerTranslateOnSend()
        } else {
            icManager.handleActionOrEnter(currentInputConnection, currentInputEditorInfo)
        }
    }

    override fun onSpace() {
        icManager.commitText(currentInputConnection, " ")
        handleTypingStateChanged()
    }

    override fun onShiftToggle(isShifted: Boolean, isCapsLock: Boolean) {
        // Handled in KeyboardView
    }

    override fun onModeChanged(newMode: TranslationMode) {
        settingsManager.translationMode = newMode
        showToast("Mode: ${newMode.name}")
    }

    override fun onLanguageSelected(lang: LanguageOption) {
        languageManager.setTargetLanguage(lang.code)
        settingsManager.targetLanguage = lang.code
        keyboardView?.setLanguages(languageManager.currentSourceLang.code, lang.code)
        showToast("Target: ${lang.name}")
    }

    override fun onSuggestionSelected(word: String) {
        val ic = currentInputConnection ?: return
        val currentWord = icManager.getCurrentWord(ic)
        if (currentWord.isNotEmpty()) {
            icManager.replaceText(
                ic = ic,
                originalLength = currentWord.length,
                replacement = "$word ",
                isSelection = false
            )
        } else {
            icManager.commitText(ic, "$word ")
        }
    }

    // --- TYPING & TRANSLITERATION / MODE A DISPATCHER ---

    private fun handleTypingStateChanged() {
        if (isSecureField) return

        val ic = currentInputConnection ?: return
        val currentWord = icManager.getCurrentWord(ic)

        // 1. Instant local transliteration suggestions (0ms latency)
        if (currentWord.isNotEmpty()) {
            val candidates = languageManager.getTransliterationCandidates(currentWord)
            if (candidates.isNotEmpty()) {
                keyboardView?.showWordSuggestions(candidates) { selectedCandidate ->
                    onSuggestionSelected(selectedCandidate)
                }
            }
        }

        // 2. Mode A: Automatic real-time debounced translation
        if (settingsManager.translationMode == TranslationMode.AUTO_TRANSLATE && !languageManager.isNoTranslationActive()) {
            debounceTranslationJob?.cancel()
            debounceTranslationJob = serviceScope.launch {
                delay(settingsManager.debounceMs)
                executeAutoTranslateDebounced()
            }
        }
    }

    private suspend fun executeAutoTranslateDebounced() {
        val ic = currentInputConnection ?: return
        val currentPackage = activePackageName
        val sessionId = currentSessionId

        val activeText = icManager.getActiveDraftText(ic)
        if (activeText.isBlank() || activeText.length < 2) return

        // Capture snapshot before network call to prevent race condition
        val snapshotBeforeRequest = activeText

        // Entity protection masking
        val masked = dictGlossaryManager.protectEntities(activeText)

        try {
            val result = apiClient.translate(
                text = masked.maskedText,
                sourceLang = languageManager.currentSourceLang.code,
                targetLang = languageManager.currentTargetLang.code,
                tone = settingsManager.defaultTone
            )

            // Verify session, package, and ensure user hasn't typed new text during network delay
            if (currentSessionId != sessionId || activePackageName != currentPackage || currentInputConnection == null) {
                return
            }

            val currentTextNow = icManager.getActiveDraftText(currentInputConnection)
            if (currentTextNow != snapshotBeforeRequest) {
                // User continued typing while request was in-flight. Discard stale response to prevent text corruption!
                return
            }

            if (result != null && result.translatedText.isNotBlank()) {
                val restored = dictGlossaryManager.restoreEntities(result.translatedText, masked.entityMap)
                val finalized = dictGlossaryManager.applyGlossary(restored)

                // Commits replacement
                icManager.replaceText(
                    ic = currentInputConnection,
                    originalLength = activeText.length,
                    replacement = finalized,
                    isSelection = false
                )
            }
        } catch (e: Exception) {
            // Retain local typing uninterrupted on network error
        }
    }

    // --- 1. MANUAL TRANSLATE ACTION ---

    override fun onTranslateRequested() {
        if (isSecureField) {
            showToast("AI features disabled in password & secure fields.")
            return
        }

        if (languageManager.isNoTranslationActive()) {
            showToast("No Translation mode is active.")
            return
        }

        val ic = currentInputConnection ?: return
        val currentPackage = activePackageName
        val sessionId = currentSessionId

        val selectedText = icManager.getSelectedText(ic)
        val isSelection = !selectedText.isNullOrBlank()
        val textToTranslate = if (isSelection) selectedText!! else icManager.getActiveDraftText(ic)

        if (textToTranslate.isBlank()) {
            showToast(getString(com.langflow.keyboard.R.string.toast_no_text))
            return
        }

        val masked = dictGlossaryManager.protectEntities(textToTranslate)

        currentActiveJob?.cancel()
        currentActiveJob = serviceScope.launch {
            keyboardView?.setLoading(true, "Translating to ${languageManager.currentTargetLang.name}...")
            try {
                val result = apiClient.translate(
                    text = masked.maskedText,
                    sourceLang = languageManager.currentSourceLang.code,
                    targetLang = languageManager.currentTargetLang.code,
                    tone = settingsManager.defaultTone
                )
                keyboardView?.setLoading(false)

                if (currentSessionId != sessionId || activePackageName != currentPackage || currentInputConnection == null) {
                    return@launch
                }

                if (result != null && result.translatedText.isNotBlank()) {
                    val restored = dictGlossaryManager.restoreEntities(result.translatedText, masked.entityMap)
                    val finalized = dictGlossaryManager.applyGlossary(restored)

                    val targetIc = currentInputConnection ?: return@launch
                    undoStack.push(TextSnapshot(textToTranslate, finalized, isSelection))
                    icManager.replaceText(
                        ic = targetIc,
                        originalLength = textToTranslate.length,
                        replacement = finalized,
                        isSelection = isSelection
                    )
                } else {
                    showToast("Translation unavailable. Check connection.")
                }
            } catch (e: Exception) {
                keyboardView?.setLoading(false)
                showToast("Translation error. Local typing unaffected.")
            }
        }
    }

    // --- 2. SMART AI REPLY ---

    override fun onReplyRequested() {
        if (isSecureField) {
            showToast("AI features disabled in secure fields.")
            return
        }

        val ic = currentInputConnection ?: return
        val currentPackage = activePackageName
        val sessionId = currentSessionId

        // Read context from selection or clipboard
        val userDraft = icManager.getActiveDraftText(ic)
        val clipboardText = clipboardManager.getPrimaryClipText()
        val incomingContext = when {
            clipboardText != null && clipboardText.isNotBlank() -> clipboardText
            userDraft.isNotBlank() -> userDraft
            else -> "Hello"
        }

        val targetLangCode = languageManager.resolveEffectiveLanguage(
            languageManager.currentReplyLang.code,
            incomingContext
        )

        currentActiveJob?.cancel()
        currentActiveJob = serviceScope.launch {
            keyboardView?.setLoading(true, "Generating replies in $targetLangCode...")
            try {
                val suggestions = apiClient.generateReplies(
                    incomingMessage = incomingContext,
                    draftMessage = userDraft,
                    targetLanguage = targetLangCode,
                    tone = settingsManager.defaultTone,
                    intent = "neutral"
                )
                keyboardView?.setLoading(false)

                if (currentSessionId != sessionId || activePackageName != currentPackage || currentInputConnection == null) {
                    return@launch
                }

                if (!suggestions.isNullOrEmpty()) {
                    keyboardView?.showReplySuggestions(suggestions) { selectedReply ->
                        val targetIc = currentInputConnection ?: return@showReplySuggestions
                        if (currentSessionId != sessionId || activePackageName != currentPackage) {
                            showToast("App changed. Reply cancelled.")
                            return@showReplySuggestions
                        }

                        targetIc.beginBatchEdit()
                        try {
                            targetIc.commitText(selectedReply.text, 1)
                        } finally {
                            targetIc.endBatchEdit()
                        }
                    }
                } else {
                    showToast("Unable to generate suggestions.")
                }
            } catch (e: Exception) {
                keyboardView?.setLoading(false)
                showToast("Reply generation error.")
            }
        }
    }

    // --- 3. WORD TONE REWRITE ---

    override fun onToneRequested(toneKey: String) {
        if (isSecureField) return
        val ic = currentInputConnection ?: return
        val currentPackage = activePackageName
        val sessionId = currentSessionId

        val selected = icManager.getSelectedText(ic)
        val isSelection = !selected.isNullOrBlank()
        val textToRewrite = if (isSelection) selected!! else icManager.getActiveDraftText(ic)

        if (textToRewrite.isBlank()) {
            showToast("Please enter or select text to adjust tone.")
            return
        }

        currentActiveJob?.cancel()
        currentActiveJob = serviceScope.launch {
            keyboardView?.setLoading(true, "Applying $toneKey tone...")
            try {
                val result = apiClient.rewriteTone(
                    text = textToRewrite,
                    action = toneKey,
                    targetLanguage = languageManager.currentTargetLang.code
                )
                keyboardView?.setLoading(false)

                if (currentSessionId != sessionId || activePackageName != currentPackage || currentInputConnection == null) {
                    return@launch
                }

                if (result != null && result.rewrittenText.isNotBlank()) {
                    val targetIc = currentInputConnection ?: return@launch
                    undoStack.push(TextSnapshot(textToRewrite, result.rewrittenText, isSelection))
                    icManager.replaceText(
                        ic = targetIc,
                        originalLength = textToRewrite.length,
                        replacement = result.rewrittenText,
                        isSelection = isSelection
                    )
                }
            } catch (e: Exception) {
                keyboardView?.setLoading(false)
            }
        }
    }

    // --- 4. GRAMMAR CHECK ---

    override fun onGrammarRequested() {
        if (isSecureField) return
        val ic = currentInputConnection ?: return
        val currentPackage = activePackageName
        val sessionId = currentSessionId

        val selected = icManager.getSelectedText(ic)
        val isSelection = !selected.isNullOrBlank()
        val textToCheck = if (isSelection) selected!! else icManager.getActiveDraftText(ic)

        if (textToCheck.isBlank()) {
            showToast("Please enter or select text to check grammar.")
            return
        }

        currentActiveJob?.cancel()
        currentActiveJob = serviceScope.launch {
            keyboardView?.setLoading(true, "Checking grammar...")
            try {
                val result = apiClient.checkGrammar(
                    text = textToCheck,
                    language = languageManager.currentGrammarLang.code
                )
                keyboardView?.setLoading(false)

                if (currentSessionId != sessionId || activePackageName != currentPackage || currentInputConnection == null) {
                    return@launch
                }

                if (result != null) {
                    keyboardView?.showGrammarPreview(result) {
                        val targetIc = currentInputConnection ?: return@showGrammarPreview
                        undoStack.push(TextSnapshot(textToCheck, result.naturalPhrasing, isSelection))
                        icManager.replaceText(
                            ic = targetIc,
                            originalLength = textToCheck.length,
                            replacement = result.naturalPhrasing,
                            isSelection = isSelection
                        )
                    }
                }
            } catch (e: Exception) {
                keyboardView?.setLoading(false)
            }
        }
    }

    // --- 5. VOICE INPUT ---

    override fun onVoiceRequested() {
        if (voiceInputManager.isListening()) {
            voiceInputManager.stopListening()
            keyboardView?.setLoading(false)
            return
        }

        voiceInputManager.startListening(
            languageLocale = "en-US",
            callback = object : VoiceInputManager.VoiceCallback {
                override fun onSpeechStart() {
                    keyboardView?.setLoading(true, "Listening...")
                }

                override fun onPartialSpeechResult(partialText: String) {
                    keyboardView?.setLoading(true, "Heard: $partialText")
                }

                override fun onFinalSpeechResult(finalText: String) {
                    keyboardView?.setLoading(false)
                    icManager.commitText(currentInputConnection, "$finalText ")
                    handleTypingStateChanged()
                }

                override fun onSpeechError(errorMessage: String) {
                    keyboardView?.setLoading(false)
                    showToast(errorMessage)
                }

                override fun onSpeechEnd() {
                    keyboardView?.setLoading(false)
                }
            }
        )
    }

    // --- 6. UNDO ACTION ---

    override fun onUndoRequested() {
        if (undoStack.isEmpty()) {
            showToast("Nothing to undo.")
            return
        }

        val ic = currentInputConnection ?: return
        val snapshot = undoStack.pop()

        ic.beginBatchEdit()
        try {
            ic.deleteSurroundingText(snapshot.replacedText.length, 0)
            ic.commitText(snapshot.originalText, 1)
        } finally {
            ic.endBatchEdit()
        }
    }

    // --- 7. TRANSLATE ON SEND (MODE D) ---

    private fun triggerTranslateOnSend() {
        val ic = currentInputConnection ?: return
        val draft = icManager.getActiveDraftText(ic)
        if (draft.isBlank()) {
            icManager.handleActionOrEnter(ic, currentInputEditorInfo)
            return
        }

        val currentPackage = activePackageName
        val sessionId = currentSessionId

        currentActiveJob?.cancel()
        currentActiveJob = serviceScope.launch {
            keyboardView?.setLoading(true, "Translating before send...")
            try {
                val result = apiClient.translate(
                    text = draft,
                    sourceLang = languageManager.currentSourceLang.code,
                    targetLang = languageManager.currentTargetLang.code,
                    tone = settingsManager.defaultTone
                )
                keyboardView?.setLoading(false)

                if (currentSessionId != sessionId || activePackageName != currentPackage || currentInputConnection == null) {
                    return@launch
                }

                val finalReplacement = result?.translatedText ?: draft
                val targetIc = currentInputConnection ?: return@launch
                icManager.replaceText(targetIc, draft.length, finalReplacement, false)
                icManager.handleActionOrEnter(targetIc, currentInputEditorInfo)
            } catch (e: Exception) {
                keyboardView?.setLoading(false)
                icManager.handleActionOrEnter(currentInputConnection, currentInputEditorInfo)
            }
        }
    }

    private fun showToast(message: String) {
        Toast.makeText(applicationContext, message, Toast.LENGTH_SHORT).show()
    }
}
