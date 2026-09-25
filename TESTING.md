# LangFlow Testing Strategy & Quality Gates

## Test Structure
- **Unit Tests**:
  - `tests/unit/dictionary-glossary.test.ts`: Validates entity tokenization, restoration ("Bhavesh"), and glossary term transformation ("ticket" -> "support ticket").
  - `tests/unit/inputconnection.test.ts`: Tests simulated Android `InputConnection` and iOS proxy text replacement, cursor management, and undo stack.
  - `tests/unit/privacy-security.test.ts`: Tests password field isolation, sliding-window rate limiting, and zero-raw-message telemetry guarantees.
- **Evaluation Benchmarks**:
  - `tests/evaluation/ai-quality-benchmark.test.ts`: Runs regression benchmarks across Hinglish, Hindi, Gujarati, English, checking factual safety on unknown calendar requests and polite tone rewriters.
- **Automated Runner**:
  - `npm test` executes the complete test harness.

## Running Tests
```bash
npm test
```
All 4 test suites must pass before any release build or tag is cut.
