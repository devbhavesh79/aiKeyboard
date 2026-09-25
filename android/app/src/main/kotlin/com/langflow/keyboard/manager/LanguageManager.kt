package com.langflow.keyboard.manager

import com.langflow.keyboard.model.LanguageOption
import java.util.regex.Pattern

/**
 * LanguageManager
 *
 * Manages multilingual state, script processing, and Indic phonetic transliteration:
 * - Active typing layout and script.
 * - Distinct language destinations: Target Translation, Smart Reply, Grammar checking.
 * - Special modes: "No Translation" (code="none") & "Auto Detect" (code="auto").
 * - Script detection for Indic scripts (Hindi/Devanagari, Gujarati, Bengali, Tamil, Telugu, etc.) and global scripts.
 * - Real-time Indic phonetic transliteration candidates for fast local typing.
 */
class LanguageManager(
    defaultSource: String = "hinglish",
    defaultTarget: String = "en"
) {

    var currentSourceLang: LanguageOption = LanguageOption.findByCode(defaultSource)
        private set

    var currentTargetLang: LanguageOption = LanguageOption.findByCode(defaultTarget)
        private set

    var currentReplyLang: LanguageOption = LanguageOption.findByCode("auto")
        private set

    var currentGrammarLang: LanguageOption = LanguageOption.findByCode("auto")
        private set

    // Script matching patterns
    private val devanagariPattern = Pattern.compile("[\\u0900-\\u097F]")
    private val gujaratiPattern = Pattern.compile("[\\u0A80-\\u0AFF]")
    private val bengaliPattern = Pattern.compile("[\\u0980-\\u09FF]")
    private val tamilPattern = Pattern.compile("[\\u0B80-\\u0BFF]")
    private val teluguPattern = Pattern.compile("[\\u0C00-\\u0C7F]")
    private val arabicPattern = Pattern.compile("[\\u0600-\\u06FF]")
    private val cjkPattern = Pattern.compile("[\\u4E00-\\u9FFF\\u3040-\\u30FF\\uAC00-\\uD7AF]")

    // High-frequency Indic Phonetic Transliteration dictionary (Local, instant 0ms latency)
    private val hindiPhoneticMap = mapOf(
        "namaste" to "नमस्ते",
        "namaskar" to "नमस्कार",
        "kaise" to "कैसे",
        "ho" to "हो",
        "kya" to "क्या",
        "kar" to "कर",
        "rahe" to "रहे",
        "hai" to "है",
        "hain" to "हैं",
        "aap" to "आप",
        "tum" to "तुम",
        "main" to "मैं",
        "me" to "मैं",
        "hum" to "हम",
        "aaj" to "आज",
        "kal" to "कल",
        "shukriya" to "शुक्रिया",
        "dhanyawad" to "धन्यवाद",
        "ha" to "हाँ",
        "haan" to "हाँ",
        "nahi" to "नहीं",
        "theek" to "ठीक",
        "thik" to "ठीक",
        "accha" to "अच्छा",
        "achha" to "अच्छा",
        "bahut" to "बहुत",
        "batao" to "बताओ",
        "milte" to "मिलते",
        "ja" to "जा",
        "raha" to "रहा",
        "hu" to "हूँ",
        "hoon" to "हूँ"
    )

    private val gujaratiPhoneticMap = mapOf(
        "kem" to "કેમ",
        "cho" to "છો",
        "namaste" to "નમસ્તે",
        "namaskar" to "નમસ્કાર",
        "maja" to "મજા",
        "majama" to "મજામાં",
        "saras" to "સરસ",
        "aabhar" to "આભાર",
        "dhanyawad" to "ધન્યવાદ",
        "tamne" to "તમને",
        "tame" to "તમે",
        "hu" to "હું",
        "ame" to "અમે",
        "aaje" to "આજે",
        "aavjo" to "આવજો",
        "ha" to "હા",
        "na" to "ના",
        "nathi" to "નથી",
        "su" to "શું",
        "shu" to "શું",
        "karo" to "કરો",
        "chho" to "છો",
        "saru" to "સારું"
    )

    fun setSourceLanguage(code: String) {
        currentSourceLang = LanguageOption.findByCode(code)
    }

    fun setTargetLanguage(code: String) {
        currentTargetLang = LanguageOption.findByCode(code)
    }

    fun setReplyLanguage(code: String) {
        currentReplyLang = LanguageOption.findByCode(code)
    }

    fun setGrammarLanguage(code: String) {
        currentGrammarLang = LanguageOption.findByCode(code)
    }

    fun isNoTranslationActive(): Boolean {
        return currentTargetLang.code == LanguageOption.NO_TRANSLATION_CODE
    }

    fun detectScript(text: String): String {
        if (text.isBlank()) return "en"

        return when {
            gujaratiPattern.matcher(text).find() -> "gu"
            devanagariPattern.matcher(text).find() -> "hi"
            bengaliPattern.matcher(text).find() -> "bn"
            tamilPattern.matcher(text).find() -> "ta"
            teluguPattern.matcher(text).find() -> "te"
            arabicPattern.matcher(text).find() -> "ar"
            cjkPattern.matcher(text).find() -> "zh"
            else -> "en"
        }
    }

    fun resolveEffectiveLanguage(specifiedCode: String, contextText: String): String {
        return if (specifiedCode == "auto" || specifiedCode.isBlank()) {
            detectScript(contextText)
        } else {
            specifiedCode
        }
    }

    /**
     * Returns real-time phonetic transliteration candidates for the given word.
     */
    fun getTransliterationCandidates(word: String): List<String> {
        val clean = word.trim().lowercase()
        if (clean.isEmpty()) return emptyList()

        val list = mutableListOf<String>()

        // Check target language preference
        if (currentTargetLang.code == "gu" || currentSourceLang.code == "gu") {
            gujaratiPhoneticMap[clean]?.let { list.add(it) }
        }
        if (currentTargetLang.code == "hi" || currentSourceLang.code == "hinglish" || currentSourceLang.code == "hi") {
            hindiPhoneticMap[clean]?.let { list.add(it) }
        }

        // Always include exact typed and capitalized versions
        if (!list.contains(word)) {
            list.add(word)
        }
        val capitalized = word.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
        if (!list.contains(capitalized)) {
            list.add(capitalized)
        }

        return list
    }
}
