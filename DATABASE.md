# LangFlow Database Architecture & Migrations

## Overview
LangFlow utilizes a relational schema optimized for privacy, high throughput, and zero retention of sensitive message content.

### Database Engine
- **Primary**: PostgreSQL 15+
- **Cache & Ephemeral Store**: Redis (for distributed sliding-window rate limiting)

### Tables
1. `users`: Account identification, email, password hash, created_at.
2. `devices`: Registered Android/iOS/Windows/macOS client devices and app versions.
3. `user_preferences`: Default language pairs, tone preference, theme, keyboard layout heights.
4. `languages`: Supported language catalog and transliteration capabilities.
5. `user_languages`: Active languages chosen by the user in the keyboard switcher.
6. `user_dictionary`: Protected words ("never_translate", personal names, company brands).
7. `user_glossary`: Terminology overrides ("ticket" -> "support ticket").
8. `refresh_tokens`: Secure rotated token sessions.
9. `subscriptions`: Plan tiers (Free, Pro, Business) and quota entitlements.
10. `usage_records`: Aggregate token consumption metadata.
11. `ai_requests_metadata`: Latency, status code, model version (NO raw messages).
12. `translation_metadata`: Source & target language pairs and confidence score.
13. `prompt_versions`: Dynamic prompt templates managed without requiring app updates.
14. `feedback`: Thumbs up/down quality scores.
15. `feature_flags`: Dynamic feature gating.
16. `audit_logs`: Administrative security access log.
