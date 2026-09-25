import { LanguageInfo, UserPreferences } from '../../shared/types';
import { dbService } from './db.service';

export class StoreService {
  getLanguages(): LanguageInfo[] {
    return dbService.getLanguages();
  }

  getPreferences(userId: string = 'default'): UserPreferences {
    return dbService.getPreferences(userId);
  }

  updatePreferences(userId: string = 'default', updates: Partial<UserPreferences>): UserPreferences {
    return dbService.updatePreferences(userId, updates);
  }

  getFeatureFlags(): Record<string, boolean> {
    return dbService.getFeatureFlags();
  }

  recordFeedback(feedback: { feature: string; rating: string; reason?: string }, userId: string = 'default') {
    dbService.recordFeedback(userId, feedback);
  }

  clearAllData(userId: string = 'default') {
    return dbService.clearAllData(userId);
  }
}

export const storeService = new StoreService();
