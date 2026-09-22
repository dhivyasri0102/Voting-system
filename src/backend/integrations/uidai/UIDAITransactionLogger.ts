/**
 * UIDAI Transaction Logger
 * 
 * Complies with UIDAI Data Minimization and Privacy Directives:
 * - NEVER log raw 12-digit Aadhaar numbers (only SHA-256 hash or masked XXXX-XXXX-1234 format)
 * - NEVER log OTP values
 * - NEVER log Biometric or Skey components
 * - Tracks correlation ID and timestamps for legitimate auditing
 */

import crypto from 'crypto';

export interface UIDAIAuditEvent {
  timestamp: string;
  correlationId: string;
  transactionId: string;
  operation: 'OTP_REQUEST' | 'AUTH_VERIFY' | 'ERROR';
  status: 'SUCCESS' | 'FAILURE' | 'UNCONFIGURED';
  detailsMasked: string;
}

export class UIDAITransactionLogger {
  private static auditLogs: UIDAIAuditEvent[] = [];

  /**
   * Masks a 12-digit Aadhaar input to "XXXXXXXX1234"
   */
  public static maskAadhaar(rawAadhaar: string): string {
    const cleaned = (rawAadhaar || '').replace(/\s+/g, '');
    if (cleaned.length >= 4) {
      return 'XXXXXXXX' + cleaned.slice(-4);
    }
    return 'XXXXXXXXXXXX';
  }

  /**
   * Generates a cryptographically strong correlation ID
   */
  public static generateCorrelationId(): string {
    return 'CORR-' + Date.now().toString(36) + '-' + crypto.randomBytes(4).toString('hex');
  }

  /**
   * Generates a unique transaction reference
   */
  public static generateTransactionId(): string {
    return 'TXN-' + crypto.randomBytes(8).toString('hex').toUpperCase();
  }

  public static log(event: UIDAIAuditEvent): void {
    this.auditLogs.unshift(event);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
    // Safe structured server log without sensitive secrets
    console.log(JSON.stringify({
      component: 'UIDAI_INTEGRATION',
      ...event
    }));
  }

  public static getRecentAuditLogs(): UIDAIAuditEvent[] {
    return [...this.auditLogs];
  }
}
