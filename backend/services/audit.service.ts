/**
 * Audit & Privacy-Safe Observability Service
 * Strict privacy enforcement: NO raw user message content is ever stored or logged.
 */

export interface TelemetryLog {
  id: string;
  timestamp: string;
  feature: 'translate' | 'reply' | 'rewrite' | 'grammar' | 'transliterate' | 'detect' | 'summarize' | 'explain';
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
  private logs: TelemetryLog[] = [];
  private maxLogs: number = 200;

  record(entry: Omit<TelemetryLog, 'id' | 'timestamp'>) {
    const log: TelemetryLog = {
      ...entry,
      id: `tel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };

    this.logs.unshift(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Privacy verification: confirm log does not contain raw message text
    // console output only contains metrics
    console.log(
      `[Telemetry] Feature: ${log.feature} | Latency: ${log.latencyMs}ms | Success: ${log.success} | Status: ${log.statusCode}`
    );
  }

  getRecentLogs(limit: number = 50): TelemetryLog[] {
    return this.logs.slice(0, limit);
  }

  getMetricsSummary() {
    const total = this.logs.length;
    if (total === 0) {
      return {
        totalRequests: 0,
        successRate: 100,
        averageLatencyMs: 0,
        totalTokens: 0
      };
    }

    const successes = this.logs.filter(l => l.success).length;
    const totalLatency = this.logs.reduce((acc, curr) => acc + curr.latencyMs, 0);
    const totalTokens = this.logs.reduce((acc, curr) => acc + curr.estimatedTokens, 0);

    return {
      totalRequests: total,
      successRate: Math.round((successes / total) * 100),
      averageLatencyMs: Math.round(totalLatency / total),
      totalTokens
    };
  }

  clearLogs() {
    this.logs = [];
  }
}

export const auditService = new AuditService();
