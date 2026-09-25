package com.langflow.keyboard.manager

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context

/**
 * ClipboardManager
 *
 * Provides safe, user-initiated clipboard access:
 * - Only inspects clipboard on explicit user tap on "Translate Clipboard" or "Reply to Copied" actions.
 * - Never passively scrapes or polls clipboard in the background.
 */
class ClipboardManager(private val context: Context) {

    private val clipboard: ClipboardManager? =
        context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager

    /**
     * Reads the primary text from clipboard if present.
     */
    fun getPrimaryClipText(): String? {
        val clip = clipboard?.primaryClip ?: return null
        if (clip.itemCount > 0) {
            val text = clip.getItemAt(0).text
            if (!text.isNullOrBlank()) {
                return text.toString().trim()
            }
        }
        return null
    }

    /**
     * Copies the given text to the system clipboard.
     */
    fun copyText(text: String, label: String = "LangFlow") {
        if (text.isEmpty()) return
        val clip = ClipData.newPlainText(label, text)
        clipboard?.setPrimaryClip(clip)
    }
}
