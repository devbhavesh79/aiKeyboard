-- ============================================================
-- LangFlow AI Keyboard - Production PostgreSQL Database Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 2. Devices (pairing mobile Android/iOS, Windows IME, macOS)
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    platform VARCHAR(50) NOT NULL, -- 'android', 'ios', 'windows', 'macos'
    client_version VARCHAR(50) NOT NULL,
    push_token TEXT,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    default_source_lang VARCHAR(20) DEFAULT 'hinglish',
    default_target_lang VARCHAR(20) DEFAULT 'en',
    default_tone VARCHAR(50) DEFAULT 'professional',
    default_reply_length VARCHAR(20) DEFAULT 'short',
    private_mode BOOLEAN DEFAULT FALSE,
    haptic_feedback BOOLEAN DEFAULT TRUE,
    key_sound BOOLEAN DEFAULT FALSE,
    theme VARCHAR(50) DEFAULT 'system',
    keyboard_height VARCHAR(20) DEFAULT 'normal',
    number_row BOOLEAN DEFAULT TRUE,
    suggestion_row BOOLEAN DEFAULT TRUE,
    learn_writing_style_opt_in BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Languages Catalog
CREATE TABLE IF NOT EXISTS languages (
    code VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100) NOT NULL,
    supports_transliteration BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);

-- 5. User Configured Languages
CREATE TABLE IF NOT EXISTS user_languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    language_code VARCHAR(20) REFERENCES languages(code),
    order_index INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, language_code)
);

-- 6. User Dictionary (Section 12 - personal names, terms, brand names)
CREATE TABLE IF NOT EXISTS user_dictionary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    term VARCHAR(255) NOT NULL,
    category VARCHAR(50) DEFAULT 'name', -- 'name', 'company', 'product', 'technical', 'nickname'
    action VARCHAR(50) DEFAULT 'never_translate', -- 'never_translate', 'preferred_replacement'
    preferred_replacement VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. User Glossary (Section 13 - consistent terminology mapping)
CREATE TABLE IF NOT EXISTS user_glossary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    source_term VARCHAR(255) NOT NULL,
    target_term VARCHAR(255) NOT NULL,
    case_sensitive BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Refresh Tokens & Session Management (Section 39)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Subscriptions (Section 77)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_tier VARCHAR(50) DEFAULT 'free', -- 'free', 'pro', 'business'
    status VARCHAR(50) DEFAULT 'active',
    daily_ai_token_quota INT DEFAULT 50000,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Usage Records & Billing Metadata (Section 76)
CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    feature VARCHAR(50) NOT NULL,
    tokens_consumed INT DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. AI Requests Metadata (Strictly NO raw message content)
CREATE TABLE IF NOT EXISTS ai_requests_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    feature VARCHAR(50) NOT NULL, -- 'translate', 'reply', 'rewrite', 'grammar'
    provider VARCHAR(50) NOT NULL, -- 'gemini'
    model_version VARCHAR(100) NOT NULL,
    input_char_count INT NOT NULL,
    output_char_count INT NOT NULL,
    latency_ms INT NOT NULL,
    status_code INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Translation Metadata
CREATE TABLE IF NOT EXISTS translation_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    source_language VARCHAR(20) NOT NULL,
    target_language VARCHAR(20) NOT NULL,
    confidence NUMERIC(4, 3),
    glossary_applied_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Prompt Versions (Section 104)
CREATE TABLE IF NOT EXISTS prompt_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL,
    system_instruction TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Feedback (Section 140 - thumbs up/down, NO private message data)
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    feature VARCHAR(50) NOT NULL,
    rating VARCHAR(20) NOT NULL, -- 'positive', 'negative'
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Feature Flags (Section 103)
CREATE TABLE IF NOT EXISTS feature_flags (
    key VARCHAR(100) PRIMARY KEY,
    enabled BOOLEAN DEFAULT TRUE,
    description TEXT,
    rollout_percentage INT DEFAULT 100,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Audit Logs (Section 82)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    ip_hash VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Languages
INSERT INTO languages (code, name, native_name, supports_transliteration) VALUES
('en', 'English', 'English', FALSE),
('hi', 'Hindi', 'हिन्दी', TRUE),
('gu', 'Gujarati', 'ગુજરાતી', TRUE),
('hinglish', 'Hinglish', 'Hinglish', TRUE),
('es', 'Spanish', 'Español', FALSE),
('fr', 'French', 'Français', FALSE),
('de', 'German', 'Deutsch', FALSE),
('ja', 'Japanese', '日本語', FALSE),
('ar', 'Arabic', 'العربية', FALSE)
ON CONFLICT (code) DO NOTHING;
