/**
 * LangFlow AI Keyboard - Shared Core Types & Contracts
 * Production-grade cross-platform contracts
 */

export type SupportedLanguage = 
  | 'auto'
  | 'en'
  | 'hi'
  | 'gu'
  | 'mr'
  | 'hinglish'
  | 'es'
  | 'fr'
  | 'de'
  | 'ja'
  | 'ar';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  supportsTransliteration?: boolean;
}

export type ToneStyle = 
  | 'professional'
  | 'polite'
  | 'friendly'
  | 'casual'
  | 'formal'
  | 'concise'
  | 'warm'
  | 'apologetic'
  | 'customer_support'
  | 'business';

export type RewriteAction =
  | 'make_shorter'
  | 'make_longer'
  | 'make_clearer'
  | 'make_professional'
  | 'make_polite'
  | 'make_friendly'
  | 'make_formal'
  | 'simplify'
  | 'improve_grammar';

export type ReplyIntent =
  | 'accept'
  | 'decline'
  | 'clarify'
  | 'confirm'
  | 'apologize'
  | 'thank'
  | 'request_time'
  | 'request_info'
  | 'follow_up'
  | 'reschedule'
  | 'cancel'
  | 'acknowledge'
  | 'neutral';

export type InputFieldType = 
  | 'normal'
  | 'email'
  | 'url'
  | 'password'
  | 'pin'
  | 'phone'
  | 'number'
  | 'search'
  | 'multiline';

export interface EditorInfoContext {
  fieldType: InputFieldType;
  packageName?: string;
  isSecure: boolean;
  selectedText?: string;
  cursorPosition?: number;
  textBeforeCursor?: string;
  textAfterCursor?: string;
}

// User Dictionary Entry
export interface UserDictionaryEntry {
  id: string;
  term: string;
  category: 'name' | 'company' | 'product' | 'technical' | 'nickname' | 'slang';
  action: 'never_translate' | 'preferred_replacement' | 'keep_case';
  preferredReplacement?: string;
  notes?: string;
}

// Glossary Entry
export interface GlossaryEntry {
  id: string;
  sourceTerm: string;
  targetTerm: string;
  contextHint?: string;
  caseSensitive: boolean;
}

// API Payloads
export interface TranslateRequest {
  text: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  tone?: 'natural' | 'literal' | 'formal' | 'casual' | 'business';
  preserveEntities?: boolean;
  userId?: string;
}

export interface TranslateResponse {
  translatedText: string;
  detectedSourceLanguage: SupportedLanguage;
  confidence: number;
  alternatives?: string[];
  appliedGlossaryTerms?: string[];
}

export interface ReplyRequest {
  incomingMessage: string;
  draftMessage?: string;
  intent?: ReplyIntent;
  tone?: ToneStyle;
  length?: 'short' | 'medium' | 'detailed';
  targetLanguage?: SupportedLanguage;
  userId?: string;
}

export interface ReplySuggestion {
  id: string;
  text: string;
  tone: ToneStyle;
  lengthTag: 'short' | 'medium' | 'detailed';
  confidence: number;
}

export interface ReplyResponse {
  suggestions: ReplySuggestion[];
  analyzedIntent: ReplyIntent;
  detectedContextSummary?: string;
}

export interface RewriteRequest {
  text: string;
  action: RewriteAction;
  customInstruction?: string;
  targetLanguage?: SupportedLanguage;
  userId?: string;
}

export interface RewriteResponse {
  originalText: string;
  rewrittenText: string;
  alternatives?: string[];
  explanation?: string;
}

export interface GrammarRequest {
  text: string;
  language?: SupportedLanguage;
  userId?: string;
}

export interface GrammarCorrectionDetail {
  original: string;
  corrected: string;
  explanation: string;
  type: 'spelling' | 'punctuation' | 'grammar' | 'restructuring';
}

export interface GrammarResponse {
  originalText: string;
  correctedText: string;
  naturalPhrasing: string;
  corrections: GrammarCorrectionDetail[];
}

export interface TransliterateRequest {
  text: string;
  fromScript: 'latin';
  toLanguage: 'hi' | 'gu';
  userId?: string;
}

export interface TransliterateResponse {
  transliteratedText: string;
  alternatives: string[];
}

export interface DetectLanguageRequest {
  text: string;
}

export interface DetectLanguageResponse {
  detectedLanguage: SupportedLanguage;
  confidence: number;
  isAmbiguous: boolean;
  candidates: Array<{ language: SupportedLanguage; confidence: number }>;
}

export interface SummarizeRequest {
  text: string;
  mode: 'one_line' | 'short' | 'bullet_points' | 'detailed';
  targetLanguage?: SupportedLanguage;
}

export interface SummarizeResponse {
  summary: string;
  mode: string;
  keyPoints?: string[];
}

export interface ExplainRequest {
  text: string;
  style: 'simple' | 'professional' | 'hindi' | 'gujarati' | 'english';
}

export interface ExplainResponse {
  explanation: string;
  keyTerms?: Array<{ term: string; meaning: string }>;
}

export interface UserPreferences {
  defaultSourceLanguage: SupportedLanguage;
  defaultTargetLanguage: SupportedLanguage;
  defaultTone: ToneStyle;
  defaultReplyLength: 'short' | 'medium' | 'detailed';
  privateMode: boolean;
  hapticFeedback: boolean;
  keySound: boolean;
  theme: 'system' | 'dark' | 'light' | 'high_contrast';
  keyboardHeight: 'compact' | 'normal' | 'tall';
  numberRow: boolean;
  suggestionRow: boolean;
  learnWritingStyleOptIn: boolean;
}

export interface ChatConversation {
  id: string;
  userId: string;
  title: string;
  appType: 'whatsapp' | 'gmail' | 'slack' | 'sms' | 'custom';
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: 'me' | 'other';
  text: string;
  originalText?: string;
  sourceLang?: SupportedLanguage;
  targetLang?: SupportedLanguage;
  createdAt: string;
}

export interface FeedbackRequest {
  feature: 'translate' | 'reply' | 'rewrite' | 'grammar';
  rating: 'positive' | 'negative';
  reason?: string;
  requestId?: string;
  // NOTE: Privacy first: raw message text is NEVER included in feedback
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

