import { UserDictionaryEntry, GlossaryEntry } from '../../shared/types';
import { dbService } from './db.service';

export class DictionaryService {
  getDictionary(userId: string = 'default'): UserDictionaryEntry[] {
    return dbService.getDictionary(userId);
  }

  addDictionaryEntry(userId: string = 'default', entry: Omit<UserDictionaryEntry, 'id'>): UserDictionaryEntry {
    return dbService.addDictionaryEntry(userId, entry);
  }

  deleteDictionaryEntry(userId: string = 'default', id: string): boolean {
    return dbService.deleteDictionaryEntry(userId, id);
  }

  getGlossary(userId: string = 'default'): GlossaryEntry[] {
    return dbService.getGlossary(userId);
  }

  addGlossaryEntry(userId: string = 'default', entry: Omit<GlossaryEntry, 'id'>): GlossaryEntry {
    return dbService.addGlossaryEntry(userId, entry);
  }

  deleteGlossaryEntry(userId: string = 'default', id: string): boolean {
    return dbService.deleteGlossaryEntry(userId, id);
  }

  /**
   * Pre-processes text to protect dictionary words with non-translatable placeholders
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
