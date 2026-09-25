# LangFlow AI Keyboard - Versioned API Specification

All endpoints return a standardized envelope:
```json
{
  "success": true,
  "data": { ... }
}
```
Or upon error:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable explanation"
  }
}
```

## Endpoints

### 1. Translation
- **`POST /api/v1/translate`**
  - **Payload**:
    ```json
    {
      "text": "main kal thoda late aaunga traffic bahut hai",
      "sourceLanguage": "hinglish",
      "targetLanguage": "en",
      "tone": "natural"
    }
    ```
  - **Response**:
    ```json
    {
      "success": true,
      "data": {
        "translatedText": "I'll be a little late tomorrow because of traffic.",
        "detectedSourceLanguage": "hinglish",
        "confidence": 0.96,
        "alternatives": ["I will be slightly late tomorrow due to traffic."],
        "appliedGlossaryTerms": []
      }
    }
    ```

### 2. Contextual Reply Assistant
- **`POST /api/v1/reply`**
  - **Payload**:
    ```json
    {
      "incomingMessage": "Are you available tomorrow at 5 PM?",
      "draftMessage": "",
      "tone": "professional"
    }
    ```
  - **Response**:
    ```json
    {
      "success": true,
      "data": {
        "suggestions": [
          { "id": "rep-1", "text": "Let me check and confirm.", "tone": "neutral", "lengthTag": "short" },
          { "id": "rep-2", "text": "I'll confirm my availability shortly.", "tone": "professional", "lengthTag": "medium" },
          { "id": "rep-3", "text": "Checking my calendar now, will update you soon.", "tone": "friendly", "lengthTag": "medium" }
        ],
        "analyzedIntent": "neutral"
      }
    }
    ```

### 3. Rewrite & Tone
- **`POST /api/v1/rewrite`**
  - **Payload**:
    ```json
    {
      "text": "send me this fast",
      "action": "make_polite"
    }
    ```
  - **Response**:
    ```json
    {
      "success": true,
      "data": {
        "originalText": "send me this fast",
        "rewrittenText": "Could you please send this to me at your earliest convenience?"
      }
    }
    ```

### 4. Grammar Engine
- **`POST /api/v1/grammar`**
  - **Payload**: `{ "text": "i will coming tomorrow" }`
  - **Response**:
    ```json
    {
      "success": true,
      "data": {
        "originalText": "i will coming tomorrow",
        "correctedText": "I will come tomorrow.",
        "naturalPhrasing": "I'll come tomorrow.",
        "corrections": [
          { "original": "will coming", "corrected": "will come", "type": "grammar", "explanation": "Modal auxiliary requires base form" }
        ]
      }
    }
    ```

### 5. Dictionary & Glossary
- **`GET /api/v1/dictionary`**: Returns user's protected terms ("never_translate").
- **`POST /api/v1/dictionary`**: Adds term to dictionary.
- **`GET /api/v1/glossary`**: Returns user's glossary mapping rules.
- **`POST /api/v1/glossary`**: Adds sourceTerm -> targetTerm mapping.

### 6. Health & Readiness
- **`GET /health`**: Health status and uptime.
- **`GET /ready`**: Gateway dependency readiness checks.
