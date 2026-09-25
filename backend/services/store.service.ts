import { LanguageInfo, UserPreferences } from '../../shared/types';

export class StoreService {
  private supportedLanguages: LanguageInfo[] = [
    { code: 'auto', name: 'Auto Detect', nativeName: 'Detect Automatically' },
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', supportsTransliteration: true },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', supportsTransliteration: true },
    { code: 'hinglish', name: 'Hinglish (Hindi in Latin)', nativeName: 'Hinglish', supportsTransliteration: true },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' }
  ];

  private userPreferences: Map<string, UserPreferences> = new Map();
  private feedbackList: Array<{ id: string; timestamp: string; feature: string; rating: string; reason?: string }> = [];
  private featureFlags: Record<string, boolean> = {
    AI_REPLY: true,
    TRANSLATION: true,
    GRAMMAR: true,
    REWRITE: true,
    PRIVATE_MODE: true,
    TRANSLITERATION: true,
    SUMMARIZE: true,
    EXPLAIN: true,
    GLOSSARY: true,
    EXPERIMENTAL_FAST_ROUTING: true
  };

  constructor() {
    this.userPreferences.set('default', {
      defaultSourceLanguage: 'hinglish',
      defaultTargetLanguage: 'en',
      defaultTone: 'natural' as any,
      defaultReplyLength: 'short',
      privateMode: false,
      hapticFeedback: true,
      keySound: false,
      theme: 'system',
      keyboardHeight: 'normal',
      numberRow: true,
      suggestionRow: true,
      learnWritingStyleOptIn: false
    });
  }

  getLanguages(): LanguageInfo[] {
    return this.supportedLanguages;
  }

  getPreferences(userId: string = 'default'): UserPreferences {
    return this.userPreferences.get(userId) || this.userPreferences.get('default')!;
  }

  updatePreferences(userId: string = 'default', updates: Partial<UserPreferences>): UserPreferences {
    const current = this.getPreferences(userId);
    const updated = { ...current, ...updates };
    this.userPreferences.set(userId, updated);
    return updated;
  }

  getFeatureFlags(): Record<string, boolean> {
    return this.featureFlags;
  }

  recordFeedback(feedback: { feature: string; rating: string; reason?: string }) {
    this.feedbackList.push({
      id: `fb-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...feedback
    });
  }

  getFeedbackCount(): number {
    return this.feedbackList.length;
  }
}

export const storeService = new StoreService();
