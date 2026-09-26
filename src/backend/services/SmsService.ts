/**
 * SMS Gateway Service (Twilio Removed)
 * 
 * Supports:
 * 1. Fast2SMS (Free Tier for India): FAST2SMS_API_KEY
 * 2. Local Development Mode: Formatted console output with simulated dispatch
 */

export interface SmsDispatchResult {
  success: boolean;
  provider: 'FAST2SMS' | 'DEVELOPMENT_SIMULATOR';
  messageId?: string;
  debugOtp?: string; // Only included in non-production environments
  error?: string;
}

export class SmsService {
  /**
   * Send 6-digit OTP SMS to registered voter's mobile number
   */
  public static async sendOtp(mobileNumber: string, otp: string, voterName?: string): Promise<SmsDispatchResult> {
    const cleanNumber = mobileNumber.replace(/\D/g, '');
    const message = `Election Commission of India: Your OTP for voter authentication is ${otp}. Valid for 2 minutes. Do not share with anyone. - ECI`;

    // 2. Try Fast2SMS if API key is provided
    const fast2smsKey = process.env.FAST2SMS_API_KEY;
    if (fast2smsKey) {
      try {
        const indian10Digit = cleanNumber.slice(-10);
        const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: fast2smsKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'otp',
            variables_values: otp,
            numbers: indian10Digit,
          }),
        });

        if (res.ok) {
          const data: any = await res.json();
          console.log(`[SMS-FAST2SMS] Live OTP sent to ${mobileNumber.slice(-4).padStart(mobileNumber.length, '*')}.`);
          return {
            success: true,
            provider: 'FAST2SMS',
            messageId: data.request_id || 'FAST2SMS-OK',
          };
        }
      } catch (err) {
        console.warn(`[SMS-FAST2SMS] Error:`, err);
      }
    }

    // 3. Development / Demo Mode Output
    const maskedMobile = mobileNumber.length >= 4 
      ? mobileNumber.slice(-4).padStart(mobileNumber.length, '•') 
      : '••••';

    console.log('\n======================================================');
    console.log('   🗳️  NATIONAL E-VOTING SYSTEM — SMS GATEWAY');
    console.log('======================================================');
    console.log(` TO:        ${maskedMobile} ${voterName ? `(${voterName})` : ''}`);
    console.log(` TIME:      ${new Date().toLocaleTimeString()}`);
    console.log(` OTP CODE:  \x1b[1m\x1b[32m${otp}\x1b[0m (Valid for 2 minutes)`);
    console.log(` MESSAGE:   "${message}"`);
    console.log('======================================================\n');

    return {
      success: true,
      provider: 'DEVELOPMENT_SIMULATOR',
      messageId: `SIM-${Date.now()}`,
      debugOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    };
  }
}
