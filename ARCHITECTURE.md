# LangFlow AI Keyboard - Architecture & Technical Design

## 1. Executive Overview
LangFlow AI Keyboard is a true system-level communication keyboard platform built across mobile and desktop environments:
- **Android**: Real `InputMethodService` utilizing `InputConnection` and `EditorInfo`.
- **iOS**: Custom Keyboard Extension (`UIInputViewController`, `UITextDocumentProxy`).
- **Windows**: Native Text Services Framework (TSF) COM-based IME.
- **macOS**: Native Input Method Kit (`IMKInputController`).
- **Backend**: High-performance Node.js/TypeScript Express server with Google Gemini 3.8 Flash, sliding window rate-limiting, and privacy-safe observability.

## 2. Core Operational Principles
1. **Local-First Typing**: Normal alphabetic, numeric, and symbol typing is processed 100% locally on the device with zero network latency.
2. **Explicit AI Activation**: No keystroke is ever sent remotely in the background. AI operations (Translate, Reply, Rewrite, Grammar, Transliterate, Summarize, Explain) occur only when the user explicitly triggers an action from the keyboard toolbar.
3. **EditorInfo Security Isolation**: Password, PIN, and sensitive text input fields automatically disable all AI toolbar features.
4. **User-Controlled Commit & Send**: The keyboard inserts or replaces draft text into the active host application (e.g. WhatsApp, Telegram, Gmail, Slack). The user always reviews and manually taps the host app's Send button. The keyboard **never** auto-sends messages.
5. **Entity Protection & Glossary**: Personal names ("Bhavesh", "Aarav"), brand names ("LangFlow"), currencies (₹5000), dates, and custom glossary mappings ("ticket" -> "support ticket") are strictly preserved.

## 3. Data Flow Diagram
```
[ Host Application (WhatsApp, Telegram, Slack, Gmail) ]
                      ▲  │
       InputConnection│  │ User types or pastes context
                      │  ▼
[ LangFlow IME / Custom Keyboard Extension / Windows TSF ]
   │
   ├─ Normal typing ──> 100% Local buffer & layout rendering
   │
   └─ User taps AI action (e.g. [⚡ Translate] / [💬 Reply])
         │
         ▼ (Encrypted HTTPS)
[ LangFlow Secure Backend & AI Gateway ]
   ├─ Sliding Window Rate Limiter
   ├─ Entity Protection Pre-processor (User Dictionary)
   ├─ Gemini 3.8 Flash Provider Adapter
   ├─ Response Validator & Factual Safety Guard
   ├─ Glossary Post-processor
   └─ Privacy-Safe Telemetry (NO raw messages stored)
         │
         ▼
[ Client Review Card: "Use Translation" / "Keep Original" ]
         │
         ▼ (User taps "Use Translation")
[ InputConnection.commitText() into Host Application Field ]
         │
         ▼
[ User reviews & manually taps Send ]
```
