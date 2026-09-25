import { UserDictionaryEntry, GlossaryEntry } from '../../shared/types';

export class DictionaryService {
  private userDictionaries: Map<string, UserDictionaryEntry[]> = new Map();
  private userGlossaries: Map<string, GlossaryEntry[]> = new Map();

  constructor() {
    // Seed default common dictionary entries for demonstration/testing
    const defaultDict: UserDictionaryEntry[] = [
      {
        id: 'dict-1',
        term: 'Bhavesh',
        category: 'name',
        action: 'never_translate',
        notes: 'Personal name - keep intact'
      },
      {
        id: 'dict-2',
        term: 'AI KeyBoard',
        category: 'product',
        action: 'never_translate'
      },
      {
        id: 'dict-2-b',
        term: 'LangFlow',
        category: 'product',
        action: 'never_translate'
      },
      {
        id: 'dict-3',
        term: 'DevBhavesh',
        category: 'name',
        action: 'never_translate'
      }
    ];

    const defaultGlossary: GlossaryEntry[] = [
      {
        id: 'gloss-1',
        sourceTerm: 'ticket',
        targetTerm: 'support ticket',
        caseSensitive: false
      },
      {
        id: 'gloss-2',
        sourceTerm: 'customer',
        targetTerm: 'client',
        caseSensitive: false
      },
      {
        id: 'gloss-3',
        sourceTerm: 'deployment',
        targetTerm: 'release',
        caseSensitive: false
      }
    ];

    this.userDictionaries.set('default', defaultDict);
    this.userGlossaries.set('default', defaultGlossary);
  }

  getDictionary(userId: string = 'default'): UserDictionaryEntry[] {
    return this.userDictionaries.get(userId) || this.userDictionaries.get('default') || [];
  }

  addDictionaryEntry(userId: string = 'default', entry: Omit<UserDictionaryEntry, 'id'>): UserDictionaryEntry {
    const list = this.getDictionary(userId);
    const newEntry: UserDictionaryEntry = {
      ...entry,
      id: `dict-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    };
    list.push(newEntry);
    this.userDictionaries.set(userId, list);
    return newEntry;
  }

  deleteDictionaryEntry(userId: string = 'default', id: string): boolean {
    const list = this.getDictionary(userId);
    const updated = list.filter(e => e.id !== id);
    this.userDictionaries.set(userId, updated);
    return updated.length < list.length;
  }

  getGlossary(userId: string = 'default'): GlossaryEntry[] {
    return this.userGlossaries.get(userId) || this.userGlossaries.get('default') || [];
  }

  addGlossaryEntry(userId: string = 'default', entry: Omit<GlossaryEntry, 'id'>): GlossaryEntry {
    const list = this.getGlossary(userId);
    const newEntry: GlossaryEntry = {
      ...entry,
      id: `gloss-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    };
    list.push(newEntry);
    this.userGlossaries.set(userId, list);
    return newEntry;
  }

  deleteGlossaryEntry(userId: string = 'default', id: string): boolean {
    const list = this.getGlossary(userId);
    const updated = list.filter(e => e.id !== id);
    this.userGlossaries.set(userId, updated);
    return updated.length < list.length;
  }

  /**
   * Pre-processes text to protect protected dictionary words with non-translatable placeholders
   */
  protectEntities(text: string, userId: string = 'default'): { protectedText: string; tokens: Map<string, string> } {
    const dict = this.getDictionary(userId);
    const tokens = new Map<string, string>();
    let processed = text;

    dict.forEach((entry, idx) => {
      if (entry.action === 'never_translate') {
        const regex = new RegExp(`\\b${escapeRegExp(entry.term)}\\b`, 'gi');
        if (regex.test(processed)) {
          const placeholder = `__PROTECTED_ENTITY_${idx}__`;
          tokens.set(placeholder, entry.term);
          processed = processed.replace(regex, placeholder);
        }
      }
    });

    return { protectedText: processed, tokens };
  }

  /**
   * Restores protected placeholders back to original protected terms
   */
  restoreEntities(text: string, tokens: Map<string, string>): string {
    let result = text;
    tokens.forEach((originalTerm, placeholder) => {
      result = result.split(placeholder).join(originalTerm);
    });
    return result;
  }

  /**
   * Applies user glossary transformations to the translated text
   */
  applyGlossary(text: string, userId: string = 'default'): { text: string; applied: string[] } {
    const glossary = this.getGlossary(userId);
    let result = text;
    const applied: string[] = [];

    glossary.forEach(g => {
      const flags = g.caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(`\\b${escapeRegExp(g.sourceTerm)}\\b`, flags);
      if (regex.test(result)) {
        result = result.replace(regex, g.targetTerm);
        applied.push(`${g.sourceTerm} → ${g.targetTerm}`);
      }
    });

    return { text: result, applied };
  }
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const dictionaryService = new DictionaryService();
