package com.langflow.keyboard.model

/**
  * Language models and types for LangFlow AI Keyboard
  */
enum class LanguageType {
    TRANSLATE_TARGET,
    REPLY_TARGET,
    GRAMMAR_CHECK
}

data class LanguageOption(
    val code: String,
    val name: String,
    val nativeName: String,
    val flagEmoji: String
) {
    companion object {
        val ALL = listOf(
            LanguageOption("en", "English", "English", "🇺🇸"),
            LanguageOption("hi", "Hindi", "हिन्दी", "🇮🇳"),
            LanguageOption("gu", "Gujarati", "ગુજરાતી", "🇮🇳"),
            LanguageOption("mr", "Marathi", "मराठी", "🇮🇳"),
            LanguageOption("hinglish", "Hinglish", "Hinglish", "🇮🇳"),
            LanguageOption("es", "Spanish", "Español", "🇪🇸"),
            LanguageOption("fr", "French", "Français", "🇫🇷"),
            LanguageOption("de", "German", "Deutsch", "🇩🇪"),
            LanguageOption("ar", "Arabic", "العربية", "🇸🇦"),
            LanguageOption("ja", "Japanese", "日本語", "🇯🇵")
        )

        fun findByCode(code: String): LanguageOption {
            return ALL.find { it.code.equals(code, ignoreCase = true) }
                ?: LanguageOption(code, code, code, "🌐")
        }
    }
}

data class TranslateResult(
    val originalText: String,
    val translatedText: String,
    val detectedSourceLang: String,
    val confidence: Double,
    val alternatives: List<String> = emptyList()
)

data class ReplySuggestion(
    val id: String,
    val text: String,
    val tone: String,
    val lengthTag: String,
    val confidence: Double = 0.95
)

data class GrammarResult(
    val originalText: String,
    val correctedText: String,
    val naturalPhrasing: String,
    val explanation: String = ""
)

data class RewriteResult(
    val originalText: String,
    val rewrittenText: String,
    val tone: String
)
