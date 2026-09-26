export type UIDAIEnvironment = 'sandbox' | 'production';

export interface UIDAIConfig {
  environment: UIDAIEnvironment;
  authUrl: string;
  otpUrl: string;
  auaCode: string;
  licenseKey: string;
  privateKey?: string;
}

export class UIDAIConfiguration {
  private static instance: UIDAIConfiguration | null = null;

  private config: UIDAIConfig = {
    environment: 'sandbox',
    authUrl: 'https://developer.uidai.gov.in/auth/sandbox',
    otpUrl: 'https://developer.uidai.gov.in/otp/sandbox',
    auaCode: 'AUA-SANDBOX-DEMO',
    licenseKey: 'LIC-SANDBOX-2026',
  };

  private constructor() {}

  public static getInstance(): UIDAIConfiguration {
    if (!UIDAIConfiguration.instance) {
      UIDAIConfiguration.instance = new UIDAIConfiguration();
    }
    return UIDAIConfiguration.instance;
  }

  public getConfig(): UIDAIConfig {
    return { ...this.config };
  }

  public setEnvironmentMode(
    environment: UIDAIEnvironment,
    overrides: Partial<UIDAIConfig> = {}
  ): UIDAIConfig {
    this.config = {
      ...this.config,
      environment,
      ...overrides,
    };
    return this.getConfig();
  }

  public isConfigured(): boolean {
    return Boolean(this.config.auaCode && this.config.licenseKey && this.config.authUrl && this.config.otpUrl);
  }
}
