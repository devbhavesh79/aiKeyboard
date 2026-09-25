# LangFlow Release Management & Checklist

## Pre-Release Verification Checklist
1. **Security Audit**: Static review confirms zero AI provider keys or secrets are bundled inside Android APK, iOS IPA, or desktop binaries.
2. **Local Typing Reliability**: Keyboard functions smoothly with internet completely disconnected.
3. **EditorInfo Isolation**: Password/PIN fields tested; verified that no network traffic occurs.
4. **Primary Acceptance Flow**:
   - Type Hinglish: *"main kal thoda late aaunga traffic bahut hai"*
   - Translate to English: *"I'll be a little late tomorrow because of traffic."*
   - Tap "Use Translation"
   - Text inserts cleanly into host field
   - User manually taps Send.
5. **Factual Safety Check**: Incoming message *"Are you available tomorrow at 5 PM?"* produces neutral responses without assuming availability.
6. **Undo System**: Verified that undo restores original draft accurately.
7. **Automated Tests**: `npm test` runs with 100% passing suites.
