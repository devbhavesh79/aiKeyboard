# LangFlow Windows Implementation & TSF IME Architecture

## Architecture Overview
LangFlow on Windows is engineered as a true native system-level input method using the **Windows Text Services Framework (TSF)** COM architecture.

### Why TSF instead of Global Keyloggers?
Many demo applications use floating Electron windows and global keyboard hooks (`SetWindowsHookEx`) with simulated keystrokes (`SendInput`). This is deeply flawed and dangerous:
1. Vulnerable to anticheat/security flag triggers.
2. Unreliable caret positioning across mixed Win32, WPF, UWP, and Chromium apps.
3. Severe security risks with untrusted background key surveillance.

LangFlow avoids keylogging completely. It registers as an in-process COM server implementing:
- `ITfTextInputProcessorEx`
- `ITfThreadMgrEventSink`
- `ITfKeyEventSink`
- `ITfCompositionSink`

### System Text Insertion
When an AI action (Translate, Reply, Rewrite) is confirmed:
1. LangFlow initiates a TSF edit session via `ITfContext::RequestEditSession`.
2. Within the edit session lock, `ITfRange` accesses the current selection.
3. `ITfRange::SetText` inserts the transformed text directly into the host application's document context.
4. The host application handles rendering natively.
5. The user manually presses Enter/Send.
