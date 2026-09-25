package com.langflow.keyboard

import com.langflow.keyboard.manager.DictionaryGlossaryManager
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DictionaryGlossaryManagerTest {

    @Test
    fun testEntityProtectionAndRestoration() {
        val manager = DictionaryGlossaryManager()
        manager.setUserDictionary(setOf("LangFlow", "Bhavesh"))

        val input = "Hello Bhavesh, please check https://langflowkeyboard.com and email support@langflow.com regarding LangFlow."
        val masked = manager.protectEntities(input)

        // Verifies protected placeholders exist
        assertTrue(masked.maskedText.contains("__PROTECTED_ENTITY_"))
        assertEquals(4, masked.entityMap.size)

        // Simulate AI translating surrounding text while preserving placeholders
        val translatedWithPlaceholders = masked.maskedText.replace("Hello", "नमस्ते")

        // Restore entities
        val restored = manager.restoreEntities(translatedWithPlaceholders, masked.entityMap)

        assertTrue(restored.contains("नमस्ते"))
        assertTrue(restored.contains("Bhavesh"))
        assertTrue(restored.contains("https://langflowkeyboard.com"))
        assertTrue(restored.contains("support@langflow.com"))
        assertTrue(restored.contains("LangFlow"))
    }

    @Test
    fun testDeterministicGlossarySubstitution() {
        val manager = DictionaryGlossaryManager()
        manager.setUserGlossary(mapOf(
            "AI Keyboard" to "LangFlow Intelligent IME",
            "invoice" to "bill of supply"
        ))

        val input = "This AI Keyboard created the invoice."
        val result = manager.applyGlossary(input)

        assertEquals("This LangFlow Intelligent IME created the bill of supply.", result)
    }
}
