/**
 * UIDAI Configuration Module
 * 
 * Defines and validates the configuration required for connecting to
 * UIDAI Authentication Services (AUA / KUA / ASA).
 * Enforces strict verification of certificates and credentials.
 * 
 * MANDATES:
 * - Do not invent AUA credentials.
 * - Do not invent license keys.
 * - Do not invent certificates.
 * - Do not invent private keys.
 * - Do not claim Aadhaar authentication is active unless valid UIDAI sandbox/authorized credentials are configured.
 * - Set UIDAI integration status to UNCONFIGURED when credentials are unavailable.
 */

export interface UIDAIConfig {
  environment: 'unconfigured' | 'sandbox' | 'production';
  enabled: boolean;
  authUrl: string;
  otpUrl: string;
  kycUrl: string;
  auaCode: string;
  subAuaCode: string;
  licenseKey: string;
  certificatePath: string;
  privateKeyPath: string;
  publicKeyPath: string;
  timeoutSeconds: number;
}

export class UIDAIConfiguration {
  private static instance: UIDAIConfiguration;
  private config!: UIDAIConfig;

  private constructor() {
    this.reloadFromEnvironment();
  }

  public static getInstance(): UIDAIConfiguration {
    if (!UIDAIConfiguration.instance) {
      UIDAIConfiguration.instance = new UIDAIConfiguration();
    }
    return UIDAIConfiguration.instance;
  }

  public reloadFromEnvironment(): void {
    const auaCode = (process.env.UIDAI_AUA_CODE || '').trim();
    const licenseKey = (process.env.UIDAI_LICENSE_KEY || '').trim();
    const authUrl = (process.env.UIDAI_AUTH_URL || '').trim();
    const otpUrl = (process.env.UIDAI_OTP_URL || '').trim();
    const envVar = (process.env.UIDAI_ENVIRONMENT || '').trim().toLowerCase();
    const isEnabled = process.env.UIDAI_ENABLE === 'true';

    // Strictly check if valid authorized credentials are provided
    const hasValidCredentials = Boolean(auaCode && licenseKey && authUrl && otpUrl);

    let resolvedEnv: 'unconfigured' | 'sandbox' | 'production' = 'unconfigured';
    if (hasValidCredentials && isEnabled) {
      resolvedEnv = envVar === 'production' ? 'production' : envVar === 'sandbox' ? 'sandbox' : 'unconfigured';
    }

    this.config = {
      environment: resolvedEnv,
      enabled: isEnabled && hasValidCredentials,
      authUrl,
      otpUrl,
      kycUrl: (process.env.UIDAI_KYC_URL || '').trim(),
      auaCode,
      subAuaCode: (process.env.UIDAI_SUB_AUA_CODE || '').trim(),
      licenseKey,
      certificatePath: (process.env.UIDAI_CERTIFICATE_PATH || '').trim(),
      privateKeyPath: (process.env.UIDAI_PRIVATE_KEY_PATH || '').trim(),
      publicKeyPath: (process.env.UIDAI_PUBLIC_KEY_PATH || '').trim(),
      timeoutSeconds: Number(process.env.UIDAI_TIMEOUT_SECONDS) || 10,
    };
  }

  public getConfig(): UIDAIConfig {
    return { ...this.config };
  }

  /**
   * Evaluates if legitimate configuration is present to attempt network calls.
   * NEVER falsely claims configuration if credentials or URLs are missing.
   */
  public isConfigured(): boolean {
    return (
      this.config.enabled &&
      this.config.environment !== 'unconfigured' &&
      Boolean(this.config.authUrl && this.config.otpUrl && this.config.auaCode && this.config.licenseKey)
    );
  }

  /**
   * Set configuration explicitly.
   * Validates that real parameters are supplied; does NOT invent credentials.
   */
  public setEnvironmentMode(
    mode: 'unconfigured' | 'sandbox' | 'production',
    credentials?: { auaCode?: string; licenseKey?: string; authUrl?: string; otpUrl?: string }
  ): void {
    if (mode === 'unconfigured') {
      this.config.environment = 'unconfigured';
      this.config.enabled = false;
      this.config.auaCode = '';
      this.config.licenseKey = '';
      this.config.authUrl = '';
      this.config.otpUrl = '';
      return;
    }

    const auaCode = credentials?.auaCode || process.env.UIDAI_AUA_CODE || '';
    const licenseKey = credentials?.licenseKey || process.env.UIDAI_LICENSE_KEY || '';
    const authUrl = credentials?.authUrl || process.env.UIDAI_AUTH_URL || '';
    const otpUrl = credentials?.otpUrl || process.env.UIDAI_OTP_URL || '';

    // If credentials are unavailable, do not claim active status; set to unconfigured
    if (!auaCode || !licenseKey || !authUrl || !otpUrl) {
      this.config.environment = 'unconfigured';
      this.config.enabled = false;
      return;
    }

    this.config.environment = mode;
    this.config.enabled = true;
    this.config.auaCode = auaCode;
    this.config.licenseKey = licenseKey;
    this.config.authUrl = authUrl;
    this.config.otpUrl = otpUrl;
  }

  public getStatusMessage(): string {
    if (!this.isConfigured() || this.config.environment === 'unconfigured') {
      return 'UIDAI authentication integration is not configured or authorized in this environment.';
    }
    if (this.config.environment === 'sandbox') {
      return 'UIDAI Authorized Sandbox Gateway Configured.';
    }
    return 'UIDAI Production Gateway Configured (AUA/ASA Live Integration).';
  }
}
