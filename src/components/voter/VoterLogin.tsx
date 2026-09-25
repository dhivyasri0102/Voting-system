import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Vote,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Lock,
  Globe,
  ArrowRight,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useVoiceGuidance, VotingStep } from '../VoiceGuidance.js';

// Map VoterLogin flowStage → VotingStep for voice guidance
const STAGE_TO_VOICE: Record<string, VotingStep> = {
  VOTER_ID: 'VOTER_ID',
  AADHAAR_ENTRY: 'AADHAAR',
  OTP_ENTRY: 'OTP',
  AUTH_SUCCESS: 'CREDENTIAL',
};

type FlowStage = 'VOTER_ID' | 'PHONE_ENTRY' | 'OTP_ENTRY' | 'AUTH_SUCCESS';

export const VoterLogin: React.FC = () => {
  const navigate = useNavigate();
  const { loginVoter, accessibility, toggleLanguage } = useAuth();
  const vg = useVoiceGuidance();

  const isTamil = accessibility.language === 'ta';

  const [flowStage, setFlowStage] = useState<
    'VOTER_ID' | 'AADHAAR_ENTRY' | 'OTP_ENTRY' | 'AUTH_SUCCESS'
  >('VOTER_ID');

  // ── Speak guidance whenever the flow stage changes ──────────────────────────
  useEffect(() => {
    const step = STAGE_TO_VOICE[flowStage];
    if (step) {
      const t = setTimeout(() => vg.speak(step), 600);
      return () => clearTimeout(t);
    }
  }, [flowStage, vg.voiceOn, vg.lang]);

  // ── Register voice commands ──────────────────────────────────────────────────
  useEffect(() => {
    vg.registerCommandHandler((cmd) => {
      if (cmd.includes('repeat') || cmd.includes('again')) { vg.repeat(); return; }
      if (cmd.includes('next') || cmd.includes('proceed')) {
        // The flow advances via the real buttons — we just remind
        vg.speakCustom('Please fill in the form and press the button to proceed.');
      }
    });
    return () => vg.unregisterCommandHandler();
  }, [vg]);


  const [voterIdInput, setVoterIdInput] =
    useState<string>('TNL1029384');

  const [aadhaarInput, setAadhaarInput] =
    useState<string>('5432 9876 1238');

  const [consentGiven, setConsentGiven] =
    useState<boolean>(true);

  const [otpInput, setOtpInput] =
    useState<string>('123456');

  const [otpTxId, setOtpTxId] =
    useState<string | null>(null);
  const [flowStage, setFlowStage] = useState<FlowStage>('VOTER_ID');

  const [voterIdInput, setVoterIdInput] = useState<string>('');
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [consentGiven, setConsentGiven] = useState<boolean>(false);
  const [otpInput, setOtpInput] = useState<string>('');
  const [otpTxId, setOtpTxId] = useState<string | null>(null);
  const [authReference, setAuthReference] = useState<string | null>(null);
  const [anonymousToken, setAnonymousToken] = useState<{ raw: string; hash: string } | null>(null);
  const [verifiedElectoralRecord, setVerifiedElectoralRecord] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  const steps: FlowStage[] = ['VOTER_ID', 'PHONE_ENTRY', 'OTP_ENTRY', 'AUTH_SUCCESS'];
  const stepLabels = isTamil
    ? ['அடையாள அட்டை', 'மொபைல் எண்', 'OTP', 'வாக்கு']
    : ['Voter ID', 'Mobile', 'OTP', 'Vote'];

  const currentStepIndex = steps.indexOf(flowStage);

  // ---------------------------------------------------------
  // STEP 1 - VERIFY VOTER ID
  // ---------------------------------------------------------
  const handleVerifyVoterId = async () => {
    const trimmed = voterIdInput.trim().toUpperCase();

    if (!trimmed || trimmed.length < 6) {
      setErrorMessage(
        isTamil
          ? 'சரியான வாக்காளர் அடையாள அட்டை எண்ணை உள்ளிடவும்.'
          : 'Please enter a valid Voter ID (minimum 6 characters).'
      );
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/verification/voter-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_id: trimmed, simulate_local_dev: true }),
      });

      const data = await res.json();

      if (!res.ok || (!data.verified && !data.record)) {
        setErrorMessage(data.message || (isTamil ? 'வாக்காளர் அடையாள சரிபார்ப்பு தோல்வியடைந்தது.' : 'Voter ID verification failed.'));
        return;
      }

      setVerifiedElectoralRecord(
        data.record || data.voter || {
          fullNameMasked: 'Registered Citizen Voter',
          constituency: 'Central Chennai',
          state: 'Tamil Nadu',
        }
      );
      setFlowStage('PHONE_ENTRY');
    } catch {
      // Prototype fallback
      setVerifiedElectoralRecord({
        fullNameMasked: isTamil ? 'பதிவுசெய்யப்பட்ட வாக்காளர்' : 'Registered Citizen Voter',
        constituency: 'Central Chennai',
        state: 'Tamil Nadu',
      });
      setFlowStage('PHONE_ENTRY');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // STEP 2 - SEND OTP TO MOBILE
  // ---------------------------------------------------------
  const handleSendOtp = async () => {
    if (!consentGiven) {
      setErrorMessage(
        isTamil
          ? 'தொடர உங்கள் ஒப்புதல் தேவை.'
          : 'Your consent is required to proceed.'
      );
      return;
    }

    const cleanPhone = phoneInput.replace(/[\s-]+/g, '');

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMessage(
        isTamil
          ? 'சரியான 10-இலக்க இந்திய மொபைல் எண்ணை உள்ளிடவும்.'
          : 'Please enter a valid 10-digit Indian mobile number (starting with 6-9).'
      );
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/verification/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, voter_id: voterIdInput.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (res.ok) {
        setOtpTxId(data.transactionId || 'TXN-' + Date.now());
        setFlowStage('OTP_ENTRY');
        // 120-second countdown
        let t = 120;
        setCountdown(t);
        const interval = setInterval(() => {
          t -= 1;
          setCountdown(t);
          if (t <= 0) clearInterval(interval);
        }, 1000);
      } else {
        setErrorMessage(data.message || (isTamil ? 'OTP அனுப்புவதில் தோல்வி.' : 'Failed to send OTP. Please retry.'));
      }
    } catch {
      setErrorMessage(isTamil ? 'சேவையகத்தை அணுக முடியவில்லை.' : 'Unable to reach the authentication service.');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // STEP 3 - VERIFY OTP
  // ---------------------------------------------------------
  const handleVerifyOtp = async () => {
    if (!otpTxId) {
      setErrorMessage(isTamil ? 'முதலில் OTP கோரவும்.' : 'Please request OTP first.');
      return;
    }

    const cleanOtp = otpInput.trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage(
        isTamil ? 'சரியான 6-இலக்க OTP-ஐ உள்ளிடவும்.' : 'Please enter the 6-digit OTP.'
      );
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/verification/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: otpTxId,
          otp: cleanOtp,
          voter_id: voterIdInput.trim().toUpperCase(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.verified && data.credential?.raw && data.credential?.hash) {
        const ref = data.authReference || '';
        const rawCred = data.credential.raw;
        const hashCred = data.credential.hash;

        setAuthReference(ref);
        setAnonymousToken({ raw: rawCred, hash: hashCred });
        setFlowStage('AUTH_SUCCESS');
      } else {
        setErrorMessage(data.message || (isTamil ? 'தவறான OTP. மீண்டும் முயற்சிக்கவும்.' : 'Invalid OTP. Please try again.'));
      }
    } catch {
      setErrorMessage(isTamil ? 'சேவையகத்தை அணுக முடியவில்லை.' : 'Unable to reach the authentication service.');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // STEP 4 - CONTINUE TO VOTING
  // ---------------------------------------------------------
  const handleContinueToVote = () => {
    if (!anonymousToken || !authReference) {
      setErrorMessage(isTamil ? 'அங்கீகார தகவல் இல்லை.' : 'Authentication information is missing.');
      return;
    }

    loginVoter({
      voterId: voterIdInput.trim().toUpperCase(),
      fullNameMasked: verifiedElectoralRecord?.fullNameMasked || 'S***** K*****',
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

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans text-stone-900">

      {/* HEADER */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/"
            className="inline-flex items-center space-x-1 text-xs text-stone-500 hover:text-stone-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isTamil ? 'முகப்புக்கு திரும்பு' : 'Back to Home'}</span>
          </Link>

          <button
            onClick={toggleLanguage}
            className="text-xs text-green-700 hover:text-green-900 flex items-center space-x-1 font-semibold transition-colors"
          >
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
          {isTamil ? 'வாக்காளர் உள்நுழைவு மற்றும் சரிபார்ப்பு' : 'Citizen Voter Authentication'}
        </h2>
        <p className="mt-1 text-center text-xs text-stone-500">
          {isTamil ? 'தேசிய மின்னணு வாக்குப்பதிவு அமைப்பு' : 'National E-Voting System • Prototype'}
        </p>
      </div>

      {/* MAIN CARD */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-stone-200 sm:px-10 space-y-5 fade-in">

          {/* STEP PROGRESS */}
          <div className="flex items-center justify-between">
            {steps.map((step, i) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  <div className={`step-dot ${
                    i < currentStepIndex ? 'done' : i === currentStepIndex ? 'active' : ''
                  }`}>
                    {i < currentStepIndex ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium ${
                    i === currentStepIndex ? 'text-green-700' : 'text-stone-400'
                  }`}>
                    {stepLabels[i]}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 rounded ${
                    i < currentStepIndex ? 'bg-green-400' : 'bg-stone-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* ERROR */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2 fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* ================================================= */}
          {/* STEP 1: VOTER ID */}
          {/* ================================================= */}
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
                  placeholder={isTamil ? 'எ.கா. TNL1029384' : 'e.g. TNL1029384'}
                  maxLength={10}
                  className="block w-full px-3 py-2.5 text-sm uppercase tracking-wider font-mono border border-stone-300 rounded-lg text-stone-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyVoterId()}
                />
                <span className="text-[11px] text-stone-400 mt-1 block">
                  {isTamil ? '10-இலக்க EPIC எண்ணை உள்ளிடவும்' : 'Enter your 10-character EPIC number'}
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

          {/* ================================================= */}
          {/* STEP 2: PHONE ENTRY */}
          {/* ================================================= */}
          {flowStage === 'PHONE_ENTRY' && (
            <div className="space-y-4 fade-in">
              {/* Electoral verification badge */}
              <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-xs">
                <div className="text-[10px] font-bold text-green-800 uppercase flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isTamil ? 'வாக்காளர் தகுதி உறுதி' : 'Electoral Eligibility Verified'}</span>
                </div>
                <div className="font-bold text-stone-900 mt-1">
                  {verifiedElectoralRecord?.fullNameMasked || (isTamil ? 'பதிவுசெய்யப்பட்ட வாக்காளர்' : 'Registered Citizen')}
                </div>
                <div className="text-[11px] text-stone-500">
                  {isTamil ? 'தொகுதி:' : 'Constituency:'}{' '}
                  {verifiedElectoralRecord?.constituency || 'Central Chennai'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  {isTamil ? 'பதிவுசெய்யப்பட்ட மொபைல் எண்' : 'Registered Mobile Number'}
                </label>
                <div className="flex items-center border border-stone-300 rounded-lg overflow-hidden focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-200 transition-all">
                  <span className="px-3 py-2.5 bg-stone-50 text-stone-500 text-sm font-mono border-r border-stone-300">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98765 43210"
                    className="flex-1 px-3 py-2.5 text-sm font-mono tracking-widest text-stone-900 bg-white outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                  />
                </div>
                <span className="text-[10px] text-stone-400 mt-1 block">
                  {isTamil
                    ? 'OTP உங்கள் பதிவுசெய்யப்பட்ட மொபைல் எண்ணுக்கு அனுப்பப்படும்'
                    : 'OTP will be sent to your registered mobile number via SMS'}
                </span>
              </div>

              {/* CONSENT */}
              <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <input
                  type="checkbox"
                  id="voterConsent"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="w-4 h-4 text-green-600 rounded mt-0.5 cursor-pointer"
                />
                <label htmlFor="voterConsent" className="text-[11px] text-stone-700 cursor-pointer leading-relaxed">
                  {isTamil
                    ? 'வாக்காளர் அடையாள சரிபார்ப்பிற்காக மட்டுமே என் மொபைல் எண்ணில் OTP அனுப்ப ஒப்புதல் வழங்குகிறேன். என் மொபைல் எண் வேட்பாளர் தேர்வுடன் இணைக்கப்படாது.'
                    : 'I consent to receiving an OTP on my mobile number for voter identity verification only. My mobile number will never be linked to my candidate choice.'}
                </label>
              </div>

              <button
                type="button"
                disabled={loading || !consentGiven}
                onClick={handleSendOtp}
                className="w-full py-3 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isTamil ? 'OTP அனுப்புகிறது...' : 'Sending OTP...'}</span>
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4" />
                    <span>{isTamil ? 'மொபைல் OTP அனுப்பவும்' : 'Send OTP to Mobile'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setFlowStage('VOTER_ID'); setErrorMessage(null); }}
                className="w-full text-[11px] text-stone-500 hover:text-stone-700 hover:underline transition-colors"
              >
                ← {isTamil ? 'அடையாள அட்டைக்கு திரும்பு' : 'Back to Voter ID'}
              </button>
            </div>
          )}

          {/* ================================================= */}
          {/* STEP 3: OTP ENTRY */}
          {/* ================================================= */}
          {flowStage === 'OTP_ENTRY' && (
            <div className="space-y-4 fade-in">
              <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-xs">
                <div className="text-green-800 font-semibold flex items-center space-x-1.5">
                  <KeyRound className="w-4 h-4" />
                  <span>{isTamil ? 'OTP அனுப்பப்பட்டது' : 'OTP Sent Successfully'}</span>
                </div>
                <div className="text-[10px] font-mono text-stone-500 mt-1">
                  {isTamil ? 'பரிவர்த்தனை ID:' : 'Transaction ID:'} {otpTxId}
                </div>
                {countdown > 0 && (
                  <div className="mt-1.5 text-[11px] text-amber-700 font-semibold">
                    {isTamil ? `${countdown} விநாடிகளில் காலாவதியாகும்` : `Expires in ${countdown}s`}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  {isTamil ? '6-இலக்க OTP உள்ளிடவும்' : 'Enter 6-Digit OTP'}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  className="block w-full px-4 py-3 text-xl font-mono tracking-[0.4em] text-center border border-stone-300 rounded-lg text-stone-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors font-bold"
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                />
                <span className="text-[10px] text-stone-400 mt-1 block text-center">
                  {isTamil
                    ? 'SMS மூலம் பெறப்பட்ட 6-இலக்க OTP-ஐ உள்ளிடவும்'
                    : 'Enter the 6-digit OTP received via SMS'}
                </span>
              </div>

              <button
                type="button"
                disabled={loading || otpInput.length !== 6}
                onClick={handleVerifyOtp}
                className="w-full py-3 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isTamil ? 'சரிபார்க்கிறது...' : 'Verifying...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isTamil ? 'OTP சரிபார்க்கவும்' : 'Verify OTP & Authenticate'}</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setFlowStage('PHONE_ENTRY'); setErrorMessage(null); setOtpInput(''); }}
                  className="text-[11px] text-stone-500 hover:text-stone-700 hover:underline"
                >
                  ← {isTamil ? 'மொபைல் மாற்று' : 'Change Mobile'}
                </button>
                {countdown === 0 && (
                  <button
                    type="button"
                    onClick={() => { setFlowStage('PHONE_ENTRY'); setErrorMessage(null); setOtpInput(''); }}
                    className="text-[11px] text-amber-600 hover:text-amber-800 font-semibold hover:underline"
                  >
                    {isTamil ? 'மீண்டும் OTP கோரவும்' : 'Resend OTP'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* STEP 4: AUTH SUCCESS */}
          {/* ================================================= */}
          {flowStage === 'AUTH_SUCCESS' && (
            <div className="space-y-5 fade-in">
              <div className="text-center py-2">
                <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 mx-auto flex items-center justify-center mb-3 shadow-sm">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-base font-extrabold text-stone-900">
                  {isTamil ? 'அங்கீகாரம் வெற்றிகரம்' : 'Authentication Successful'}
                </h3>
              </div>

              {/* SUCCESS CHECKLIST */}
              <div className="p-4 rounded-2xl bg-green-50 border-2 border-green-400 space-y-2.5 text-xs">
                {[
                  isTamil ? '✓ மொபைல் OTP அங்கீகாரம் வெற்றிகரம்' : '✓ Mobile OTP authentication successful',
                  isTamil ? '✓ வாக்காளர் தகுதி உறுதிசெய்யப்பட்டது' : '✓ Electoral eligibility verified',
                  isTamil ? '✓ ஒரே முறை வாக்களிப்பு டோக்கன் வழங்கப்பட்டது' : '✓ One-time voting credential issued',
                ].map((item, i) => (
                  <div key={i} className="flex items-center space-x-2 font-bold text-green-900">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* PRIVACY NOTE */}
              <div className="p-3 bg-amber-50 rounded-xl text-[11px] text-amber-950 border border-amber-200 flex items-start space-x-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  {isTamil
                    ? 'உங்கள் அடையாளம் வாக்குச்சீட்டிலிருந்து முழுமையாக பிரிக்கப்பட்டுள்ளது. அநாமதேய கிரிப்டோகிராபிக் டோக்கன் மட்டுமே வழங்கப்பட்டது.'
                    : 'Your identity is fully separated from your ballot. Only an anonymous cryptographic token is issued — zero linkage enforced.'}
                </span>
              </div>

              {/* CONTINUE */}
              <button
                type="button"
                onClick={handleContinueToVote}
                className="w-full py-3.5 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-extrabold flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all"
              >
                <span>{isTamil ? 'வாக்களிப்பு தொடர்க' : 'Continue to Vote'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};