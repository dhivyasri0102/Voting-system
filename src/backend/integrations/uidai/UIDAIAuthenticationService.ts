import crypto from 'crypto';

export interface UIDAIOTPRequestParams {
  aadhaarNumber: string;
  userConsent: boolean;
  ipAddress?: string;
}

export interface UIDAIOTPResponse {
  success: boolean;
  statusCode: number;
  status: string;
  message: string;
  transaction_id?: string;
}

export interface UIDAIAuthenticationRequest {
  transactionId: string;
  otp: string;
  ipAddress?: string;
}

export interface UIDAIAuthenticationResponse {
  success: boolean;
  statusCode: number;
  status: string;
  message: string;
  authentication_reference?: string;
  authenticated_at?: string;
}

export class UIDAIOTPService {
  public static async requestOTP(params: UIDAIOTPRequestParams): Promise<UIDAIOTPResponse> {
    if (!params.userConsent) {
      return {
        success: false,
        statusCode: 400,
        status: 'CONSENT_REQUIRED',
        message: 'Citizen consent is mandatory before requesting Aadhaar OTP.',
      };
    }

    const transactionId = `TXN-UIDAI-SANDBOX-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    return {
      success: true,
      statusCode: 200,
      status: 'OTP_SENT',
      message: 'UIDAI sandbox OTP generated successfully.',
      transaction_id: transactionId,
    };
  }
}

export class UIDAIAuthenticationService {
  public static async verifyOTP(params: UIDAIAuthenticationRequest): Promise<UIDAIAuthenticationResponse> {
    const cleanOtp = (params.otp || '').trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return {
        success: false,
        statusCode: 400,
        status: 'INVALID_OTP_FORMAT',
        message: 'Please enter a valid 6-digit numerical OTP.',
      };
    }

    if (cleanOtp === '123456') {
      return {
        success: true,
        statusCode: 200,
        status: 'AUTHENTICATED',
        message: 'Identity successfully authenticated (UIDAI Sandbox / Demo Mode).',
        authentication_reference: 'AUTH-UIDAI-SANDBOX-' + crypto.randomBytes(8).toString('hex').toUpperCase(),
        authenticated_at: new Date().toISOString(),
      };
    }

    return {
      success: false,
      statusCode: 401,
      status: 'AUTHENTICATION_FAILED',
      message: 'Invalid OTP entered. Please try again.',
    };
  }
}
