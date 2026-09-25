package com.langflow.keyboard

import android.text.InputType
import android.view.inputmethod.EditorInfo
import com.langflow.keyboard.manager.SecureFieldDetector
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SecureFieldDetectorTest {

    @Test
    fun testTextPasswordDetected() {
        val info = EditorInfo().apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
        }
        assertTrue(SecureFieldDetector.isSecureField(info))
        assertFalse(SecureFieldDetector.isSuggestionsAllowed(info))
    }

    @Test
    fun testVisiblePasswordDetected() {
        val info = EditorInfo().apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
        }
        assertTrue(SecureFieldDetector.isSecureField(info))
    }

    @Test
    fun testWebPasswordDetected() {
        val info = EditorInfo().apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD
        }
        assertTrue(SecureFieldDetector.isSecureField(info))
    }

    @Test
    fun testNumericPinPasswordDetected() {
        val info = EditorInfo().apply {
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
        }
        assertTrue(SecureFieldDetector.isSecureField(info))
    }

    @Test
    fun testNormalTextFieldNotDetectedAsSecure() {
        val info = EditorInfo().apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_NORMAL
        }
        assertFalse(SecureFieldDetector.isSecureField(info))
        assertTrue(SecureFieldDetector.isSuggestionsAllowed(info))
    }

    @Test
    fun testSensitiveFieldNameKeywordsDetected() {
        val info = EditorInfo().apply {
            inputType = InputType.TYPE_CLASS_TEXT
            fieldName = "user_cvv_code"
        }
        assertTrue(SecureFieldDetector.isSecureField(info))
    }
}
