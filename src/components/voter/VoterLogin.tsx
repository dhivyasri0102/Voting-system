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

  const [authReference, setAuthReference] =
    useState<string | null>(null);

  const [anonymousToken, setAnonymousToken] =
    useState<{ raw: string; hash: string } | null>(null);

  const [verifiedElectoralRecord, setVerifiedElectoralRecord] =
    useState<any>(null);

  const [loading, setLoading] =
    useState<boolean>(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  // ---------------------------------------------------------
  // STEP 1 - VERIFY VOTER ID
  // ---------------------------------------------------------

  const handleVerifyVoterId = async () => {
    const trimmed = voterIdInput.trim().toUpperCase();

    if (!trimmed) {
      setErrorMessage(
        isTamil
          ? 'வாக்காளர் அடையாள அட்டை எண்ணை உள்ளிடவும்.'
          : 'Please enter your Voter ID.'
      );
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/verification/voter-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voter_id: trimmed,
          simulate_local_dev: true,
        }),
      });

      const data = await res.json();

      if (!res.ok || (!data.verified && !data.record)) {
        setErrorMessage(
          data.message ||
            'Voter ID verification failed.'
        );
        return;
      }

      setVerifiedElectoralRecord(
        data.record || data.voter || {
          fullNameMasked: 'Registered Citizen Voter',
          constituency: 'Central Chennai',
          state: 'Tamil Nadu',
        }
      );

      setFlowStage('AADHAAR_ENTRY');
    } catch (error) {
      // Local demo fallback
      setVerifiedElectoralRecord({
        fullNameMasked: 'Registered Citizen Voter',
        constituency: 'Central Chennai',
        state: 'Tamil Nadu',
      });

      setFlowStage('AADHAAR_ENTRY');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // STEP 2 - DEMO OTP REQUEST
  // ---------------------------------------------------------

  const handleSendOtp = async () => {
    if (!consentGiven) {
      setErrorMessage(
        isTamil
          ? 'ஆதார் அங்கீகாரத்திற்கு உங்கள் ஒப்புதல் தேவை.'
          : 'User consent is required to proceed.'
      );
      return;
    }

    const cleanAadhaar =
      aadhaarInput.replace(/[\s-]+/g, '');

    if (!/^[2-9]\d{11}$/.test(cleanAadhaar)) {
      setErrorMessage(
        isTamil
          ? 'சரியான 12-இலக்க ஆதார் எண்ணை உள்ளிடவும்.'
          : 'Please enter a valid 12-digit Aadhaar number.'
      );
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    // DEMO ONLY
    // No real UIDAI request is made.
    setTimeout(() => {
      setOtpTxId(
        'DEMO-TXN-' + Date.now()
      );

      setFlowStage('OTP_ENTRY');

      setLoading(false);
    }, 700);
  };

  // ---------------------------------------------------------
  // STEP 3 - DEMO OTP VERIFICATION
  // ---------------------------------------------------------

  const handleVerifyOtp = async () => {
    if (!otpTxId) {
      setErrorMessage(
        'Please request OTP first.'
      );
      return;
    }

    const cleanOtp = otpInput.trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage(
        isTamil
          ? 'சரியான 6-இலக்க OTP-ஐ உள்ளிடவும்.'
          : 'Please enter a 6-digit OTP.'
      );
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    // DEMO OTP
    if (cleanOtp !== '123456') {
      setErrorMessage(
        isTamil
          ? 'தவறான OTP. 123456 பயன்படுத்தவும்.'
          : 'Invalid OTP. For this demo, use 123456.'
      );

      setLoading(false);
      return;
    }

    // Create demo authentication reference
    const demoAuthReference =
      'DEMO-AUTH-' + Date.now();

    // Create demo anonymous credential
    const demoRawCredential =
      'DEMO-CREDENTIAL-' + Date.now();

    const demoCredentialHash =
      'DEMO-HASH-' + btoa(demoRawCredential);

    setAuthReference(demoAuthReference);

    setAnonymousToken({
      raw: demoRawCredential,
      hash: demoCredentialHash,
    });

    setTimeout(() => {
      setFlowStage('AUTH_SUCCESS');
      setLoading(false);
    }, 700);
  };

  // ---------------------------------------------------------
  // STEP 4 - CONTINUE TO VOTING
  // ---------------------------------------------------------

  const handleContinueToVote = () => {
    if (!anonymousToken || !authReference) {
      setErrorMessage(
        'Authentication information is missing.'
      );
      return;
    }

    loginVoter({
      voterId: voterIdInput.trim().toUpperCase(),

      fullNameMasked:
        verifiedElectoralRecord?.fullNameMasked ||
        'S***** K*****',

      constituency:
        verifiedElectoralRecord?.constituency ||
        'Central Chennai',

      state:
        verifiedElectoralRecord?.state ||
        'Tamil Nadu',

      isRegistered: true,

      hasVoted: false,

      authReference,

      rawCredential:
        anonymousToken.raw,

      credentialHash:
        anonymousToken.hash,
    });

    navigate('/voter/dashboard');
  };

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">

      {/* HEADER */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">

        <div className="flex items-center justify-between mb-4">

          <Link
            to="/"
            className="inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />

            <span>
              {isTamil
                ? 'முகப்புக்கு திரும்பு'
                : 'Back to Home'}
            </span>
          </Link>

          <button
            onClick={toggleLanguage}
            className="text-xs text-emerald-700 hover:underline flex items-center space-x-1 font-semibold"
          >
            <Globe className="w-3.5 h-3.5" />

            <span>
              {isTamil ? 'English' : 'தமிழ்'}
            </span>
          </button>

        </div>

        <div className="flex justify-center">

          <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
            <Vote className="w-8 h-8" />
          </div>

        </div>

        <h2 className="mt-4 text-center text-2xl font-extrabold text-slate-900">
          {isTamil
            ? 'வாக்காளர் உள்நுழைவு மற்றும் சரிபார்ப்பு'
            : 'Citizen Voter Authentication'}
        </h2>

        <p className="mt-1 text-center text-xs text-slate-500">
          Demo / Prototype Voting System
        </p>

      </div>

      {/* MAIN CARD */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">

        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 sm:px-10 space-y-5">

          {/* PROGRESS */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-[11px] font-bold">

            <span
              className={
                flowStage === 'VOTER_ID'
                  ? 'text-emerald-700'
                  : 'text-slate-400'
              }
            >
              1. Voter ID
            </span>

            <span
              className={
                flowStage === 'AADHAAR_ENTRY'
                  ? 'text-emerald-700'
                  : 'text-slate-400'
              }
            >
              2. Aadhaar
            </span>

            <span
              className={
                flowStage === 'OTP_ENTRY'
                  ? 'text-emerald-700'
                  : 'text-slate-400'
              }
            >
              3. OTP
            </span>

            <span
              className={
                flowStage === 'AUTH_SUCCESS'
                  ? 'text-emerald-700'
                  : 'text-slate-400'
              }
            >
              4. Vote
            </span>

          </div>

          {/* ERROR */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2">

              <AlertCircle className="w-4 h-4 shrink-0" />

              <span className="font-medium">
                {errorMessage}
              </span>

            </div>
          )}

          {/* DEMO NOTICE */}
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs">

            <strong>Demo / Prototype</strong>

            <p className="mt-1">
              This system uses mock voter verification and
              demo OTP for project demonstration.
            </p>

          </div>

          {/* ================================================= */}
          {/* STEP 1 */}
          {/* ================================================= */}

          {flowStage === 'VOTER_ID' && (

            <div className="space-y-4">

              <div>

                <label className="block text-xs font-bold text-slate-700">
                  Voter Identification Number (EPIC)
                </label>

                <input
                  type="text"
                  value={voterIdInput}
                  onChange={(e) =>
                    setVoterIdInput(e.target.value)
                  }
                  placeholder="TNL1029384"
                  className="mt-1 block w-full px-3 py-2 text-sm uppercase tracking-wider font-mono border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />

                <span className="text-[11px] text-slate-500 mt-1 block">
                  Demo Voter ID:
                  <strong className="ml-1">
                    TNL1029384
                  </strong>
                </span>

              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleVerifyVoterId}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center space-x-1 disabled:opacity-50"
              >

                <span>
                  {loading
                    ? 'Verifying...'
                    : 'Verify Voter ID & Eligibility'}
                </span>

                <ArrowRight className="w-3.5 h-3.5" />

              </button>

            </div>
          )}

          {/* ================================================= */}
          {/* STEP 2 */}
          {/* ================================================= */}

          {flowStage === 'AADHAAR_ENTRY' && (

            <div className="space-y-4">

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">

                <div className="text-[10px] font-bold text-emerald-800 uppercase">
                  ✓ Electoral Eligibility Verified
                </div>

                <div className="font-bold text-slate-900 mt-1">
                  {verifiedElectoralRecord?.fullNameMasked ||
                    'Registered Citizen Voter'}
                </div>

                <div className="text-[11px] text-slate-500">
                  Constituency:{' '}
                  {verifiedElectoralRecord?.constituency ||
                    'Central Chennai'}
                </div>

              </div>

              <div>

                <label className="block text-xs font-bold text-slate-800">
                  Enter Aadhaar Number
                </label>

                <input
                  type="text"
                  value={aadhaarInput}
                  onChange={(e) =>
                    setAadhaarInput(e.target.value)
                  }
                  placeholder="5432 9876 1238"
                  className="mt-1 block w-full px-3 py-2 text-sm font-mono tracking-widest border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />

                <span className="text-[10px] text-slate-500 mt-1 block">
                  Demo Aadhaar number only
                </span>

              </div>

              {/* CONSENT */}

              <div className="flex items-start space-x-2">

                <input
                  type="checkbox"
                  id="voterConsent"
                  checked={consentGiven}
                  onChange={(e) =>
                    setConsentGiven(e.target.checked)
                  }
                  className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                />

                <label
                  htmlFor="voterConsent"
                  className="text-[11px] text-slate-600"
                >
                  I agree to use this demo authentication
                  process.
                </label>

              </div>

              <button
                type="button"
                disabled={loading || !consentGiven}
                onClick={handleSendOtp}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center space-x-2 disabled:opacity-50"
              >

                <KeyRound className="w-4 h-4" />

                <span>
                  {loading
                    ? 'Sending OTP...'
                    : 'Send OTP'}
                </span>

              </button>

              <button
                type="button"
                onClick={() =>
                  setFlowStage('VOTER_ID')
                }
                className="w-full text-[11px] text-slate-500 hover:underline"
              >
                ← Back to Voter ID
              </button>

            </div>
          )}

          {/* ================================================= */}
          {/* STEP 3 */}
          {/* ================================================= */}

          {flowStage === 'OTP_ENTRY' && (

            <div className="space-y-4">

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">

                <div className="text-emerald-800 font-semibold">
                  OTP successfully generated.
                </div>

                <div className="text-[10px] font-mono text-slate-500 mt-1">
                  Transaction ID: {otpTxId}
                </div>

                <div className="mt-2 text-emerald-900 font-bold">
                  Demo OTP:
                  <code className="ml-1 bg-emerald-100 px-2 py-1 rounded">
                    123456
                  </code>
                </div>

              </div>

              <div>

                <label className="block text-xs font-bold text-slate-800">
                  Enter OTP
                </label>

                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) =>
                    setOtpInput(e.target.value)
                  }
                  placeholder="123456"
                  className="mt-1 block w-full px-3 py-2 text-base font-mono tracking-widest text-center border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 font-bold"
                />

                <span className="text-[10px] text-slate-500 mt-1 block text-center">
                  Enter 123456 for this demo
                </span>

              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleVerifyOtp}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center space-x-2 disabled:opacity-50"
              >

                <ShieldCheck className="w-4 h-4" />

                <span>
                  {loading
                    ? 'Verifying...'
                    : 'Verify OTP'}
                </span>

              </button>

              <button
                type="button"
                onClick={() =>
                  setFlowStage('AADHAAR_ENTRY')
                }
                className="w-full text-[11px] text-slate-500 hover:underline"
              >
                ← Change Aadhaar
              </button>

            </div>
          )}

          {/* ================================================= */}
          {/* STEP 4 */}
          {/* ================================================= */}

          {flowStage === 'AUTH_SUCCESS' && (

            <div className="space-y-5">

              <div className="text-center py-2">

                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-2">

                  <CheckCircle2 className="w-8 h-8" />

                </div>

                <h3 className="text-base font-extrabold text-slate-900">
                  Authentication Successful
                </h3>

              </div>

              {/* SUCCESS CHECKLIST */}

              <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-500 space-y-3 text-xs">

                <div className="flex items-center space-x-2 font-bold text-emerald-950">

                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />

                  <span>
                    ✓ Aadhaar authentication successful
                  </span>

                </div>

                <div className="flex items-center space-x-2 font-bold text-emerald-950">

                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />

                  <span>
                    ✓ Electoral eligibility verified
                  </span>

                </div>

                <div className="flex items-center space-x-2 font-bold text-emerald-950">

                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />

                  <span>
                    ✓ One-time voting authorization issued
                  </span>

                </div>

              </div>

              {/* PRIVACY */}

              <div className="p-3 bg-purple-50 rounded-xl text-[11px] text-purple-950 border border-purple-200 flex items-start space-x-2">

                <Lock className="w-4 h-4 text-purple-700 shrink-0" />

                <span>
                  Demo authentication completed.
                  Voting credentials are represented by
                  anonymous demo tokens.
                </span>

              </div>

              {/* CONTINUE */}

              <button
                type="button"
                onClick={handleContinueToVote}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-extrabold flex items-center justify-center space-x-2"
              >

                <span>
                  → Continue to Vote
                </span>

                <ArrowRight className="w-4 h-4" />

              </button>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};