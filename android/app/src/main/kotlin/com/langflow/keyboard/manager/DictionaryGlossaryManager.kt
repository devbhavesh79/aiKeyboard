package com.langflow.keyboard.manager

import java.util.regex.Pattern

/**
 * DictionaryGlossaryManager
 *
 * Provides:
 * 1. Personal Dictionary & Entity Protection:
 *    - Replaces sensitive terms, user dictionary words, emails, phone numbers, and URLs with
 *      placeholders (`__PROTECTED_ENTITY_0__`, `__PROTECTED_ENTITY_1__`) before sending to AI.
 *    - Restores the exact original terms verbatim in the AI response.
 * 2. Deterministic Glossary Enforcement:
 *    - Applies exact glossary substitutions on translated text according to user-defined rules.
 */
class DictionaryGlossaryManager {

    data class MaskedResult(
        val maskedText: String,
        val entityMap: Map<String, String>
    )

    private val userDictionary = mutableSetOf<String>()
    private val userGlossary = mutableMapOf<String, String>() // sourceTerm.lowercase() -> targetTerm

    companion object {
        private val EMAIL_REGEX = Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,6}")
        private val PHONE_REGEX = Pattern.compile("(\\+?[0-9]{1,4}[\\s-]?)?(\\(?[0-9]{3}\\)?[\\s-]?)?[0-9]{3}[\\s-]?[0-9]{4}")
        private val URL_REGEX = Pattern.compile("(https?://|www\\.)\\S+")
        private val HANDLE_REGEX = Pattern.compile("@[a-zA-Z0-9_]+")
    }

    /**
     * Updates the user dictionary with protected words.
     */
    fun setUserDictionary(words: Set<String>) {
        userDictionary.clear()
        userDictionary.addAll(words.map { it.trim() }.filter { it.isNotEmpty() })
    }

    /**
     * Updates the user glossary with source-target term mappings.
     */
    fun setUserGlossary(glossary: Map<String, String>) {
        userGlossary.clear()
        glossary.forEach { (src, tgt) ->
            if (src.isNotBlank() && tgt.isNotBlank()) {
                userGlossary[src.trim().lowercase()] = tgt.trim()
            }
        }
    }

    /**
     * Masks entities and dictionary words in [text] with `__PROTECTED_ENTITY_N__`.
     */
    fun protectEntities(text: String): MaskedResult {
        if (text.isBlank()) return MaskedResult(text, emptyMap())

        var workingText = text
        val entityMap = mutableMapOf<String, String>()
        var counter = 0

        // 1. Mask URLs (Must run first to prevent domain sub-words from matching dictionary terms)
        val urlMatcher = URL_REGEX.matcher(workingText)
        val urlSb = StringBuffer()
        while (urlMatcher.find()) {
            val matched = urlMatcher.group()
            val placeholder = "__PROTECTED_ENTITY_${counter++}__"
            entityMap[placeholder] = matched
            urlMatcher.appendReplacement(urlSb, placeholder)
        }
        urlMatcher.appendTail(urlSb)
        workingText = urlSb.toString()

        // 2. Mask Emails (Must run before dictionary to protect email addresses)
        val emailMatcher = EMAIL_REGEX.matcher(workingText)
        val emailSb = StringBuffer()
        while (emailMatcher.find()) {
            val matched = emailMatcher.group()
            val placeholder = "__PROTECTED_ENTITY_${counter++}__"
            entityMap[placeholder] = matched
            emailMatcher.appendReplacement(emailSb, placeholder)
        }
        emailMatcher.appendTail(emailSb)
        workingText = emailSb.toString()

        // 3. Mask Handles (@username)
        val handleMatcher = HANDLE_REGEX.matcher(workingText)
        val handleSb = StringBuffer()
        while (handleMatcher.find()) {
            val matched = handleMatcher.group()
            val placeholder = "__PROTECTED_ENTITY_${counter++}__"
            entityMap[placeholder] = matched
            handleMatcher.appendReplacement(handleSb, placeholder)
        }
        handleMatcher.appendTail(handleSb)
        workingText = handleSb.toString()

        // 4. Mask User Dictionary Words (longest first to avoid substring collision)
        val sortedDictWords = userDictionary.sortedByDescending { it.length }
        for (word in sortedDictWords) {
            val pattern = Pattern.compile("\\b" + Pattern.quote(word) + "\\b", Pattern.CASE_INSENSITIVE)
            val matcher = pattern.matcher(workingText)
            val sb = StringBuffer()
            while (matcher.find()) {
                val matchedText = matcher.group()
                val placeholder = "__PROTECTED_ENTITY_${counter++}__"
                entityMap[placeholder] = matchedText
                matcher.appendReplacement(sb, placeholder)
            }
            matcher.appendTail(sb)
            workingText = sb.toString()
        }

        return MaskedResult(workingText, entityMap)
    }

    /**
     * Restores protected entity placeholders back to their original values.
     */
    fun restoreEntities(text: String, entityMap: Map<String, String>): String {
        if (text.isBlank() || entityMap.isEmpty()) return text

        var restored = text
        entityMap.forEach { (placeholder, original) ->
            restored = restored.replace(placeholder, original)
        }
        return restored
    }

    /**
     * Applies deterministic glossary mappings to [text].
     */
    fun applyGlossary(text: String): String {
        if (text.isBlank() || userGlossary.isEmpty()) return text

        var processed = text
        userGlossary.forEach { (sourceTerm, targetTerm) ->
            val pattern = Pattern.compile("\\b" + Pattern.quote(sourceTerm) + "\\b", Pattern.CASE_INSENSITIVE)
            val matcher = pattern.matcher(processed)
            processed = matcher.replaceAll(targetTerm)
        }
        return processed
    }
}
