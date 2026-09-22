import crypto from 'crypto';

/**
 * Security Secrets Management
 * 
 * Automatically generates cryptographically strong random values for
 * JWT_SECRET and ADMIN_MFA_SECRET if not supplied by the environment.
 * Prevents hardcoded or weak fallback secrets in local development.
 */

let initializedJwtSecret: string;
let initializedAdminMfaSecret: string;

export function initializeSecrets() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 32) {
    initializedJwtSecret = process.env.JWT_SECRET.trim();
  } else {
    // Generate secure 256-bit random hex secret
    initializedJwtSecret = crypto.randomBytes(32).toString('hex');
    process.env.JWT_SECRET = initializedJwtSecret;
    console.log('[SECURITY] Generated cryptographically strong random JWT_SECRET (256-bit).');
  }

  if (process.env.ADMIN_MFA_SECRET && process.env.ADMIN_MFA_SECRET.trim().length >= 16) {
    initializedAdminMfaSecret = process.env.ADMIN_MFA_SECRET.trim();
  } else {
    // Generate secure 160-bit random hex secret
    initializedAdminMfaSecret = crypto.randomBytes(20).toString('hex');
    process.env.ADMIN_MFA_SECRET = initializedAdminMfaSecret;
    console.log('[SECURITY] Generated cryptographically strong random ADMIN_MFA_SECRET (160-bit).');
  }
}

export function getJwtSecret(): string {
  if (!initializedJwtSecret) {
    initializeSecrets();
  }
  return initializedJwtSecret;
}

export function getAdminMfaSecret(): string {
  if (!initializedAdminMfaSecret) {
    initializeSecrets();
  }
  return initializedAdminMfaSecret;
}

// Auto-initialize on module load
initializeSecrets();
