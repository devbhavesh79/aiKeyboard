package com.langflow.keyboard

import com.langflow.keyboard.manager.LanguageManager
import com.langflow.keyboard.model.LanguageOption
import org.junit.Assert.*
import org.junit.Test

class LanguageManagerTest {

    @Test
    fun testScriptDetection() {
        val manager = LanguageManager()

        // Hindi (Devanagari)
        assertEquals("hi", manager.detectScript("नमस्ते आप कैसे हैं?"))

        // Gujarati
        assertEquals("gu", manager.detectScript("કેમ છો? મજામાં?"))

        // Bengali
        assertEquals("bn", manager.detectScript("আপনি কেমন আছেন?"))

        // Tamil
        assertEquals("ta", manager.detectScript("நீங்கள் எப்படி இருக்கிறீர்கள்?"))

        // Arabic
        assertEquals("ar", manager.detectScript("مرحبا كيف حالك"))

        // English
        assertEquals("en", manager.detectScript("Hello, how are you?"))
    }

    @Test
    fun testNoTranslationMode() {
        val manager = LanguageManager()
        assertFalse(manager.isNoTranslationActive())

        manager.setTargetLanguage(LanguageOption.NO_TRANSLATION_CODE)
        assertTrue(manager.isNoTranslationActive())
    }

    @Test
    fun testResolveEffectiveLanguage() {
        val manager = LanguageManager()

        // Explicit target
        assertEquals("es", manager.resolveEffectiveLanguage("es", "Hello"))

        // Auto target with Hindi text
        assertEquals("hi", manager.resolveEffectiveLanguage("auto", "नमस्ते"))

        // Auto target with Gujarati text
        assertEquals("gu", manager.resolveEffectiveLanguage("auto", "કેમ છો"))
    }
}
