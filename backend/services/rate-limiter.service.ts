/**
 * Rate Limiter Service
 * Sliding window rate limiting protecting backend and AI gateway from abuse.
 */

interface RateLimitRecord {
  timestamps: number[];
}

export class RateLimiterService {
  private records: Map<string, RateLimitRecord> = new Map();
  private maxRequestsPerWindow: number = 60; // 60 requests
  private windowMs: number = 60 * 1000; // per minute

  checkLimit(identifier: string): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    let record = this.records.get(identifier);

    if (!record) {
      record = { timestamps: [] };
      this.records.set(identifier, record);
    }

    // Filter out expired timestamps
    record.timestamps = record.timestamps.filter(ts => now - ts < this.windowMs);

    if (record.timestamps.length >= this.maxRequestsPerWindow) {
      const oldest = record.timestamps[0];
      const resetMs = Math.max(0, this.windowMs - (now - oldest));
      return {
        allowed: false,
        remaining: 0,
        resetMs
      };
    }

    record.timestamps.push(now);
    return {
      allowed: true,
      remaining: this.maxRequestsPerWindow - record.timestamps.length,
      resetMs: this.windowMs
    };
  }

  // Periodic cleanup of stale records
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      record.timestamps = record.timestamps.filter(ts => now - ts < this.windowMs);
      if (record.timestamps.length === 0) {
        this.records.delete(key);
      }
    }
  }
}

export const rateLimiterService = new RateLimiterService();
setInterval(() => rateLimiterService.cleanup(), 5 * 60 * 1000);
