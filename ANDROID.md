# LangFlow Android Implementation & Architecture

## Architecture Overview
LangFlow on Android is built as a genuine Android Input Method Service (IME), strictly complying with Android InputMethod Framework (IMF) standards.

### Manifest Registration
```xml
<service
    android:name=".ime.LangFlowIME"
    android:label="@string/ime_name"
    android:permission="android.permission.BIND_INPUT_METHOD"
    android:exported="true">
    <intent-filter>
        <action android:name="android.view.InputMethod" />
    </intent-filter>
    <meta-data
        android:name="android.view.im"
        android:resource="@xml/method" />
</service>
```

### Lifecycle Implementation
- `onCreate()`: Initializes in-memory dictionary cache, haptic engines, and API client.
- `onStartInputView(info: EditorInfo, restarting: Boolean)`:
  - Inspects `EditorInfo.inputType`.
  - Determines if the current field is a password, PIN, or sensitive field:
    ```kotlin
    val isPassword = variation == InputType.TYPE_TEXT_VARIATION_PASSWORD ||
                     variation == InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD ||
                     variation == InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD
    ```
  - When `isPassword == true`, the AI Toolbar is locked and no remote actions are permitted.
- `onFinishInputView()`: Cancels any active network jobs to save battery and network bandwidth.
- `onDestroy()`: Tears down coroutine scopes and releases cached bitmap buffers.

### Text Insertion & Undo Mechanics
1. **Normal Typing**: Uses `ic.commitText(char, 1)` and `ic.deleteSurroundingText(1, 0)`.
2. **Context Retrieval**:
   - `ic.getSelectedText(0)` if user highlighted a specific segment.
   - `ic.getTextBeforeCursor(250, 0)` for sentence/draft context.
3. **Cursor-Aware Replacement**:
   - Wraps replacement inside `ic.beginBatchEdit()` and `ic.endBatchEdit()`.
   - Records replacement snapshot in `undoStack`.
   - Replaces selection or draft text with translated/rewritten text.
4. **Undo**: Pops previous snapshot and restores original characters.
