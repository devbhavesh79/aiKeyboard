package com.langflow.keyboard.manager

import android.content.Context
import android.content.SharedPreferences
import com.langflow.keyboard.model.ToneStyle
import com.langflow.keyboard.model.TranslationMode
import com.langflow.keyboard.model.UserPreferencesData

/**
 * SettingsManager
 *
 * Manages local persistent configuration via Android SharedPreferences:
 * - Language defaults and active typing/translation modes (Modes A, B, C, D)
 * - Word tone default
 * - Haptic feedback and sound preferences
 * - Debounce durations (500ms default)
 * - Custom backend endpoint configuration
 */
class SettingsManager(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    companion object {
        private const val PREFS_NAME = "com.langflow.keyboard.preferences"

        private const val KEY_SOURCE_LANG = "key_source_lang"
        private const val KEY_TARGET_LANG = "key_target_lang"
        private const val KEY_REPLY_LANG = "key_reply_lang"
        private const val KEY_TRANSLATION_MODE = "key_translation_mode"
        private const val KEY_DEFAULT_TONE = "key_default_tone"
        private const val KEY_HAPTIC_ENABLED = "key_haptic_enabled"
        private const val KEY_SOUND_ENABLED = "key_sound_enabled"
        private const val KEY_PRIVATE_MODE = "key_private_mode"
        private const val KEY_SERVER_URL = "key_server_url"
        private const val KEY_DEBOUNCE_MS = "key_debounce_ms"

        const val DEFAULT_SERVER_URL = "https://api.langflowkeyboard.com"
        const val DEFAULT_DEBOUNCE_MS = 500L
    }

    var sourceLanguage: String
        get() = prefs.getString(KEY_SOURCE_LANG, "hinglish") ?: "hinglish"
        set(value) = prefs.edit().putString(KEY_SOURCE_LANG, value).apply()

    var targetLanguage: String
        get() = prefs.getString(KEY_TARGET_LANG, "en") ?: "en"
        set(value) = prefs.edit().putString(KEY_TARGET_LANG, value).apply()

    var replyLanguage: String
        get() = prefs.getString(KEY_REPLY_LANG, "auto") ?: "auto"
        set(value) = prefs.edit().putString(KEY_REPLY_LANG, value).apply()

    var translationMode: TranslationMode
        get() {
            val name = prefs.getString(KEY_TRANSLATION_MODE, TranslationMode.AUTO_TRANSLATE.name)
            return try {
                TranslationMode.valueOf(name ?: TranslationMode.AUTO_TRANSLATE.name)
            } catch (e: Exception) {
                TranslationMode.AUTO_TRANSLATE
            }
        }
        set(value) = prefs.edit().putString(KEY_TRANSLATION_MODE, value.name).apply()

    var defaultTone: String
        get() = prefs.getString(KEY_DEFAULT_TONE, ToneStyle.PROFESSIONAL.actionKey) ?: ToneStyle.PROFESSIONAL.actionKey
        set(value) = prefs.edit().putString(KEY_DEFAULT_TONE, value).apply()

    var hapticFeedbackEnabled: Boolean
        get() = prefs.getBoolean(KEY_HAPTIC_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_HAPTIC_ENABLED, value).apply()

    var keySoundEnabled: Boolean
        get() = prefs.getBoolean(KEY_SOUND_ENABLED, false)
        set(value) = prefs.edit().putBoolean(KEY_SOUND_ENABLED, value).apply()

    var privateMode: Boolean
        get() = prefs.getBoolean(KEY_PRIVATE_MODE, false)
        set(value) = prefs.edit().putBoolean(KEY_PRIVATE_MODE, value).apply()

    var serverUrl: String
        get() = prefs.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL
        set(value) = prefs.edit().putString(KEY_SERVER_URL, value).apply()

    var debounceMs: Long
        get() = prefs.getLong(KEY_DEBOUNCE_MS, DEFAULT_DEBOUNCE_MS)
        set(value) = prefs.edit().putLong(KEY_DEBOUNCE_MS, value).apply()

    fun getPreferencesData(): UserPreferencesData {
        return UserPreferencesData(
            defaultSourceLang = sourceLanguage,
            defaultTargetLang = targetLanguage,
            defaultTone = defaultTone,
            translationMode = translationMode,
            hapticFeedback = hapticFeedbackEnabled,
            keySound = keySoundEnabled,
            privateMode = privateMode,
            debounceMs = debounceMs
        )
    }
}
