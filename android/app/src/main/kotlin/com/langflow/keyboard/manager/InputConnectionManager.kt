package com.langflow.keyboard.manager

import android.view.KeyEvent
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection

/**
 * InputConnectionManager
 *
 * Encapsulates all text manipulation logic on Android's [InputConnection].
 * Features:
 * - Atomic batch edits to prevent cursor flicker.
 * - Selection-aware text replacement (replaces highlighted text while preserving surrounding content, emojis, and punctuation).
 * - Preceding text/context retrieval with configurable character windows.
 * - Word boundary extraction for inline spell/grammar/tone transformations.
 * - Action key dispatching (IME_ACTION_SEARCH, IME_ACTION_SEND, etc.).
 */
class InputConnectionManager {

    companion object {
        const val DEFAULT_CONTEXT_WINDOW = 1000
    }

    /**
     * Inserts standard text at current cursor position or replaces active selection.
     */
    fun commitText(ic: InputConnection?, text: String, newCursorPosition: Int = 1): Boolean {
        if (ic == null) return false
        return ic.commitText(text, newCursorPosition)
    }

    /**
     * Deletes one character backwards or deletes the currently selected text.
     */
    fun handleDelete(ic: InputConnection?): Boolean {
        if (ic == null) return false
        val selected = ic.getSelectedText(0)
        return if (!selected.isNullOrEmpty()) {
            ic.commitText("", 1)
        } else {
            ic.deleteSurroundingText(1, 0)
        }
    }

    /**
     * Retrieves the currently selected text, or null if no selection exists.
     */
    fun getSelectedText(ic: InputConnection?): String? {
        if (ic == null) return null
        val charSeq = ic.getSelectedText(0)
        return if (!charSeq.isNullOrEmpty()) charSeq.toString() else null
    }

    /**
     * Retrieves the text before the cursor up to [maxChars].
     */
    fun getTextBeforeCursor(ic: InputConnection?, maxChars: Int = DEFAULT_CONTEXT_WINDOW): String {
        if (ic == null) return ""
        val charSeq = ic.getTextBeforeCursor(maxChars, 0)
        return charSeq?.toString() ?: ""
    }

    /**
     * Retrieves the text after the cursor up to [maxChars].
     */
    fun getTextAfterCursor(ic: InputConnection?, maxChars: Int = DEFAULT_CONTEXT_WINDOW): String {
        if (ic == null) return ""
        val charSeq = ic.getTextAfterCursor(maxChars, 0)
        return charSeq?.toString() ?: ""
    }

    /**
     * Extracts the active sentence or draft before cursor.
     */
    fun getActiveDraftText(ic: InputConnection?): String {
        val selected = getSelectedText(ic)
        if (!selected.isNullOrBlank()) return selected

        val before = getTextBeforeCursor(ic, DEFAULT_CONTEXT_WINDOW).trim()
        return before
    }

    /**
     * Extracts the current word at or before the cursor.
     */
    fun getCurrentWord(ic: InputConnection?): String {
        val before = getTextBeforeCursor(ic, 100)
        if (before.isEmpty()) return ""
        val lastSpaceIndex = before.lastIndexOfAny(charArrayOf(' ', '\n', '\t', '.', ',', '!', '?'))
        return if (lastSpaceIndex == -1) {
            before
        } else {
            before.substring(lastSpaceIndex + 1)
        }
    }

    /**
     * Atomically replaces target text with new replacement text.
     * If [isSelection] is true, replaces the current selection.
     * Otherwise, deletes [charsToDelete] before cursor and commits [replacement].
     */
    fun replaceText(
        ic: InputConnection?,
        originalLength: Int,
        replacement: String,
        isSelection: Boolean
    ): Boolean {
        if (ic == null) return false

        ic.beginBatchEdit()
        try {
            if (isSelection) {
                ic.commitText(replacement, 1)
            } else {
                if (originalLength > 0) {
                    ic.deleteSurroundingText(originalLength, 0)
                }
                ic.commitText(replacement, 1)
            }
            return true
        } finally {
            ic.endBatchEdit()
        }
    }

    /**
     * Performs standard editor action or sends enter key.
     */
    fun handleActionOrEnter(ic: InputConnection?, editorInfo: EditorInfo?): Boolean {
        if (ic == null) return false

        val imeOptions = editorInfo?.imeOptions ?: 0
        val action = imeOptions and EditorInfo.IME_MASK_ACTION

        if (action != EditorInfo.IME_ACTION_NONE && action != EditorInfo.IME_ACTION_UNSPECIFIED) {
            return ic.performEditorAction(action)
        }

        // Fallback: send enter newline or key event
        val isMultiLine = (editorInfo?.inputType ?: 0) and EditorInfo.TYPE_TEXT_FLAG_MULTI_LINE != 0
        return if (isMultiLine) {
            ic.commitText("\n", 1)
        } else {
            ic.sendKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ENTER)) &&
                    ic.sendKeyEvent(KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_ENTER))
        }
    }
}
