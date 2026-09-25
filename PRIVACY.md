# LangFlow AI Keyboard - Privacy Model & Data Policy

## Core Privacy Commitments
1. **Local-First Typing**: Everything you type normally stays strictly on your device.
2. **Explicit Consent for Cloud Features**: Network calls only occur when you explicitly tap an AI feature (Translate, Reply, Rewrite, Grammar).
3. **Zero Raw Message Retention**: Our servers process AI requests in-memory and return the result. We do not store raw messages in our database or telemetry logs.
4. **No Hidden App Scraping**: LangFlow will never read your WhatsApp database, Telegram database, private app files, or device notifications without explicit user consent.
5. **Private Mode**: When enabled, turns off all local caching of recent suggestions and suppresses any optional local history.
6. **Account & Data Deletion**: Users have full control to export their personal dictionary/glossary and execute one-click account deletion.

## Telemetry Audit Specification
Our telemetry log stores only operational metadata:
- Timestamp
- Feature name (`translate`, `reply`, `rewrite`)
- Source & target language code
- Character count & token estimate
- Latency (ms)
- HTTP status code
- **NO user text is included in telemetry records.**
