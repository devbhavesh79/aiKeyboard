# LangFlow AI Keyboard

> **A real, production-grade system communication keyboard platform** that brings real-time translation, AI reply assistance, tone rewriting, grammar restructuring, and multilingual communication directly into your natural typing workflow.

---

## Key Highlights
- **Normal Keyboard First**: 100% local, high-speed typing with QWERTY, numeric, symbol, and emoji layouts. Unaffected by network outages or cloud downtime.
- **Inside Any App**: Type naturally inside WhatsApp, Telegram, Gmail, Instagram, LinkedIn, Slack, Messages, Chrome, or any text field.
- **Smart AI Activation**: No background surveillance. AI operations execute ONLY upon explicit user taps.
- **Password & PIN Isolation**: Automatically detects secure credential fields and disables AI toolbar.
- **User Control Always**: The user always reviews the output before insertion, edits if needed, and manually taps the host app's Send button. **Never auto-sends messages.**
- **Privacy & Safety First**: Zero raw message logging. Prompt injection defenses. Factual safety enforcement (never hallucinates user availability or agreement).

---

## Directory Structure
```
├── android/            # Real Android InputMethodService clean architecture
├── ios/                # iOS Custom Keyboard Extension (UIInputViewController)
├── windows/            # Windows Text Services Framework (TSF) native IME
├── macos/              # macOS Input Method Kit (IMK) integration
├── backend/            # Express backend & Gemini 3.8 Flash AI Gateway
├── database/           # PostgreSQL migrations & schema
├── shared/             # Cross-platform types, DTOs & contracts
├── tests/              # Comprehensive test runner & evaluation benchmarks
├── docs/               # In-depth architectural & platform manuals
└── src/                # Interactive studio & keyboard sandbox simulator
```

## Running Locally
```bash
npm install
npm test
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to test the live interactive keyboard simulator and platform studio.
