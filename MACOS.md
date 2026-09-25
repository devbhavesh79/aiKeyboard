# LangFlow macOS Implementation & Architecture

## Architecture Overview
LangFlow on macOS uses Apple's **Input Method Kit (IMK)** framework:
- Principal class: `LangFlowInputController` subclassing `IMKInputController`.
- Bundle type: Input Method (`.app` in `/Library/Input Methods` or `~/Library/Input Methods`).
- Protocol: `IMKServerInput` and client protocol `IMKTextInput`.

### Safe Text Interaction
- Does not inject synthetic events using `CGEventPost`.
- Calls `client.insertText(transformed, replacementRange: range)` on the active text responder.
- Sandboxing & Security: Runs as an unprivileged input method with network entitlements for HTTPS AI queries only on explicit user invocation.
