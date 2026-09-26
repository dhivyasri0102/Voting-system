import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Vote,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Globe,
  ArrowRight,
  Fingerprint,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useVoiceGuidance } from '../VoiceGuidance.js';

type FlowStage = 'VOTER_ID' | 'FINGERPRINT_REGISTER' | 'FINGERPRINT_AUTH' | 'AUTH_SUCCESS';

// WebAuthn Base64URL Encoding & Decoding Utilities
function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

export const VoterLogin: React.FC = () => {
  const navigate = useNavigate();
  const { loginVoter, accessibility, toggleLanguage } = useAuth();
  const vg = useVoiceGuidance();
  const isTamil = accessibility.language === 'ta';

  const [flowStage, setFlowStage] = useState<FlowStage>('VOTER_ID');
  const [voterIdInput, setVoterIdInput] = useState<string>('');
  const [authReference, setAuthReference] = useState<string | null>(null);
  const [anonymousToken, setAnonymousToken] = useState<{ raw: string; hash: string } | null>(null);
  const [verifiedElectoralRecord, setVerifiedElectoralRecord] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const steps: FlowStage[] = ['VOTER_ID', 'FINGERPRINT_AUTH', 'AUTH_SUCCESS'];
  const stepLabels = isTamil
    ? ['அடையாள அட்டை', 'கைரேகை அங்கீகாரம்', 'வாக்கு']
    : ['Voter ID', 'Fingerprint Auth', 'Vote'];
  
  const currentStepIndex = flowStage === 'VOTER_ID' 
    ? 0 
    : (flowStage === 'FINGERPRINT_REGISTER' || flowStage === 'FINGERPRINT_AUTH') 
    ? 1 
    : 2;

  const loginStateRef = useRef({
    flowStage,
    voterIdInput,
  });
  loginStateRef.current = {
    flowStage,
    voterIdInput,
  };

  // Auto-speak instructions for each stage in Tanglish
  useEffect(() => {
    if (!vg.voiceOn) return;

    if (flowStage === 'VOTER_ID') {
      const t = setTimeout(() => vg.speak('VOTER_ID'), 400);
      return () => clearTimeout(t);
    } else if (flowStage === 'FINGERPRINT_REGISTER') {
      const t = setTimeout(() => vg.speak('FINGERPRINT_REGISTER'), 400);
      return () => clearTimeout(t);
    } else if (flowStage === 'FINGERPRINT_AUTH') {
      const t = setTimeout(() => vg.speak('FINGERPRINT_AUTH'), 400);
      return () => clearTimeout(t);
    } else if (flowStage === 'AUTH_SUCCESS') {
      const t = setTimeout(() => vg.speak('CREDENTIAL'), 400);
      return () => clearTimeout(t);
    }
  }, [flowStage, vg.voiceOn]);

  // Voice Command Routing
  useEffect(() => {
    if (!vg.voiceOn) return;

    vg.registerCommandHandler((cmd) => {
      const state = loginStateRef.current;
      if (cmd === 'REPEAT') {
        vg.repeat();
        return;
      }

      if (state.flowStage === 'VOTER_ID') {
        if (cmd === 'NEXT' || cmd === 'CONFIRM') {
          if (!state.voterIdInput.trim()) {
            setVoterIdInput('TNL1224688');
            setTimeout(() => handleVerifyVoterIdDirect('TNL1224688'), 100);
          } else {
            handleVerifyVoterIdDirect(state.voterIdInput);
          }
        }
      } else if (state.flowStage === 'FINGERPRINT_REGISTER') {
        if (cmd === 'REGISTER' || cmd === 'FINGERPRINT' || cmd === 'CONFIRM' || cmd === 'NEXT') {
          handleRegisterFingerprint();
        } else if (cmd === 'BACK') {
          setFlowStage('VOTER_ID');
          setErrorMessage(null);
          setSuccessNotice(null);
        }
      } else if (state.flowStage === 'FINGERPRINT_AUTH') {
        if (cmd === 'AUTHENTICATE' || cmd === 'FINGERPRINT' || cmd === 'CONFIRM' || cmd === 'NEXT') {
          handleAuthenticateFingerprint();
        } else if (cmd === 'BACK') {
          setFlowStage('VOTER_ID');
          setErrorMessage(null);
          setSuccessNotice(null);
        }
      } else if (state.flowStage === 'AUTH_SUCCESS') {
        if (cmd === 'NEXT' || cmd === 'CONFIRM') {
          handleContinueToVote();
        }
      }
    });

    return () => {
      vg.unregisterCommandHandler();
    };
  }, [vg.voiceOn]);

  /**
   * Step 1: Verify Voter ID against Electoral Roll
   */
  const handleVerifyVoterIdDirect = async (customId?: string) => {
    const raw = customId || voterIdInput;
    const trimmed = raw.trim().toUpperCase();

    if (!trimmed || trimmed.length < 6) {
      const msg = isTamil ? 'சரியான வாக்காளர் அடையாள அட்டை எண்ணை உள்ளிடவும்.' : 'Please enter a valid Voter ID.';
      setErrorMessage(msg);
      vg.speakCustom('Voter ID enter pannunga.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const res = await fetch('/api/v1/verification/voter-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_id: trimmed }),
      });

      const data = await res.json();
      if (!res.ok || !data.verified) {
        setErrorMessage(data.message || 'Voter ID verification failed.');
        vg.speakCustom('Voter ID verify aagala. Marubadiyum try pannunga.');
        return;
      }

      setVerifiedElectoralRecord({
        voterId: data.voter_id,
        fullNameMasked: data.name || 'Registered Citizen Voter',
        constituency: data.constituency || 'Central Chennai',
        state: data.state || 'Tamil Nadu',
      });

      // Check if voter already has registered WebAuthn biometric passkey
      if (data.has_webauthn || data.hasWebAuthn) {
        setFlowStage('FINGERPRINT_AUTH');
      } else {
        setFlowStage('FINGERPRINT_REGISTER');
      }
    } catch {
      setErrorMessage('Unable to reach electoral verification service.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyVoterId = () => handleVerifyVoterIdDirect();

  /**
   * Step 2A: Register Fingerprint via standard WebAuthn (navigator.credentials.create)
   */
  const handleRegisterFingerprint = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    const voterId = voterIdInput.trim().toUpperCase();

    // Check if browser supports WebAuthn
    if (!window.PublicKeyCredential || !navigator.credentials) {
      setErrorMessage('Your browser or device does not support WebAuthn / Passkeys.');
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch registration options from server
      const optRes = await fetch('/api/v1/webauthn/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_id: voterId }),
      });

      const optData = await optRes.json();
      if (!optRes.ok || !optData.success) {
        setErrorMessage(optData.message || 'Failed to prepare biometric registration.');
        setLoading(false);
        return;
      }

      const { options } = optData;

      // 2. Convert base64url challenge and user ID into ArrayBuffer for WebAuthn API
      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        ...options,
        challenge: base64urlToBuffer(options.challenge),
        user: {
          ...options.user,
          id: base64urlToBuffer(options.user.id),
        },
      };

      vg.speakCustom('Sensor-la ungaloda viral-ai veinga.');

      // 3. Prompt device biometric authenticator (Fingerprint / Touch ID / Windows Hello)
      const credential = (await navigator.credentials.create({
        publicKey: publicKeyOptions,
      })) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Biometric credential creation was canceled.');
      }

      const attestationResponse = credential.response as AuthenticatorAttestationResponse;

      // 4. Send attestation data back to backend to register public key
      const verifyRes = await fetch('/api/v1/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voter_id: voterId,
          response: {
            id: credential.id,
            rawId: bufferToBase64url(credential.rawId),
            type: credential.type,
            response: {
              clientDataJSON: bufferToBase64url(attestationResponse.clientDataJSON),
              attestationObject: bufferToBase64url(attestationResponse.attestationObject),
            },
          },
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        setErrorMessage(verifyData.message || 'Fingerprint registration failed.');
        setLoading(false);
        return;
      }

      setSuccessNotice(
        isTamil
          ? 'கைரேகை வெற்றிகரமாக பதிவு செய்யப்பட்டது! இப்போது உள்நுழைக.'
          : 'Fingerprint registered successfully! Authenticating now...'
      );
      vg.speakCustom('Fingerprint register aayiduchu. Ippo authenticate pannunga.');

      // Advance directly to authentication stage and trigger auth
      setFlowStage('FINGERPRINT_AUTH');
      setTimeout(() => {
        handleAuthenticateFingerprint();
      }, 600);
    } catch (err: any) {
      console.error('WebAuthn Registration Error:', err);
      const msg = err.name === 'NotAllowedError'
        ? (isTamil ? 'கைரேகை அங்கீகாரம் ரத்து செய்யப்பட்டது.' : 'Fingerprint scan was canceled or timed out.')
        : (err.message || 'Biometric authentication error occurred.');
      setErrorMessage(msg);
      vg.speakCustom('Fingerprint cancel aayiduchu. Marubadiyum try pannunga.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 2B: Authenticate via Fingerprint (navigator.credentials.get)
   */
  const handleAuthenticateFingerprint = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    const voterId = voterIdInput.trim().toUpperCase();

    if (!window.PublicKeyCredential || !navigator.credentials) {
      setErrorMessage('Your browser or device does not support WebAuthn / Passkeys.');
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch authentication assertion challenge from server
      const optRes = await fetch('/api/v1/webauthn/login/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_id: voterId }),
      });

      const optData = await optRes.json();
      if (!optRes.ok || !optData.success) {
        if (optData.registered === false) {
          setFlowStage('FINGERPRINT_REGISTER');
          setErrorMessage(optData.message);
          return;
        }
        setErrorMessage(optData.message || 'Failed to start biometric authentication.');
        return;
      }

      const { options } = optData;

      // 2. Prepare WebAuthn assertion request options
      const publicKeyRequestOptions: PublicKeyCredentialRequestOptions = {
        ...options,
        challenge: base64urlToBuffer(options.challenge),
        allowCredentials: options.allowCredentials?.map((cred: any) => ({
          ...cred,
          id: base64urlToBuffer(cred.id),
        })),
      };

      vg.speakCustom('Sensor-la ungaloda viral-ai veinga.');

      // 3. Prompt voter for device biometric (Fingerprint / Windows Hello / Touch ID)
      const assertion = (await navigator.credentials.get({
        publicKey: publicKeyRequestOptions,
      })) as PublicKeyCredential;

      if (!assertion) {
        throw new Error('Biometric assertion was canceled.');
      }

      const assertionResponse = assertion.response as AuthenticatorAssertionResponse;

      // 4. Verify assertion on backend & receive anonymous voting credential
      const verifyRes = await fetch('/api/v1/webauthn/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voter_id: voterId,
          response: {
            id: assertion.id,
            rawId: bufferToBase64url(assertion.rawId),
            type: assertion.type,
            response: {
              clientDataJSON: bufferToBase64url(assertionResponse.clientDataJSON),
              authenticatorData: bufferToBase64url(assertionResponse.authenticatorData),
              signature: bufferToBase64url(assertionResponse.signature),
              userHandle: assertionResponse.userHandle ? bufferToBase64url(assertionResponse.userHandle) : null,
            },
          },
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.verified) {
        setErrorMessage(verifyData.message || 'Biometric authentication verification failed.');
        vg.speakCustom('Fingerprint verify aagala. Marubadiyum try pannunga.');
        return;
      }

      // Success! Anonymous voting credential received
      setAuthReference(verifyData.authReference || `AUTH-BIO-${Date.now()}`);
      setAnonymousToken({
        raw: verifyData.credential.raw,
        hash: verifyData.credential.hash,
      });

      setFlowStage('AUTH_SUCCESS');
      vg.speakCustom('Fingerprint verify aayiduchu. Anonymous voting token issue panniyaachu.');
    } catch (err: any) {
      console.error('WebAuthn Authentication Error:', err);
      const msg = err.name === 'NotAllowedError'
        ? (isTamil ? 'கைரேகை சரிபார்ப்பு ரத்து செய்யப்பட்டது.' : 'Fingerprint verification was canceled or timed out.')
        : (err.message || 'Biometric authentication failed.');
      setErrorMessage(msg);
      vg.speakCustom('Fingerprint authentication cancel aayiduchu.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 3: Transition to Voting Dashboard
   */
  const handleContinueToVote = () => {
    if (!anonymousToken || !authReference) {
      setErrorMessage(isTamil ? 'அங்கீகார தகவல் இல்லை.' : 'Authentication information is missing.');
      return;
    }

    loginVoter({
      voterId: voterIdInput.trim().toUpperCase(),
      fullNameMasked: verifiedElectoralRecord?.fullNameMasked || 'Registered Citizen Voter',
      constituency: verifiedElectoralRecord?.constituency || 'Central Chennai',
      state: verifiedElectoralRecord?.state || 'Tamil Nadu',
      isRegistered: true,
      hasVoted: false,
      authReference,
      rawCredential: anonymousToken.raw,
      credentialHash: anonymousToken.hash,
    });

    navigate('/voter/dashboard');
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans text-stone-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-between mb-4">
          <Link to="/" className="inline-flex items-center space-x-1 text-xs text-stone-500 hover:text-stone-800 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isTamil ? 'முகப்புக்கு திரும்பு' : 'Back to Home'}</span>
          </Link>

          <button onClick={toggleLanguage} className="text-xs text-green-700 hover:text-green-900 flex items-center space-x-1 font-semibold transition-colors">
            <Globe className="w-3.5 h-3.5" />
            <span>{isTamil ? 'English' : 'தமிழ்'}</span>
          </button>
        </div>

        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center text-green-600 shadow-sm">
            <Vote className="w-8 h-8" />
          </div>
        </div>

        <h2 className="mt-4 text-center text-2xl font-extrabold text-stone-900">
          {isTamil ? 'வாக்காளர் உள்நுழைவு மற்றும் கைரேகை சரிபார்ப்பு' : 'Citizen Voter Authentication'}
        </h2>
        <p className="mt-1 text-center text-xs text-stone-500">
          {isTamil ? 'WebAuthn / Passkeys பாதுகாப்பான கைரேகை அங்கீகாரம்' : 'Hardware-Backed Biometric Authentication • WebAuthn'}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-stone-200 sm:px-10 space-y-5 fade-in">
          {/* Progress Bar */}
          <div className="flex items-center justify-between">
            {steps.map((step, i) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  <div className={`step-dot ${i < currentStepIndex ? 'done' : i === currentStepIndex ? 'active' : ''}`}>
                    {i < currentStepIndex ? <CheckCircle2 className="w-4 h-4" /> : <span>{i + 1}</span>}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium ${i === currentStepIndex ? 'text-green-700' : 'text-stone-400'}`}>
                    {stepLabels[i]}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 rounded ${i < currentStepIndex ? 'bg-green-400' : 'bg-stone-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Feedback Notices */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2 fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2 fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span className="font-medium">{successNotice}</span>
            </div>
          )}

          {/* Stage 1: Voter ID */}
          {flowStage === 'VOTER_ID' && (
            <div className="space-y-4 fade-in">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  {isTamil ? 'வாக்காளர் அடையாள அட்டை எண் (EPIC)' : 'Voter Identification Number (EPIC)'}
                </label>
                <input
                  type="text"
                  value={voterIdInput}
                  onChange={(e) => setVoterIdInput(e.target.value)}
                  placeholder={isTamil ? 'எ.கா. TNL1224688' : 'e.g. TNL1224688'}
                  maxLength={10}
                  className="block w-full px-3 py-2.5 text-sm uppercase tracking-wider font-mono border border-stone-300 rounded-lg text-stone-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyVoterId()}
                />
                <span className="text-[11px] text-stone-400 mt-1 block">
                  {isTamil ? 'உங்கள் 10-இலக்க EPIC எண்ணை உள்ளிடவும்' : 'Enter your 10-character EPIC number (e.g. TNL1224688)'}
                </span>
              </div>

              <button
                type="button"
                disabled={loading || voterIdInput.trim().length < 6}
                onClick={handleVerifyVoterId}
                className="w-full py-3 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isTamil ? 'சரிபார்க்கிறது...' : 'Verifying...'}</span>
                  </>
                ) : (
                  <>
                    <span>{isTamil ? 'வாக்காளர் தகுதியை சரிபார்க்கவும்' : 'Verify Voter Eligibility'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Stage 2A: First-Time User: Register Fingerprint */}
          {flowStage === 'FINGERPRINT_REGISTER' && (
            <div className="space-y-4 fade-in">
              <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-xs">
                <div className="text-[10px] font-bold text-green-800 uppercase flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isTamil ? 'வாக்காளர் தகுதி உறுதி' : 'Electoral Eligibility Verified'}</span>
                </div>
                <div className="font-bold text-stone-900 mt-1">{verifiedElectoralRecord?.fullNameMasked}</div>
                <div className="text-[11px] text-stone-500">
                  {isTamil ? 'தொகுதி:' : 'Constituency:'} {verifiedElectoralRecord?.constituency}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-green-100 border border-green-300 flex items-center justify-center text-green-700 mx-auto shadow-inner">
                  <Fingerprint className="w-7 h-7" />
                </div>
                <div className="text-sm font-bold text-stone-900">
                  {isTamil ? 'முதல் முறை: கைரேகையைப் பதிவு செய்யவும்' : 'First-Time: Register Fingerprint'}
                </div>
                <p className="text-xs text-stone-600 max-w-xs mx-auto leading-relaxed">
                  {isTamil
                    ? 'உங்கள் சாதனத்தின் கைரேகை சென்சார் மூலம் பாதுகாப்பான WebAuthn பயோமெட்ரிக் சாவியை உருவாக்கவும்.'
                    : 'Create a secure hardware-backed biometric passkey on your device for fast, passwordless voting.'}
                </p>
                <div className="flex items-center justify-center space-x-1.5 text-[11px] text-green-700 font-semibold pt-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isTamil ? 'கைரேகை உங்கள் சாதனத்திலேயே பாதுகாப்பாக இருக்கும்' : 'Raw biometric never leaves your device'}</span>
                </div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleRegisterFingerprint}
                className="w-full py-3.5 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold flex items-center justify-center space-x-2 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isTamil ? 'சென்சார் தயார் ஆகிறது...' : 'Awaiting Biometric Scan...'}</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-5 h-5" />
                    <span>{isTamil ? 'கைரேகையைப் பதிவு செய்' : 'Register Fingerprint'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setFlowStage('VOTER_ID');
                  setErrorMessage(null);
                  setSuccessNotice(null);
                }}
                className="w-full text-[11px] text-stone-500 hover:text-stone-700 hover:underline transition-colors text-center"
              >
                ← {isTamil ? 'அடையாள அட்டைக்கு திரும்பு' : 'Back to Voter ID'}
              </button>
            </div>
          )}

          {/* Stage 2B: Returning User: Authenticate with Fingerprint */}
          {flowStage === 'FINGERPRINT_AUTH' && (
            <div className="space-y-4 fade-in">
              <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-xs">
                <div className="text-[10px] font-bold text-green-800 uppercase flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isTamil ? 'வாக்காளர் அடையாளம் உறுதி' : 'Electoral Record Found'}</span>
                </div>
                <div className="font-bold text-stone-900 mt-1">{verifiedElectoralRecord?.fullNameMasked}</div>
                <div className="text-[11px] text-stone-500">
                  {isTamil ? 'தொகுதி:' : 'Constituency:'} {verifiedElectoralRecord?.constituency}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700 mx-auto shadow-inner">
                  <Fingerprint className="w-7 h-7" />
                </div>
                <div className="text-sm font-bold text-stone-900">
                  {isTamil ? 'கைரேகை மூலம் உள்நுழைக' : 'Authenticate with Fingerprint'}
                </div>
                <p className="text-xs text-stone-600 max-w-xs mx-auto leading-relaxed">
                  {isTamil
                    ? 'உங்கள் சாதனத்தின் கைரேகை சென்சாரைத் தொட்டு வாக்குப் பதிவுக்கான அனுமதியைப் பெறுங்கள்.'
                    : 'Touch your device fingerprint sensor or authenticate with Windows Hello / Touch ID.'}
                </p>
                <div className="flex items-center justify-center space-x-1.5 text-[11px] text-blue-700 font-semibold pt-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isTamil ? 'WebAuthn மறைகுறியாக்கப்பட்ட சரிபார்ப்பு' : 'Zero OTP dependency • 100% Cryptographic'}</span>
                </div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleAuthenticateFingerprint}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center space-x-2 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isTamil ? 'சரிபார்க்கிறது...' : 'Verifying Biometric...'}</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-5 h-5" />
                    <span>{isTamil ? 'கைரேகை சரிபார்க்கவும்' : 'Authenticate with Fingerprint'}</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setFlowStage('VOTER_ID');
                    setErrorMessage(null);
                    setSuccessNotice(null);
                  }}
                  className="hover:text-stone-700 hover:underline transition-colors"
                >
                  ← {isTamil ? 'அடையாள அட்டைக்கு திரும்பு' : 'Back to Voter ID'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFlowStage('FINGERPRINT_REGISTER');
                    setErrorMessage(null);
                  }}
                  className="text-blue-600 hover:text-blue-800 hover:underline transition-colors font-medium"
                >
                  {isTamil ? 'புதிய கைரேகை பதிவு செய்' : 'Re-register Fingerprint'}
                </button>
              </div>
            </div>
          )}

          {/* Stage 3: Authentication Success */}
          {flowStage === 'AUTH_SUCCESS' && (
            <div className="space-y-4 fade-in">
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-center">
                <CheckCircle2 className="w-9 h-9 text-green-600 mx-auto" />
                <div className="mt-2 text-sm font-bold text-green-800">
                  {isTamil ? 'கைரேகை அங்கீகாரம் வெற்றி!' : 'Biometric Authentication Verified!'}
                </div>
                <div className="text-[11px] text-stone-600 mt-1">
                  {isTamil
                    ? 'தனிப்பட்ட வாக்காளர் அடையாளம் உறுதி செய்யப்பட்டு, ரகசிய வாக்குப் பதிவு சீட்டு உருவாக்கப்பட்டது.'
                    : 'Anonymous one-time cryptographic voting credential issued successfully.'}
                </div>
              </div>

              <button
                type="button"
                onClick={handleContinueToVote}
                className="w-full py-3.5 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                <span>{isTamil ? 'வாக்களிக்க தொடரவும்' : 'Continue to Voting'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
