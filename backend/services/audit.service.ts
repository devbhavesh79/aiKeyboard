import { dbService } from './db.service';

export interface AuditRecord {
  feature: string;
  userId?: string;
  sourceLang?: string;
  targetLang?: string;
  provider: string;
  model: string;
  latencyMs: number;
  inputCharCount: number;
  outputCharCount: number;
  estimatedTokens: number;
  statusCode: number;
  success: boolean;
  errorCode?: string;
}

export class AuditService {
  record(entry: AuditRecord) {
    dbService.recordAiRequest({
      userId: entry.userId,
      feature: entry.feature,
      provider: entry.provider,
      model: entry.model,
      inputCharCount: entry.inputCharCount,
      outputCharCount: entry.outputCharCount,
      estimatedTokens: entry.estimatedTokens,
      latencyMs: entry.latencyMs,
      statusCode: entry.statusCode,
      success: entry.success,
      errorCode: entry.errorCode
    });
  }

  getMetricsSummary() {
    return dbService.getTelemetrySummary();
  }

  getRecentLogs(_limit: number = 30) {
    const summary = dbService.getTelemetrySummary();
    return summary.recentLogs;
  }
}

export const auditService = new AuditService();
