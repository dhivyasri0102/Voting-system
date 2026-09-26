/**
 * Authentication & Role-Based Access Control (RBAC) Service
 * 
 * Strict separation:
 * - ELECTION_AUTHORITY: Manages elections, candidates, lifecycle, aggregate results. CANNOT vote or modify ballots.
 * - VOTER: Uses the local demo voter-ID flow and anonymous token. Production must require a real identity factor.
 * - AUDITOR: Inspects blockchain ledger, verifies CAG audit reports.
 * - SYSTEM_ADMIN: Manages infrastructure health.
 */

import crypto from 'crypto';
import { User, UserRole, AdminProfile, AdminAuditEvent } from '../../types/index.js';
import { getJwtSecret } from '../config/secrets.js';
import { SecurityMonitoringService } from './SecurityMonitoringService.js';

interface StoredUser extends User {
  passwordHash: string;
  salt: string;
  failedLoginAttempts: number;
  lockedUntil?: number;
  profile: AdminProfile;
}

export interface AuthSession {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    fullName: string;
    role: UserRole;
    profile: AdminProfile;
  };
  expiresAt: string;
}

export class AuthService {
  private static users = new Map<string, StoredUser>(); // username/email -> StoredUser
  private static auditLogs: AdminAuditEvent[] = [];

  static {
    this.seedDevelopmentAccounts();
  }

  /**
   * Helper to hash passwords securely using crypto PBKDF2
   */
  private static hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  }

  /**
   * Seeds development accounts with production-like roles.
   * Clearly marked as DEVELOPMENT accounts.
   */
  private static seedDevelopmentAccounts(): void {
    // DEVELOPMENT ONLY:
    // Replace hardcoded demo credentials with secure backend authentication
    // and environment-based secrets before production deployment.
    const salt1 = crypto.randomBytes(16).toString('hex');
    const authorityUser: StoredUser = {
      id: 'USR-AUTH-001',
      username: 'admin',
      email: 'admin@eci.gov.in',
      fullName: 'Election Commission Authority (Chennai Central RO)',
      role: 'ELECTION_AUTHORITY',
      passwordHash: this.hashPassword('admin123', salt1),
      salt: salt1,
      failedLoginAttempts: 0,
      createdAt: new Date().toISOString(),
      profile: {
        userId: 'USR-AUTH-001',
        badgeNumber: 'ECI-RO-2026-TN-04',
        department: 'Election Conduct & Returning Office',
        mfaEnabled: false,
      },
    };
    this.users.set('admin', authorityUser);
    this.users.set('admin@eci.gov.in', authorityUser); // Alias for convenience

    // New Election Admin account
    const saltAdmin = crypto.randomBytes(16).toString('hex');
    const electionAdminUser: StoredUser = {
      id: 'USR-AUTH-002',
      username: 'election_admin',
      email: 'election_admin@eci.gov.in',
      fullName: 'National Election Administrator',
      role: 'ELECTION_AUTHORITY',
      passwordHash: this.hashPassword('Admin@2026', saltAdmin),
      salt: saltAdmin,
      failedLoginAttempts: 0,
      createdAt: new Date().toISOString(),
      profile: {
        userId: 'USR-AUTH-002',
        badgeNumber: 'ECI-HQ-2026-01',
        department: 'National Election Administration Directorate',
        mfaEnabled: false,
      },
    };
    this.users.set('election_admin', electionAdminUser);

    // 2. CAG Auditor Account
    const salt2 = crypto.randomBytes(16).toString('hex');
    const auditorUser: StoredUser = {
      id: 'USR-AUDIT-001',
      username: 'auditor@cag.gov.in',
      email: 'auditor@cag.gov.in',
      fullName: 'CAG Senior Digital Auditor',
      role: 'AUDITOR',
      passwordHash: this.hashPassword('AuditorPassword@2026', salt2),
      salt: salt2,
      failedLoginAttempts: 0,
      createdAt: new Date().toISOString(),
      profile: {
        userId: 'USR-AUDIT-001',
        badgeNumber: 'CAG-DIR-AUDIT-99',
        department: 'Digital Systems & Blockchain Audit Wing',
        mfaEnabled: true,
      },
    };
    this.users.set('auditor@cag.gov.in', auditorUser);
    this.users.set('auditor', auditorUser);
  }

  /**
   * Authenticates an administrative user with password & MFA
   */
  public static authenticateAdmin(params: {
    username: string;
    password: string;
    mfaOtp?: string;
    ipAddress?: string;
    requestId?: string;
  }): { success: boolean; statusCode: number; message: string; session?: AuthSession } {
    const { username, password, mfaOtp, ipAddress, requestId } = params;
    const cleanUsername = (username || '').trim().toLowerCase();
    const reqId = requestId || `REQ-${Date.now()}`;

    const user = this.users.get(cleanUsername);
    if (!user) {
      SecurityMonitoringService.recordSecurityEvent({
        type: 'AUTHENTICATION_ATTEMPT',
        severity: 'MEDIUM',
        description: `Admin login failed: User ${cleanUsername} does not exist.`,
        clientIpMasked: ipAddress ? SecurityMonitoringService.maskIp(ipAddress) : 'UNKNOWN',
      });
      return { success: false, statusCode: 401, message: 'Invalid admin username or password.' };
    }

    // Role check: Voters cannot use admin login
    if (user.role === 'VOTER') {
      return { success: false, statusCode: 403, message: 'Access denied. Voter credentials cannot access Election Authority portal.' };
    }

    // Check account lockout
    if (user.lockedUntil && Date.now() < user.lockedUntil) {
      const waitMinutes = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return {
        success: false,
        statusCode: 423,
        message: `Account is temporarily locked due to multiple failed attempts. Please retry in ${waitMinutes} minutes.`,
      };
    }

    // Verify Password
    const computedHash = this.hashPassword(password, user.salt);
    const passwordMatch = crypto.timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(user.passwordHash, 'hex')
    );

    if (!passwordMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = Date.now() + 15 * 60 * 1000; // 15-minute lockout
        SecurityMonitoringService.recordSecurityEvent({
          type: 'SUSPICIOUS_REQUEST',
          severity: 'HIGH',
          description: `Admin account ${user.username} locked due to 5 consecutive failed login attempts.`,
          clientIpMasked: ipAddress ? SecurityMonitoringService.maskIp(ipAddress) : 'UNKNOWN',
        });
      }
      return { success: false, statusCode: 401, message: 'Invalid admin username or password.' };
    }

    // Verify MFA OTP
    if (user.profile.mfaEnabled) {
      const cleanOtp = (mfaOtp || '').trim();
      const validOtps = ['123456', '999999', '888888']; // Authorized dev/sandbox MFA OTPs
      if (!cleanOtp || !validOtps.includes(cleanOtp)) {
        return {
          success: false,
          statusCode: 401,
          message: 'Invalid or missing Multi-Factor Authentication (MFA) OTP code.',
        };
      }
    }

    // Reset failed counter on successful login
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.profile.lastLoginAt = new Date().toISOString();

    // Create JWT
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7200, // 2-hour session
    };

    const token = this.generateJwt(payload);

    this.recordAdminAudit({
      admin_id: user.id,
      action: 'ADMIN_LOGIN_SUCCESS',
      request_id: reqId,
      result: 'SUCCESS',
      details: `Successful authentication for role ${user.role}.`,
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Admin authentication successful.',
      session: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          profile: user.profile,
        },
        expiresAt: new Date(payload.exp * 1000).toISOString(),
      },
    };
  }

  /**
   * Generates a tamper-proof HMAC-SHA256 JWT string
   */
  public static generateJwt(payload: any): string {
    const secret = getJwtSecret();
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${header}.${body}`)
      .digest('base64url');

    return `${header}.${body}.${signature}`;
  }

  /**
   * Verifies an HMAC-SHA256 JWT token
   */
  public static verifyJwt(token: string): { valid: boolean; payload?: any; reason?: string } {
    try {
      if (!token || typeof token !== 'string') {
        return { valid: false, reason: 'Token missing or invalid format.' };
      }
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, reason: 'Malformed token structure.' };
      }

      const [header, body, signature] = parts;
      const secret = getJwtSecret();
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${header}.${body}`)
        .digest('base64url');

      if (
        !crypto.timingSafeEqual(
          Buffer.from(signature, 'utf8'),
          Buffer.from(expectedSignature, 'utf8')
        )
      ) {
        return { valid: false, reason: 'Cryptographic signature mismatch.' };
      }

      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return { valid: false, reason: 'Session token has expired.' };
      }

      return { valid: true, payload };
    } catch (err) {
      return { valid: false, reason: 'Failed to parse token.' };
    }
  }

  /**
   * Records an immutable Administrative Audit Event
   */
  public static recordAdminAudit(event: Omit<AdminAuditEvent, 'id' | 'timestamp'>): AdminAuditEvent {
    const auditRecord: AdminAuditEvent = {
      ...event,
      id: 'AUD-EVT-' + crypto.randomBytes(6).toString('hex').toUpperCase(),
      timestamp: new Date().toISOString(),
    };

    this.auditLogs.unshift(auditRecord);
    if (this.auditLogs.length > 2000) {
      this.auditLogs.pop(); // Keep recent 2000 records
    }

    // Mirror to security monitoring
    SecurityMonitoringService.recordSecurityEvent({
      type: 'ADMIN_ACTION',
      severity: event.result === 'SUCCESS' ? 'LOW' : 'MEDIUM',
      description: `[${event.action}] Admin ${event.admin_id} on Election ${event.election_id || 'N/A'}: ${event.details || ''}`,
      clientIpMasked: 'ADMIN_SESSION',
    });

    return auditRecord;
  }

  public static getAdminAuditEvents(limit = 100): AdminAuditEvent[] {
    return this.auditLogs.slice(0, limit);
  }
}
