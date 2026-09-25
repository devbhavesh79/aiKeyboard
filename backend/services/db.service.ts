import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  UserPreferences,
  LanguageInfo,
  UserDictionaryEntry,
  GlossaryEntry,
  ChatConversation,
  ChatMessage,
  SupportedLanguage,
  ToneStyle
} from '../../shared/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DbService {
  private db: DatabaseSync;

  constructor() {
    const dbDir = path.resolve(__dirname, '../../database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, 'langflow.db');
    this.db = new DatabaseSync(dbPath);

    this.initDatabase();
  }

  private initDatabase() {
    // Enable WAL mode & foreign keys
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');

    // 1. Users
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        full_name TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Ensure default user exists
    this.db.exec(`
      INSERT OR IGNORE INTO users (id, email, full_name)
      VALUES ('default', 'user@langflow.ai', 'Standard User');
    `);

    // 2. User Preferences
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        default_source_lang TEXT DEFAULT 'hinglish',
        default_target_lang TEXT DEFAULT 'en',
        default_tone TEXT DEFAULT 'natural',
        default_reply_length TEXT DEFAULT 'short',
        private_mode INTEGER DEFAULT 0,
        haptic_feedback INTEGER DEFAULT 1,
        key_sound INTEGER DEFAULT 0,
        theme TEXT DEFAULT 'system',
        keyboard_height TEXT DEFAULT 'normal',
        number_row INTEGER DEFAULT 1,
        suggestion_row INTEGER DEFAULT 1,
        learn_writing_style_opt_in INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Default preferences row
    this.db.exec(`
      INSERT OR IGNORE INTO user_preferences (user_id)
      VALUES ('default');
    `);

    // 3. Languages Catalog
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS languages (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        native_name TEXT NOT NULL,
        supports_transliteration INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1
      );
    `);

    // Populate official language catalogue
    const seedLanguages = [
      ['auto', 'Auto Detect', 'Detect Automatically', 0],
      ['en', 'English', 'English (US)', 0],
      ['hi', 'Hindi', 'हिन्दी', 1],
      ['gu', 'Gujarati', 'ગુજરાતી', 1],
      ['mr', 'Marathi', 'मराठी', 1],
      ['hinglish', 'Hinglish (Hindi in Latin)', 'Hinglish', 1],
      ['es', 'Spanish', 'Español', 0],
      ['fr', 'French', 'Français', 0],
      ['de', 'German', 'Deutsch', 0],
      ['ja', 'Japanese', '日本語', 0],
      ['ar', 'Arabic', 'العربية', 0]
    ];

    const langStmt = this.db.prepare(`
      INSERT OR IGNORE INTO languages (code, name, native_name, supports_transliteration)
      VALUES (?, ?, ?, ?)
    `);

    for (const lang of seedLanguages) {
      langStmt.run(lang[0] as string, lang[1] as string, lang[2] as string, lang[3] as number);
    }

    // 4. User Dictionary (Clean, no mock entries)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_dictionary (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        term TEXT NOT NULL,
        category TEXT DEFAULT 'name',
        action TEXT DEFAULT 'never_translate',
        preferred_replacement TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // 5. User Glossary (Clean, no mock entries)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_glossary (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        source_term TEXT NOT NULL,
        target_term TEXT NOT NULL,
        case_sensitive INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // 6. Chat Conversations
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        app_type TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // 7. Chat Messages
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        text TEXT NOT NULL,
        original_text TEXT,
        source_lang TEXT,
        target_lang TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
      );
    `);

    // 8. AI Requests Metadata (Telemetry & Audit)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ai_requests_metadata (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        feature TEXT NOT NULL,
        provider TEXT NOT NULL,
        model_version TEXT NOT NULL,
        input_char_count INTEGER NOT NULL,
        output_char_count INTEGER NOT NULL,
        estimated_tokens INTEGER NOT NULL,
        latency_ms INTEGER NOT NULL,
        status_code INTEGER NOT NULL,
        success INTEGER NOT NULL,
        error_code TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // 9. Usage Records
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS usage_records (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        feature TEXT NOT NULL,
        tokens_consumed INTEGER DEFAULT 0,
        recorded_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // 10. Feedback
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS feedback (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        feature TEXT NOT NULL,
        rating TEXT NOT NULL,
        reason TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // 11. Feature Flags
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS feature_flags (
        key TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 1,
        description TEXT
      );
    `);

    const flags = [
      ['AI_REPLY', 1, 'Enable AI context-aware reply generator'],
      ['TRANSLATION', 1, 'Enable real-time multilingual translation'],
      ['GRAMMAR', 1, 'Enable tone and grammar checking'],
      ['REWRITE', 1, 'Enable text rewrite and enhancement'],
      ['PRIVATE_MODE', 1, 'Enable zero-cloud-telemetry private mode'],
      ['TRANSLITERATION', 1, 'Enable phonetics / Hinglish transliteration'],
      ['SUMMARIZE', 1, 'Enable thread & text summarization'],
      ['EXPLAIN', 1, 'Enable contextual text explanation'],
      ['GLOSSARY', 1, 'Enable custom user glossary rules']
    ];

    const flagStmt = this.db.prepare(`
      INSERT OR IGNORE INTO feature_flags (key, enabled, description)
      VALUES (?, ?, ?)
    `);

    for (const flag of flags) {
      flagStmt.run(flag[0] as string, flag[1] as number, flag[2] as string);
    }
  }

  // --- PREFERENCES ---
  getPreferences(userId: string = 'default'): UserPreferences {
    const stmt = this.db.prepare('SELECT * FROM user_preferences WHERE user_id = ?');
    const row = stmt.get(userId) as any;

    if (!row) {
      return {
        defaultSourceLanguage: 'hinglish',
        defaultTargetLanguage: 'en',
        defaultTone: 'professional',
        defaultReplyLength: 'short',
        privateMode: false,
        hapticFeedback: true,
        keySound: false,
        theme: 'system',
        keyboardHeight: 'normal',
        numberRow: true,
        suggestionRow: true,
        learnWritingStyleOptIn: false
      };
    }

    return {
      defaultSourceLanguage: row.default_source_lang as SupportedLanguage,
      defaultTargetLanguage: row.default_target_lang as SupportedLanguage,
      defaultTone: row.default_tone as ToneStyle,
      defaultReplyLength: row.default_reply_length,
      privateMode: Boolean(row.private_mode),
      hapticFeedback: Boolean(row.haptic_feedback),
      keySound: Boolean(row.key_sound),
      theme: row.theme,
      keyboardHeight: row.keyboard_height,
      numberRow: Boolean(row.number_row),
      suggestionRow: Boolean(row.suggestion_row),
      learnWritingStyleOptIn: Boolean(row.learn_writing_style_opt_in)
    };
  }

  updatePreferences(userId: string = 'default', updates: Partial<UserPreferences>): UserPreferences {
    const current = this.getPreferences(userId);
    const updated = { ...current, ...updates };

    const stmt = this.db.prepare(`
      INSERT INTO user_preferences (
        user_id, default_source_lang, default_target_lang, default_tone,
        default_reply_length, private_mode, haptic_feedback, key_sound,
        theme, keyboard_height, number_row, suggestion_row, learn_writing_style_opt_in, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        default_source_lang = excluded.default_source_lang,
        default_target_lang = excluded.default_target_lang,
        default_tone = excluded.default_tone,
        default_reply_length = excluded.default_reply_length,
        private_mode = excluded.private_mode,
        haptic_feedback = excluded.haptic_feedback,
        key_sound = excluded.key_sound,
        theme = excluded.theme,
        keyboard_height = excluded.keyboard_height,
        number_row = excluded.number_row,
        suggestion_row = excluded.suggestion_row,
        learn_writing_style_opt_in = excluded.learn_writing_style_opt_in,
        updated_at = datetime('now')
    `);

    stmt.run(
      userId,
      updated.defaultSourceLanguage,
      updated.defaultTargetLanguage,
      updated.defaultTone,
      updated.defaultReplyLength,
      updated.privateMode ? 1 : 0,
      updated.hapticFeedback ? 1 : 0,
      updated.keySound ? 1 : 0,
      updated.theme,
      updated.keyboardHeight,
      updated.numberRow ? 1 : 0,
      updated.suggestionRow ? 1 : 0,
      updated.learnWritingStyleOptIn ? 1 : 0
    );

    return updated;
  }

  // --- LANGUAGES ---
  getLanguages(): LanguageInfo[] {
    const stmt = this.db.prepare('SELECT code, name, native_name, supports_transliteration FROM languages WHERE is_active = 1');
    const rows = stmt.all() as any[];
    return rows.map(r => ({
      code: r.code as SupportedLanguage,
      name: r.name,
      nativeName: r.native_name,
      supportsTransliteration: Boolean(r.supports_transliteration)
    }));
  }

  // --- USER DICTIONARY ---
  getDictionary(userId: string = 'default'): UserDictionaryEntry[] {
    const stmt = this.db.prepare('SELECT * FROM user_dictionary WHERE user_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(userId) as any[];
    return rows.map(r => ({
      id: r.id,
      term: r.term,
      category: r.category,
      action: r.action,
      preferredReplacement: r.preferred_replacement,
      notes: r.notes
    }));
  }

  addDictionaryEntry(userId: string = 'default', entry: Omit<UserDictionaryEntry, 'id'>): UserDictionaryEntry {
    const id = `dict-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const stmt = this.db.prepare(`
      INSERT INTO user_dictionary (id, user_id, term, category, action, preferred_replacement, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      userId,
      entry.term.trim(),
      entry.category || 'name',
      entry.action || 'never_translate',
      entry.preferredReplacement || null,
      entry.notes || null
    );

    return {
      id,
      term: entry.term.trim(),
      category: entry.category || 'name',
      action: entry.action || 'never_translate',
      preferredReplacement: entry.preferredReplacement,
      notes: entry.notes
    };
  }

  deleteDictionaryEntry(userId: string = 'default', id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM user_dictionary WHERE id = ? AND user_id = ?');
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }

  // --- USER GLOSSARY ---
  getGlossary(userId: string = 'default'): GlossaryEntry[] {
    const stmt = this.db.prepare('SELECT * FROM user_glossary WHERE user_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(userId) as any[];
    return rows.map(r => ({
      id: r.id,
      sourceTerm: r.source_term,
      targetTerm: r.target_term,
      caseSensitive: Boolean(r.case_sensitive)
    }));
  }

  addGlossaryEntry(userId: string = 'default', entry: Omit<GlossaryEntry, 'id'>): GlossaryEntry {
    const id = `gloss-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const stmt = this.db.prepare(`
      INSERT INTO user_glossary (id, user_id, source_term, target_term, case_sensitive)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      userId,
      entry.sourceTerm.trim(),
      entry.targetTerm.trim(),
      entry.caseSensitive ? 1 : 0
    );

    return {
      id,
      sourceTerm: entry.sourceTerm.trim(),
      targetTerm: entry.targetTerm.trim(),
      caseSensitive: entry.caseSensitive
    };
  }

  deleteGlossaryEntry(userId: string = 'default', id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM user_glossary WHERE id = ? AND user_id = ?');
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }

  // --- CHAT CONVERSATIONS & MESSAGES ---
  getConversations(userId: string = 'default'): ChatConversation[] {
    const stmt = this.db.prepare('SELECT * FROM chat_conversations WHERE user_id = ? ORDER BY updated_at DESC');
    const rows = stmt.all(userId) as any[];
    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      appType: r.app_type,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  getOrCreateConversation(userId: string = 'default', appType: string, title?: string): ChatConversation {
    const stmt = this.db.prepare('SELECT * FROM chat_conversations WHERE user_id = ? AND app_type = ? LIMIT 1');
    const row = stmt.get(userId, appType) as any;
    if (row) {
      return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        appType: row.app_type,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    }

    const id = `conv-${appType}-${Date.now()}`;
    const convTitle = title || `${appType.toUpperCase()} Conversation`;
    const insertStmt = this.db.prepare(`
      INSERT INTO chat_conversations (id, user_id, title, app_type)
      VALUES (?, ?, ?, ?)
    `);
    insertStmt.run(id, userId, convTitle, appType);

    return {
      id,
      userId,
      title: convTitle,
      appType: appType as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  getMessages(conversationId: string): ChatMessage[] {
    const stmt = this.db.prepare('SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC');
    const rows = stmt.all(conversationId) as any[];
    return rows.map(r => ({
      id: r.id,
      conversationId: r.conversation_id,
      sender: r.sender,
      text: r.text,
      originalText: r.original_text,
      sourceLang: r.source_lang,
      targetLang: r.target_lang,
      createdAt: r.created_at
    }));
  }

  addMessage(msg: {
    conversationId: string;
    sender: 'me' | 'other';
    text: string;
    originalText?: string;
    sourceLang?: string;
    targetLang?: string;
  }): ChatMessage {
    const id = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const stmt = this.db.prepare(`
      INSERT INTO chat_messages (id, conversation_id, sender, text, original_text, source_lang, target_lang)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      msg.conversationId,
      msg.sender,
      msg.text,
      msg.originalText || null,
      msg.sourceLang || null,
      msg.targetLang || null
    );

    // Update conversation timestamp
    this.db.prepare(`UPDATE chat_conversations SET updated_at = datetime('now') WHERE id = ?`).run(msg.conversationId);

    return {
      id,
      conversationId: msg.conversationId,
      sender: msg.sender,
      text: msg.text,
      originalText: msg.originalText,
      sourceLang: msg.sourceLang as any,
      targetLang: msg.targetLang as any,
      createdAt: new Date().toISOString()
    };
  }

  deleteConversation(conversationId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM chat_conversations WHERE id = ?');
    const result = stmt.run(conversationId);
    return result.changes > 0;
  }

  // --- TELEMETRY & AI AUDIT ---
  recordAiRequest(metadata: {
    userId?: string;
    feature: string;
    provider: string;
    model: string;
    inputCharCount: number;
    outputCharCount: number;
    estimatedTokens: number;
    latencyMs: number;
    statusCode: number;
    success: boolean;
    errorCode?: string;
  }) {
    const id = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const stmt = this.db.prepare(`
      INSERT INTO ai_requests_metadata (
        id, user_id, feature, provider, model_version,
        input_char_count, output_char_count, estimated_tokens,
        latency_ms, status_code, success, error_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      metadata.userId || 'default',
      metadata.feature,
      metadata.provider,
      metadata.model,
      metadata.inputCharCount,
      metadata.outputCharCount,
      metadata.estimatedTokens,
      metadata.latencyMs,
      metadata.statusCode,
      metadata.success ? 1 : 0,
      metadata.errorCode || null
    );

    // Also record usage tokens
    const usageStmt = this.db.prepare(`
      INSERT INTO usage_records (id, user_id, feature, tokens_consumed)
      VALUES (?, ?, ?, ?)
    `);
    usageStmt.run(
      `use-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      metadata.userId || 'default',
      metadata.feature,
      metadata.estimatedTokens
    );
  }

  getTelemetrySummary() {
    const totalRequestsRow = this.db.prepare('SELECT COUNT(*) as count FROM ai_requests_metadata').get() as any;
    const successRow = this.db.prepare('SELECT COUNT(*) as count FROM ai_requests_metadata WHERE success = 1').get() as any;
    const avgLatencyRow = this.db.prepare('SELECT AVG(latency_ms) as avg_latency FROM ai_requests_metadata').get() as any;
    const totalTokensRow = this.db.prepare('SELECT SUM(estimated_tokens) as total_tokens FROM ai_requests_metadata').get() as any;

    const totalRequests = totalRequestsRow?.count || 0;
    const successCount = successRow?.count || 0;
    const successRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 100;
    const avgLatency = Math.round(avgLatencyRow?.avg_latency || 0);
    const totalTokens = totalTokensRow?.total_tokens || 0;

    const byFeatureRows = this.db.prepare(`
      SELECT feature, COUNT(*) as count, AVG(latency_ms) as avg_latency, SUM(estimated_tokens) as tokens
      FROM ai_requests_metadata
      GROUP BY feature
    `).all() as any[];

    const recentLogs = this.db.prepare(`
      SELECT id, user_id, feature, provider, model_version, input_char_count, output_char_count, estimated_tokens, latency_ms, status_code, success, created_at
      FROM ai_requests_metadata
      ORDER BY created_at DESC
      LIMIT 30
    `).all() as any[];

    return {
      totalRequests,
      successRate: Number(successRate.toFixed(1)),
      avgLatencyMs: avgLatency,
      totalTokens,
      byFeature: byFeatureRows,
      recentLogs
    };
  }

  // --- FEEDBACK ---
  recordFeedback(userId: string = 'default', feedback: { feature: string; rating: string; reason?: string }) {
    const id = `fb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const stmt = this.db.prepare(`
      INSERT INTO feedback (id, user_id, feature, rating, reason)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, userId, feedback.feature, feedback.rating, feedback.reason || null);
  }

  // --- FEATURE FLAGS ---
  getFeatureFlags(): Record<string, boolean> {
    const rows = this.db.prepare('SELECT key, enabled FROM feature_flags').all() as any[];
    const result: Record<string, boolean> = {};
    for (const r of rows) {
      result[r.key] = Boolean(r.enabled);
    }
    return result;
  }

  // --- CLEAR / PURGE ALL DATA (As requested: "purane jitne bhi data he clear karo") ---
  clearAllData(userId: string = 'default') {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      this.db.exec('DELETE FROM chat_messages;');
      this.db.exec('DELETE FROM chat_conversations;');
      this.db.exec('DELETE FROM user_dictionary;');
      this.db.exec('DELETE FROM user_glossary;');
      this.db.exec('DELETE FROM ai_requests_metadata;');
      this.db.exec('DELETE FROM usage_records;');
      this.db.exec('DELETE FROM feedback;');
      // Reset preferences to clean default
      this.db.prepare(`
        UPDATE user_preferences SET
          default_source_lang = 'hinglish',
          default_target_lang = 'en',
          default_tone = 'natural',
          default_reply_length = 'short',
          private_mode = 0,
          updated_at = datetime('now')
        WHERE user_id = ?
      `).run(userId);
      this.db.exec('COMMIT;');
      return { success: true, message: 'All database records and history have been cleared successfully.' };
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }
}

export const dbService = new DbService();
