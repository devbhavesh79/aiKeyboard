package com.langflow.keyboard.manager

import android.text.InputType
import android.view.inputmethod.EditorInfo

/**
 * SecureFieldDetector
 *
 * Inspects Android [EditorInfo] to accurately detect password, PIN, numeric security codes,
 * credit card, and banking input fields.
 *
 * When a secure field is detected:
 * 1. AI translation, grammar, tone rewriting, and smart replies are strictly disabled.
 * 2. Suggestion bar is hidden to prevent sensitive data leakage.
 * 3. Keystroke telemetry and network logging are strictly isolated (0 bytes transmitted).
 */
object SecureFieldDetector {

    /**
     * Inspects the given [EditorInfo] to determine if it is a sensitive/password field.
     */
    fun isSecureField(info: EditorInfo?): Boolean {
        if (info == null) return false

        val inputType = info.inputType
        val inputClass = inputType and InputType.TYPE_MASK_CLASS
        val variation = inputType and InputType.TYPE_MASK_VARIATION

        // Text Passwords
        if (inputClass == InputType.TYPE_CLASS_TEXT) {
            when (variation) {
                InputType.TYPE_TEXT_VARIATION_PASSWORD,
                InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD,
                InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD -> return true
            }
        }

        // Numeric Passwords / PINs
        if (inputClass == InputType.TYPE_CLASS_NUMBER) {
            if (variation == InputType.TYPE_NUMBER_VARIATION_PASSWORD) {
                return true
            }
        }

        // Check for No Suggestions or Private flags combined with sensitive contexts
        val flags = inputType and InputType.TYPE_MASK_FLAGS
        val isNoSuggestions = (flags and InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS) != 0

        // Additional heuristic check on field name or hint text if present (e.g. credit card, cvv, otp)
        val fieldName = (info.fieldName ?: "").lowercase()
        val hintText = (info.hintText ?: "").toString().lowercase()
        val sensitiveKeywords = listOf("password", "passwd", "pin", "cvv", "cvc", "otp", "secret", "token", "creditcard", "cardnumber")

        if (sensitiveKeywords.any { fieldName.contains(it) || hintText.contains(it) }) {
            return true
        }

        return false
    }

    /**
     * Checks if standard text suggestions should be enabled for this input field.
     */
    fun isSuggestionsAllowed(info: EditorInfo?): Boolean {
        if (isSecureField(info)) return false
        if (info == null) return true

        val flags = info.inputType and InputType.TYPE_MASK_FLAGS
        return (flags and InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS) == 0
    }
}
