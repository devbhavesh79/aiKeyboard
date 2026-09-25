package com.langflow.keyboard.model

/**
 * Translation & Typing Modes (Section 1 of Specification)
 */
enum class TranslationMode {
    AUTO_TRANSLATE,     // Mode A: Automatic real-time translation on typing
    AI_ASSIST,          // Mode B: Normal text untouched, shows AI suggestion action bar
    AS_IS,              // Mode C: Exact original text inserted/sent without translation
    TRANSLATE_ON_SEND   // Mode D: Original text visible while typing, translated on AI send
}

/**
 * Word Tone Transformation Styles (Section 9 of Specification)
 */
enum class ToneStyle(val actionKey: String, val displayName: String) {
    PROFESSIONAL("make_professional", "Professional"),
    CASUAL("make_friendly", "Casual"),
    POLITE("make_polite", "Polite"),
    FORMAL("make_formal", "Formal"),
    SHORT("make_shorter", "Short"),
    CLEAR("make_clearer", "Clear"),
    FRIENDLY("make_friendly", "Friendly"),
    PERSUASIVE("make_clearer", "Persuasive"),
    GRAMMAR("improve_grammar", "Grammar"),
    REWRITE("make_clearer", "Rewrite")
}

/**
 * Supported Languages Catalog (Section 5 & 6 of Specification)
 */
data class LanguageOption(
    val code: String,
    val name: String,
    val nativeName: String,
    val flagEmoji: String,
    val supportsTransliteration: Boolean = false
) {
    companion object {
        const val NO_TRANSLATION_CODE = "none"

        val ALL = listOf(
            LanguageOption("auto", "Auto Detect", "Detect Automatically", "🌐", false),
            LanguageOption(NO_TRANSLATION_CODE, "No Translation", "Original Text", "🚫", false),
            LanguageOption("en", "English", "English (US)", "🇺🇸", false),
            LanguageOption("hi", "Hindi", "हिन्दी", "🇮🇳", true),
            LanguageOption("gu", "Gujarati", "ગુજરાતી", "🇮🇳", true),
            LanguageOption("mr", "Marathi", "मराठी", "🇮🇳", true),
            LanguageOption("hinglish", "Hinglish", "Hinglish", "🇮🇳", true),
            LanguageOption("bn", "Bengali", "বাংলা", "🇮🇳", true),
            LanguageOption("ta", "Tamil", "தமிழ்", "🇮🇳", true),
            LanguageOption("te", "Telugu", "తెలుగు", "🇮🇳", true),
            LanguageOption("kn", "Kannada", "ಕನ್ನಡ", "🇮🇳", true),
            LanguageOption("ml", "Malayalam", "മലയാളം", "🇮🇳", true),
            LanguageOption("pa", "Punjabi", "ਪੰਜਾਬੀ", "🇮🇳", true),
            LanguageOption("es", "Spanish", "Español", "🇪🇸", false),
            LanguageOption("fr", "French", "Français", "🇫🇷", false),
            LanguageOption("de", "German", "Deutsch", "🇩🇪", false),
            LanguageOption("pt", "Portuguese", "Português", "🇧🇷", false),
            LanguageOption("ar", "Arabic", "العربية", "🇸🇦", false),
            LanguageOption("ja", "Japanese", "日本語", "🇯🇵", false),
            LanguageOption("ko", "Korean", "한국어", "🇰🇷", false),
            LanguageOption("zh", "Chinese", "中文", "🇨🇳", false)
        )

        fun findByCode(code: String): LanguageOption {
            return ALL.find { it.code.equals(code, ignoreCase = true) }
                ?: LanguageOption(code, code, code, "🌐", false)
        }
    }
}

data class TranslateResult(
    val originalText: String,
    val translatedText: String,
    val detectedSourceLang: String,
    val confidence: Double = 0.95,
    val alternatives: List<String> = emptyList(),
    val appliedGlossaryTerms: List<String> = emptyList()
)

data class ReplySuggestion(
    val id: String,
    val text: String,
    val tone: String,
    val lengthTag: String = "short",
    val confidence: Double = 0.95
)

data class GrammarCorrectionItem(
    val original: String,
    val corrected: String,
    val explanation: String,
    val type: String
)

data class GrammarResult(
    val originalText: String,
    val correctedText: String,
    val naturalPhrasing: String,
    val corrections: List<GrammarCorrectionItem> = emptyList()
)

data class RewriteResult(
    val originalText: String,
    val rewrittenText: String,
    val tone: String,
    val alternatives: List<String> = emptyList()
)

data class UserPreferencesData(
    val defaultSourceLang: String = "hinglish",
    val defaultTargetLang: String = "en",
    val defaultTone: String = "professional",
    val defaultReplyLength: String = "short",
    val translationMode: TranslationMode = TranslationMode.AUTO_TRANSLATE,
    val autoTranslateEnabled: Boolean = true,
    val hapticFeedback: Boolean = true,
    val keySound: Boolean = false,
    val privateMode: Boolean = false,
    val keyboardHeight: String = "normal",
    val numberRow: Boolean = true,
    val suggestionRow: Boolean = true,
    val debounceMs: Long = 500L
)
