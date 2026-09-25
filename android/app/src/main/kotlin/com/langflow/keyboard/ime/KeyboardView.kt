package com.langflow.keyboard.ime

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.AttributeSet
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.core.content.ContextCompat
import com.langflow.keyboard.R
import com.langflow.keyboard.model.GrammarResult
import com.langflow.keyboard.model.LanguageOption
import com.langflow.keyboard.model.ReplySuggestion
import com.langflow.keyboard.model.ToneStyle
import com.langflow.keyboard.model.TranslationMode
import com.langflow.keyboard.ui.MainActivity

/**
 * KeyboardView
 *
 * Custom Android Keyboard View implementing:
 * - AI Ribbon Toolbar (Translate, Tone, Smart Reply, Grammar, Voice, Undo, Settings, Language & Mode selector)
 * - Dynamic Word & Transliteration Suggestion Strip
 * - Continuous Backspace Auto-repeat on touch hold
 * - Shift & Double-tap Caps Lock states
 * - Responsive QWERTY, Numeric Row, and Symbol Keypad matrices
 * - Haptic feedback and touch animations
 */
@SuppressLint("ClickableViewAccessibility")
class KeyboardView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : LinearLayout(context, attrs, defStyleAttr) {

    interface KeyEventListener {
        fun onCharacter(char: String)
        fun onDelete()
        fun onEnter()
        fun onSpace()
        fun onShiftToggle(isShifted: Boolean, isCapsLock: Boolean)
        fun onTranslateRequested()
        fun onToneRequested(toneKey: String)
        fun onReplyRequested()
        fun onGrammarRequested()
        fun onVoiceRequested()
        fun onUndoRequested()
        fun onModeChanged(newMode: TranslationMode)
        fun onLanguageSelected(lang: LanguageOption)
        fun onSuggestionSelected(word: String)
    }

    var listener: KeyEventListener? = null

    // UI View References
    private val chipLanguage: TextView
    private val chipMode: TextView
    private val btnTranslate: LinearLayout
    private val btnTone: LinearLayout
    private val btnReply: LinearLayout
    private val btnGrammar: LinearLayout
    private val btnVoice: ImageView
    private val btnUndo: ImageView
    private val btnSettings: ImageView
    private val statusBarContainer: LinearLayout
    private val statusProgress: ProgressBar
    private val tvStatusMessage: TextView
    private val suggestionsContainer: LinearLayout
    private val toneScroll: HorizontalScrollView
    private val toneContainer: LinearLayout
    private val keypadContainer: LinearLayout

    // Keyboard Matrix State
    private var isShifted = false
    private var isCapsLock = false
    private var lastShiftTapTime = 0L
    private var isSymbolsMode = false
    private var isHapticEnabled = true
    private val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator

    // Continuous backspace repeat
    private val repeatHandler = Handler(Looper.getMainLooper())
    private var isDeleting = false
    private val deleteRepeatRunnable = object : Runnable {
        override fun run() {
            if (isDeleting) {
                performKeyHaptic()
                listener?.onDelete()
                repeatHandler.postDelayed(this, 50)
            }
        }
    }

    // Active Modes
    private var currentMode = TranslationMode.AUTO_TRANSLATE
    private var currentSourceLang = "hinglish"
    private var currentTargetLang = "en"

    init {
        orientation = VERTICAL
        LayoutInflater.from(context).inflate(R.layout.keyboard_view, this, true)

        chipLanguage = findViewById(R.id.chip_language)
        chipMode = findViewById(R.id.chip_mode)
        btnTranslate = findViewById(R.id.btn_action_translate)
        btnTone = findViewById(R.id.btn_action_tone)
        btnReply = findViewById(R.id.btn_action_reply)
        btnGrammar = findViewById(R.id.btn_action_grammar)
        btnVoice = findViewById(R.id.btn_action_voice)
        btnUndo = findViewById(R.id.btn_action_undo)
        btnSettings = findViewById(R.id.btn_action_settings)
        statusBarContainer = findViewById(R.id.status_bar_container)
        statusProgress = findViewById(R.id.status_progress)
        tvStatusMessage = findViewById(R.id.tv_status_message)
        suggestionsContainer = findViewById(R.id.suggestions_container)
        toneScroll = findViewById(R.id.tone_scroll)
        toneContainer = findViewById(R.id.tone_container)
        keypadContainer = findViewById(R.id.keypad_container)

        setupToolbarInteractions()
        setupToneChips()
        renderKeypad()
    }

    private fun setupToolbarInteractions() {
        chipLanguage.setOnClickListener {
            performKeyHaptic()
            showLanguageSelectionDialog()
        }

        chipMode.setOnClickListener {
            performKeyHaptic()
            cycleNextMode()
        }

        btnTranslate.setOnClickListener {
            performKeyHaptic()
            listener?.onTranslateRequested()
        }

        btnTone.setOnClickListener {
            performKeyHaptic()
            toggleToneRibbon()
        }

        btnReply.setOnClickListener {
            performKeyHaptic()
            listener?.onReplyRequested()
        }

        btnGrammar.setOnClickListener {
            performKeyHaptic()
            listener?.onGrammarRequested()
        }

        btnVoice.setOnClickListener {
            performKeyHaptic()
            listener?.onVoiceRequested()
        }

        btnUndo.setOnClickListener {
            performKeyHaptic()
            listener?.onUndoRequested()
        }

        btnSettings.setOnClickListener {
            performKeyHaptic()
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        }
    }

    private fun showLanguageSelectionDialog() {
        val languages = LanguageOption.ALL
        val items = languages.map { "${it.flagEmoji} ${it.name} (${it.nativeName})" }.toTypedArray()

        val builder = AlertDialog.Builder(context)
        builder.setTitle("Select Target Language")
        builder.setItems(items) { _, which ->
            val selected = languages[which]
            setLanguages(currentSourceLang, selected.code)
            listener?.onLanguageSelected(selected)
        }
        val dialog = builder.create()
        dialog.window?.setType(android.view.WindowManager.LayoutParams.TYPE_APPLICATION_PANEL)
        dialog.show()
    }

    private fun setupToneChips() {
        toneContainer.removeAllViews()
        ToneStyle.values().forEach { tone ->
            val chip = TextView(context).apply {
                text = tone.displayName
                textSize = 12f
                setTextColor(ContextCompat.getColor(context, R.color.chip_text))
                setBackgroundResource(R.drawable.toolbar_chip_background)
                gravity = Gravity.CENTER
                setPadding(dpToPx(12), dpToPx(6), dpToPx(12), dpToPx(6))
                val params = LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dpToPx(30)).apply {
                    rightMargin = dpToPx(6)
                }
                layoutParams = params

                setOnClickListener {
                    performKeyHaptic()
                    toneScroll.visibility = View.GONE
                    listener?.onToneRequested(tone.actionKey)
                }
            }
            toneContainer.addView(chip)
        }
    }

    private fun toggleToneRibbon() {
        toneScroll.visibility = if (toneScroll.visibility == View.VISIBLE) View.GONE else View.VISIBLE
    }

    private fun cycleNextMode() {
        val modes = TranslationMode.values()
        val nextIndex = (currentMode.ordinal + 1) % modes.size
        setTranslationMode(modes[nextIndex])
        listener?.onModeChanged(currentMode)
    }

    fun setTranslationMode(mode: TranslationMode) {
        currentMode = mode
        when (mode) {
            TranslationMode.AUTO_TRANSLATE -> {
                chipMode.text = "⚡ Auto Translate"
                chipMode.setTextColor(ContextCompat.getColor(context, R.color.status_green))
            }
            TranslationMode.AI_ASSIST -> {
                chipMode.text = "💡 AI Assist"
                chipMode.setTextColor(ContextCompat.getColor(context, R.color.primary_light))
            }
            TranslationMode.AS_IS -> {
                chipMode.text = "🚫 As-Is (Raw)"
                chipMode.setTextColor(ContextCompat.getColor(context, R.color.keyboard_text_secondary))
            }
            TranslationMode.TRANSLATE_ON_SEND -> {
                chipMode.text = "📤 Translate on Send"
                chipMode.setTextColor(ContextCompat.getColor(context, R.color.status_amber))
            }
        }
    }

    fun setLanguages(source: String, target: String) {
        currentSourceLang = source
        currentTargetLang = target
        val srcOpt = LanguageOption.findByCode(source)
        val tgtOpt = LanguageOption.findByCode(target)
        chipLanguage.text = "${srcOpt.flagEmoji} ${srcOpt.name} ➔ ${tgtOpt.name}"
    }

    fun setSecureState(isSecure: Boolean) {
        if (isSecure) {
            btnTranslate.visibility = View.GONE
            btnTone.visibility = View.GONE
            btnReply.visibility = View.GONE
            btnGrammar.visibility = View.GONE
            btnVoice.visibility = View.GONE
            suggestionsContainer.removeAllViews()
            statusProgress.visibility = View.GONE
            tvStatusMessage.text = context.getString(R.string.toast_secure_field)
            statusBarContainer.visibility = View.VISIBLE
        } else {
            btnTranslate.visibility = View.VISIBLE
            btnTone.visibility = View.VISIBLE
            btnReply.visibility = View.VISIBLE
            btnGrammar.visibility = View.VISIBLE
            btnVoice.visibility = View.VISIBLE
            statusBarContainer.visibility = View.GONE
        }
    }

    fun setLoading(loading: Boolean, message: String = "") {
        if (loading) {
            tvStatusMessage.text = message
            statusProgress.visibility = View.VISIBLE
            statusBarContainer.visibility = View.VISIBLE
        } else {
            statusBarContainer.visibility = View.GONE
        }
    }

    fun showWordSuggestions(candidates: List<String>, onSelect: (String) -> Unit) {
        suggestionsContainer.removeAllViews()
        candidates.forEach { candidate ->
            val chip = TextView(context).apply {
                text = candidate
                textSize = 14f
                setTextColor(Color.WHITE)
                setBackgroundResource(R.drawable.suggestion_chip_background)
                gravity = Gravity.CENTER
                setPadding(dpToPx(14), dpToPx(6), dpToPx(14), dpToPx(6))
                val params = LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dpToPx(34)).apply {
                    rightMargin = dpToPx(6)
                }
                layoutParams = params

                setOnClickListener {
                    performKeyHaptic()
                    onSelect(candidate)
                    suggestionsContainer.removeAllViews()
                }
            }
            suggestionsContainer.addView(chip)
        }
    }

    fun showReplySuggestions(suggestions: List<ReplySuggestion>, onSelect: (ReplySuggestion) -> Unit) {
        suggestionsContainer.removeAllViews()
        suggestions.forEach { suggestion ->
            val chip = TextView(context).apply {
                text = "${suggestion.text}  (${suggestion.tone})"
                textSize = 13f
                setTextColor(Color.WHITE)
                setBackgroundResource(R.drawable.suggestion_chip_background)
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dpToPx(12), dpToPx(6), dpToPx(12), dpToPx(6))
                val params = LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dpToPx(34)).apply {
                    rightMargin = dpToPx(8)
                }
                layoutParams = params

                setOnClickListener {
                    performKeyHaptic()
                    onSelect(suggestion)
                    suggestionsContainer.removeAllViews()
                }
            }
            suggestionsContainer.addView(chip)
        }
    }

    fun showGrammarPreview(result: GrammarResult, onAccept: () -> Unit) {
        suggestionsContainer.removeAllViews()
        val chip = TextView(context).apply {
            text = "✓ Apply: \"${result.naturalPhrasing}\""
            textSize = 13f
            setTextColor(ContextCompat.getColor(context, R.color.status_green))
            setBackgroundResource(R.drawable.suggestion_chip_background)
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dpToPx(12), dpToPx(6), dpToPx(12), dpToPx(6))
            val params = LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dpToPx(34)).apply {
                rightMargin = dpToPx(8)
            }
            layoutParams = params

            setOnClickListener {
                performKeyHaptic()
                onAccept()
                suggestionsContainer.removeAllViews()
            }
        }
        suggestionsContainer.addView(chip)
    }

    // --- KEYPAD MATRIX RENDERING ---

    private fun renderKeypad() {
        keypadContainer.removeAllViews()

        if (isSymbolsMode) {
            renderSymbolsLayout()
        } else {
            renderQwertyLayout()
        }
    }

    private fun renderQwertyLayout() {
        // Number Row: 1 2 3 4 5 6 7 8 9 0
        val numberRow = listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "0")
        keypadContainer.addView(createKeyRow(numberRow, rowHeightDp = 38))

        // Row 1: Q W E R T Y U I O P
        val row1 = listOf("q", "w", "e", "r", "t", "y", "u", "i", "o", "p")
        keypadContainer.addView(createKeyRow(row1))

        // Row 2: A S D F G H J K L
        val row2 = listOf("a", "s", "d", "f", "g", "h", "j", "k", "l")
        keypadContainer.addView(createKeyRow(row2, sidePaddingDp = 16))

        // Row 3: Shift, Z X C V B N M, Backspace
        val row3 = createRow3WithShiftAndBackspace()
        keypadContainer.addView(row3)

        // Row 4: ?123, Globe, Spacebar, Period, Enter/Send
        val row4 = createBottomActionRow()
        keypadContainer.addView(row4)
    }

    private fun renderSymbolsLayout() {
        val numRow = listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "0")
        keypadContainer.addView(createKeyRow(numRow, rowHeightDp = 38))

        val symRow1 = listOf("@", "#", "$", "%", "&", "-", "+", "(", ")", "/")
        keypadContainer.addView(createKeyRow(symRow1))

        val symRow2 = listOf("*", "\"", "'", ":", ";", "!", "?", "\\", "~", "`")
        keypadContainer.addView(createKeyRow(symRow2))

        val symRow3 = listOf("<", ">", "{", "}", "[", "]", "=", "_", "|", "^")
        val r3 = createKeyRow(symRow3)
        keypadContainer.addView(r3)

        val bottomRow = createBottomActionRow()
        keypadContainer.addView(bottomRow)
    }

    private fun createKeyRow(
        keys: List<String>,
        rowHeightDp: Int = 44,
        sidePaddingDp: Int = 0
    ): LinearLayout {
        val row = LinearLayout(context).apply {
            orientation = HORIZONTAL
            gravity = Gravity.CENTER
            setPadding(dpToPx(sidePaddingDp), 0, dpToPx(sidePaddingDp), 0)
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dpToPx(rowHeightDp)).apply {
                topMargin = dpToPx(3)
            }
        }

        keys.forEach { keyStr ->
            val displayChar = if (isShifted || isCapsLock) keyStr.uppercase() else keyStr
            val keyBtn = Button(context).apply {
                text = displayChar
                textSize = 18f
                setTextColor(ContextCompat.getColor(context, R.color.keyboard_text_primary))
                setBackgroundResource(R.drawable.key_background)
                isAllCaps = false
                val params = LayoutParams(0, LayoutParams.MATCH_PARENT, 1f).apply {
                    leftMargin = dpToPx(2)
                    rightMargin = dpToPx(2)
                }
                layoutParams = params

                setOnClickListener {
                    performKeyHaptic()
                    listener?.onCharacter(displayChar)
                    if (isShifted && !isCapsLock) {
                        isShifted = false
                        renderKeypad()
                    }
                }
            }
            row.addView(keyBtn)
        }
        return row
    }

    private fun createRow3WithShiftAndBackspace(): LinearLayout {
        val row = LinearLayout(context).apply {
            orientation = HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dpToPx(44)).apply {
                topMargin = dpToPx(3)
            }
        }

        // Shift Key with Double Tap Caps Lock
        val shiftBtn = ImageButton(context).apply {
            setImageResource(R.drawable.ic_shift)
            val iconColor = when {
                isCapsLock -> ContextCompat.getColor(context, R.color.primary)
                isShifted -> ContextCompat.getColor(context, R.color.primary_light)
                else -> Color.WHITE
            }
            setColorFilter(iconColor)
            setBackgroundResource(R.drawable.key_background)
            val params = LayoutParams(0, LayoutParams.MATCH_PARENT, 1.4f).apply {
                leftMargin = dpToPx(2)
                rightMargin = dpToPx(2)
            }
            layoutParams = params

            setOnClickListener {
                performKeyHaptic()
                val now = System.currentTimeMillis()
                if (now - lastShiftTapTime < 400) {
                    // Double tap: toggle Caps Lock
                    isCapsLock = !isCapsLock
                    isShifted = isCapsLock
                } else {
                    if (isCapsLock) {
                        isCapsLock = false
                        isShifted = false
                    } else {
                        isShifted = !isShifted
                    }
                }
                lastShiftTapTime = now
                renderKeypad()
                listener?.onShiftToggle(isShifted, isCapsLock)
            }
        }
        row.addView(shiftBtn)

        // Middle keys: Z X C V B N M
        val letters = listOf("z", "x", "c", "v", "b", "n", "m")
        letters.forEach { char ->
            val displayChar = if (isShifted || isCapsLock) char.uppercase() else char
            val keyBtn = Button(context).apply {
                text = displayChar
                textSize = 18f
                setTextColor(ContextCompat.getColor(context, R.color.keyboard_text_primary))
                setBackgroundResource(R.drawable.key_background)
                isAllCaps = false
                val params = LayoutParams(0, LayoutParams.MATCH_PARENT, 1f).apply {
                    leftMargin = dpToPx(2)
                    rightMargin = dpToPx(2)
                }
                layoutParams = params

                setOnClickListener {
                    performKeyHaptic()
                    listener?.onCharacter(displayChar)
                    if (isShifted && !isCapsLock) {
                        isShifted = false
                        renderKeypad()
                    }
                }
            }
            row.addView(keyBtn)
        }

        // Backspace Key with Smooth Auto-Repeat on Hold
        val backspaceBtn = ImageButton(context).apply {
            setImageResource(R.drawable.ic_backspace)
            setColorFilter(Color.WHITE)
            setBackgroundResource(R.drawable.key_background)
            val params = LayoutParams(0, LayoutParams.MATCH_PARENT, 1.4f).apply {
                leftMargin = dpToPx(2)
                rightMargin = dpToPx(2)
            }
            layoutParams = params

            setOnTouchListener { _, event ->
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        performKeyHaptic()
                        listener?.onDelete()
                        isDeleting = true
                        repeatHandler.postDelayed(deleteRepeatRunnable, 350)
                        true
                    }
                    MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                        isDeleting = false
                        repeatHandler.removeCallbacks(deleteRepeatRunnable)
                        true
                    }
                    else -> false
                }
            }
        }
        row.addView(backspaceBtn)

        return row
    }

    private fun createBottomActionRow(): LinearLayout {
        val row = LinearLayout(context).apply {
            orientation = HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dpToPx(44)).apply {
                topMargin = dpToPx(3)
            }
        }

        // Symbols Toggle (?123 / ABC)
        val symBtn = Button(context).apply {
            text = if (isSymbolsMode) "ABC" else "?123"
            textSize = 14f
            setTextColor(ContextCompat.getColor(context, R.color.keyboard_text_primary))
            setBackgroundResource(R.drawable.key_background)
            isAllCaps = false
            val params = LayoutParams(0, LayoutParams.MATCH_PARENT, 1.3f).apply {
                leftMargin = dpToPx(2)
                rightMargin = dpToPx(2)
            }
            layoutParams = params

            setOnClickListener {
                performKeyHaptic()
                isSymbolsMode = !isSymbolsMode
                renderKeypad()
            }
        }
        row.addView(symBtn)

        // Comma Key
        val commaBtn = Button(context).apply {
            text = ","
            textSize = 18f
            setTextColor(ContextCompat.getColor(context, R.color.keyboard_text_primary))
            setBackgroundResource(R.drawable.key_background)
            val params = LayoutParams(0, LayoutParams.MATCH_PARENT, 0.9f).apply {
                leftMargin = dpToPx(2)
                rightMargin = dpToPx(2)
            }
            layoutParams = params

            setOnClickListener {
                performKeyHaptic()
                listener?.onCharacter(",")
            }
        }
        row.addView(commaBtn)

        // Spacebar Key
        val spaceBtn = Button(context).apply {
            text = "LangFlow"
            textSize = 13f
            setTextColor(ContextCompat.getColor(context, R.color.keyboard_text_secondary))
            setBackgroundResource(R.drawable.key_background)
            isAllCaps = false
            val params = LayoutParams(0, LayoutParams.MATCH_PARENT, 4.2f).apply {
                leftMargin = dpToPx(2)
                rightMargin = dpToPx(2)
            }
            layoutParams = params

            setOnClickListener {
                performKeyHaptic()
                listener?.onSpace()
            }
        }
        row.addView(spaceBtn)

        // Period Key
        val dotBtn = Button(context).apply {
            text = "."
            textSize = 18f
            setTextColor(ContextCompat.getColor(context, R.color.keyboard_text_primary))
            setBackgroundResource(R.drawable.key_background)
            val params = LayoutParams(0, LayoutParams.MATCH_PARENT, 0.9f).apply {
                leftMargin = dpToPx(2)
                rightMargin = dpToPx(2)
            }
            layoutParams = params

            setOnClickListener {
                performKeyHaptic()
                listener?.onCharacter(".")
            }
        }
        row.addView(dotBtn)

        // Enter / Action Key
        val enterBtn = ImageButton(context).apply {
            setImageResource(R.drawable.ic_enter)
            setColorFilter(Color.WHITE)
            setBackgroundResource(R.drawable.action_key_background)
            val params = LayoutParams(0, LayoutParams.MATCH_PARENT, 1.5f).apply {
                leftMargin = dpToPx(2)
                rightMargin = dpToPx(2)
            }
            layoutParams = params

            setOnClickListener {
                performKeyHaptic()
                listener?.onEnter()
            }
        }
        row.addView(enterBtn)

        return row
    }

    private fun performKeyHaptic() {
        if (!isHapticEnabled) return
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createOneShot(15, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(15)
            }
        } catch (e: Exception) {
            // Ignore
        }
    }

    private fun dpToPx(dp: Int): Int {
        return (dp * context.resources.displayMetrics.density).toInt()
    }
}
