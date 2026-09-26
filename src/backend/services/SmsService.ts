import crypto from 'crypto';

/** Local-only OTP simulator retained for legacy development endpoints. */
export interface SmsDispatchResult {
  success: boolean;
  provider: 'DEVELOPMENT_SIMULATOR';
  messageId?: string;
  debugOtp?: string;
  error?: string;
}

export class SmsService {
  public static async sendOtp(
    mobileNumber: string,
    otp?: string,
    _voterName?: string
  ): Promise<SmsDispatchResult> {
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        provider: 'DEVELOPMENT_SIMULATOR',
        error: 'The local OTP simulator is disabled in production.',
      };
    }

    const debugOtp = otp || crypto.randomInt(100000, 1000000).toString();
    console.log(`[OTP SIMULATOR] ${mobileNumber.slice(-4)}: ${debugOtp}`);

    return {
      success: true,
      provider: 'DEVELOPMENT_SIMULATOR',
      messageId: `SIM-${Date.now()}`,
      debugOtp,
    };
  }
}