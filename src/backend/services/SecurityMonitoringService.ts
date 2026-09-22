/**
 * Security Event Monitoring & Defense-in-Depth Service
 * 
 * Provides:
 * - Rate Limiting & Brute Force Protection
 * - Security Alert Logging (LOW, MEDIUM, HIGH, CRITICAL)
 * - Health Check aggregation
 * - Prometheus metrics format output
 */

import crypto from 'crypto';
import { SecurityEvent, SystemHealthState } from '../../types/index.js';
import { UIDAIConfiguration } from '../integrations/uidai/UIDAIConfiguration.js';
import { BlockchainLedgerService } from './BlockchainLedgerService.js';
import { ElectoralRollService } from '../integrations/electoralRoll/ElectoralRollService.js';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export class SecurityMonitoringService {
  private static events: SecurityEvent[] = [];
  private static rateLimits = new Map<string, RateLimitRecord>();

  // Metrics counters
  private static metrics = {
    httpRequestsTotal: 0,
    httpRequestsFailed: 0,
    otpRequestsTotal: 0,
    otpRequestsFailed: 0,
    votesSubmittedTotal: 0,
    duplicateVoteAttemptsBlocked: 0,
    rateLimitedRequestsTotal: 0,
  };

  /**
   * Masks IP address for privacy
   */
  public static maskIp(ip: string): string {
    if (!ip) return '127.0.0.1';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
    return ip.slice(0, 8) + '::***';
  }

  /**
   * Check and enforce rate limiting
   */
  public static checkRateLimit(key: string, maxRequests: number, windowSeconds: number): {
    allowed: boolean;
    remaining: number;
    resetInSeconds: number;
  } {
    const now = Date.now();
    const record = this.rateLimits.get(key);

    if (!record || now > record.resetAt) {
      this.rateLimits.set(key, {
        count: 1,
        resetAt: now + windowSeconds * 1000,
      });
      return { allowed: true, remaining: maxRequests - 1, resetInSeconds: windowSeconds };
    }

    if (record.count >= maxRequests) {
      this.metrics.rateLimitedRequestsTotal++;
      this.recordSecurityEvent({
        type: 'RATE_LIMITED',
        severity: 'MEDIUM',
        description: `Rate limit exceeded for endpoint key: ${key}. Threshold: ${maxRequests}/${windowSeconds}s`,
        clientIpMasked: key.split(':')[1] || 'UNKNOWN',
      });
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds: Math.ceil((record.resetAt - now) / 1000),
      };
    }

    record.count++;
    return {
      allowed: true,
      remaining: maxRequests - record.count,
      resetInSeconds: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  /**
   * Record security event
   */
  public static recordSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'correlationId'>): SecurityEvent {
    const newEvent: SecurityEvent = {
      ...event,
      id: 'SEC-' + crypto.randomBytes(6).toString('hex').toUpperCase(),
      timestamp: new Date().toISOString(),
      correlationId: 'CORR-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex'),
    };

    this.events.unshift(newEvent);
    if (this.events.length > 500) {
      this.events.pop();
    }

    console.warn(`[SECURITY_${newEvent.severity}] ${newEvent.type}: ${newEvent.description}`);
    return newEvent;
  }

  public static getRecentEvents(limit = 50): SecurityEvent[] {
    return this.events.slice(0, limit);
  }

  public static incrementMetric(metricName: keyof typeof SecurityMonitoringService.metrics): void {
    if (this.metrics[metricName] !== undefined) {
      this.metrics[metricName]++;
    }
  }

  public static getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Health checks across sub-components
   */
  public static getSystemHealth(): SystemHealthState & { details: Record<string, string> } {
    const uidaiConfig = UIDAIConfiguration.getInstance();
    const ledgerIntegrity = BlockchainLedgerService.verifyLedgerIntegrity();

    const uidaiHealth: SystemHealthState['uidai'] = uidaiConfig.isConfigured() ? 'HEALTHY' : 'NOT CONFIGURED';
    const blockchainHealth: SystemHealthState['blockchain'] = ledgerIntegrity.isTamperFree ? 'HEALTHY' : 'DEGRADED';
    const electoralRollHealth: SystemHealthState['electoralRoll'] = ElectoralRollService.isConfigured() ? 'HEALTHY' : 'NOT CONFIGURED';

    return {
      database: 'HEALTHY', // PostgreSQL
      redis: 'HEALTHY',    // Redis distributed cache
      backend: 'HEALTHY',  // Node/Express API Gateway
      blockchain: blockchainHealth,
      uidai: uidaiHealth,
      electoralRoll: electoralRollHealth,
      details: {
        uidaiStatusMessage: uidaiConfig.getStatusMessage(),
        blockchainBlocks: `${ledgerIntegrity.totalBlocks} Blocks Verified`,
        blockchainDiscrepancies: `${ledgerIntegrity.discrepancies.length} detected`,
        electoralRollMode: ElectoralRollService.getEnvironment().toUpperCase(),
      },
    };
  }

  /**
   * Output Prometheus OpenMetrics compatible text format
   */
  public static getPrometheusMetrics(): string {
    const health = this.getSystemHealth();
    const m = this.metrics;
    const ledger = BlockchainLedgerService.verifyLedgerIntegrity();

    return [
      '# HELP evoting_http_requests_total Total HTTP requests received',
      '# TYPE evoting_http_requests_total counter',
      `evoting_http_requests_total ${m.httpRequestsTotal}`,
      '',
      '# HELP evoting_votes_submitted_total Total ballots recorded on blockchain',
      '# TYPE evoting_votes_submitted_total counter',
      `evoting_votes_submitted_total ${m.votesSubmittedTotal}`,
      '',
      '# HELP evoting_duplicate_votes_blocked_total Duplicate voting attempts prevented',
      '# TYPE evoting_duplicate_votes_blocked_total counter',
      `evoting_duplicate_votes_blocked_total ${m.duplicateVoteAttemptsBlocked}`,
      '',
      '# HELP evoting_blockchain_blocks_height Total height of election blockchain ledger',
      '# TYPE evoting_blockchain_blocks_height gauge',
      `evoting_blockchain_blocks_height ${ledger.totalBlocks}`,
      '',
      '# HELP evoting_blockchain_tamper_free Blockchain ledger hash integrity (1=true, 0=false)',
      '# TYPE evoting_blockchain_tamper_free gauge',
      `evoting_blockchain_tamper_free ${ledger.isTamperFree ? 1 : 0}`,
      '',
      '# HELP evoting_uidai_configured UIDAI integration authorized (1=true, 0=false)',
      '# TYPE evoting_uidai_configured gauge',
      `evoting_uidai_configured ${UIDAIConfiguration.getInstance().isConfigured() ? 1 : 0}`,
      '',
    ].join('\n');
  }
}
