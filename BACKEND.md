# LangFlow Backend & AI Gateway Architecture

## Overview
The LangFlow backend is a production-grade Node.js/TypeScript service utilizing Express, Google Gemini SDK (`@google/genai`), and in-memory/PostgreSQL datastores.

### Modules
1. **API Router**: Versioned endpoints under `/api/v1/*`.
2. **AI Provider Gateway**:
   - Primary: Google Gemini 3.8 Flash (`@google/genai`).
   - User-Agent header: `aistudio-build`.
   - Structured JSON response schemas with strict parameter typing.
   - Deterministic offline fallbacks for guaranteed keyboard reliability.
3. **Prompt Injection Shield**:
   - User text is wrapped in unambiguous XML content boundaries (`<user_text>`).
   - System instructions prohibit executing prompt instructions embedded within the message.
4. **Sliding Window Rate Limiter**:
   - Protects against denial-of-service and runaway client loops.
   - 60 requests per minute per IP/device identifier.
5. **Entity Protection & Glossary Engine**:
   - Tokenizes protected terms before AI transmission (e.g. `Bhavesh` -> `__PROTECTED_ENTITY_0__`).
   - Restores protected entities upon output reception.
   - Applies custom glossary mappings (e.g. `customer` -> `client`).
6. **Privacy-Safe Observability**:
   - Strictly records metadata only: feature, latency, token count, status code.
   - **Zero** raw message content is logged or persisted by default.
