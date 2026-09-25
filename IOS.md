# LangFlow iOS Implementation & Architecture

## Architecture Overview
LangFlow on iOS is implemented as a native Custom Keyboard Extension using `UIInputViewController` and Apple's `UITextDocumentProxy` API.

### App Group & Sandbox Constraints
- Extensions run in a strict separate sandbox from the host app and companion container.
- Shared user preferences and personal dictionary entries are synchronized via an App Group container (`group.com.langflow.keyboard`).

### Full Access & Network Disclosures (Section 64)
- **Without Full Access**:
  - The keyboard operates strictly offline.
  - Normal typing, autocapitalization, delete, and standard layout switching work completely locally.
- **With Full Access**:
  - Enables HTTPS network requests to the LangFlow AI Gateway for Translation, AI Reply, and Rewriting.
  - Required transparency notice in settings: "Full Access is solely used to query the LangFlow AI Gateway when you explicitly tap an AI toolbar button. Normal keystrokes are never logged or transmitted."

### Secure Field Behavior
- When `textDocumentProxy.isSecureTextEntry == true`, iOS automatically disables third-party keyboard extensions unless approved, and LangFlow automatically disables all AI toolbar controls to prevent any accidental exposure of passwords or credentials.

### Globe Key & Switching (Section 65)
- Standard Apple Globe key (`🌐`) integration via `needsInputModeSwitchKey` and `advanceToNextInputMode()`.
