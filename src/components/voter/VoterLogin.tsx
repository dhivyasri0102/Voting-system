import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Vote, ShieldCheck, ArrowLeft, CheckCircle2, AlertCircle, 
  KeyRound, Lock, Globe, Info, ArrowRight, RefreshCw, Settings2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const VoterLogin: React.FC = () => {
  const navigate = useNavigate();
  const { loginVoter, accessibility, toggleLanguage } = useAuth();
  const isTamil = accessibility.language === 'ta';

  // Sub-stages in voter flow:
  // 1. Voter ID entry & Electoral roll verification
  // 2. Aadhaar number entry, consent & [ Send OTP ]
  // 3. Enter OTP & [ Verify OTP ]
  // 4. Authentication success summary (✓ Aadhaar authenticated, ✓ Eligibility verified, ✓ One-time token issued) -> [ → Continue to Vote ]
  const [flowStage, setFlowStage] = useState<'VOTER_ID' | 'AADHAAR_ENTRY' | 'OTP_ENTRY' | 'AUTH_SUCCESS'>('VOTER_ID');

  // Input states
  const [voterIdInput, setVoterIdInput] = useState<string>('TNL1029384');
  const [aadhaarInput, setAadhaarInput] = useState<string>('5432 9876 1238');
  const [consentGiven, setConsentGiven] = useState<boolean>(true);
  const [otpInput, setOtpInput] = useState<string>('123456');

  // API response states
  const [otpTxId, setOtpTxId] = useState<string | null>(null);
  const [authReference, setAuthReference] = useState<string | null>(null);
  const [anonymousToken, setAnonymousToken] = useState<{ raw: string; hash: string } | null>(null);
  const [verifiedElectoralRecord, setVerifiedElectoralRecord] = useState<any>(null);

  // Status & error states
  const [uidaiStatus, setUidaiStatus] = useState<any>(null);
  const [electoralStatus, setElectoralStatus] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [configSuccessMsg, setConfigSuccessMsg] = useState<string | null>(null);

  const fetchStatus = () => {
    fetch('/api/v1/verification/uidai/status')
      .then((res) => res.json())
      .then((data) => setUidaiStatus(data))
      .catch(() => {});

    fetch('/api/v1/verification/electoral-roll/status')
      .then((res) => res.json())
      .then((data) => setElectoralStatus(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Quick helper to toggle official developer/test environment
  const handleToggleUidaiEnv = async (mode: 'developer' | 'unconfigured') => {
    setLoading(true);
    setErrorMessage(null);
    setConfigSuccessMsg(null);
    try {
      const res = await fetch('/api/v1/verification/uidai/environment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      setConfigSuccessMsg(data.message);
      fetchStatus();
    } catch (err) {
      setErrorMessage('Failed to update UIDAI test environment configuration.');
    } finally {
      setLoading(false);
    }
  };

  // STAGE 1: Verify Voter ID (EPIC) & Electoral eligibility
  const handleVerifyVoterId = async () => {
    const trimmed = voterIdInput.trim().toUpperCase();
    if (!trimmed) {
      setErrorMessage(isTamil ? 'வாக்காளர் அடையாள அட்டை எண்ணை உள்ளிடவும்.' : 'Please enter your Voter ID (EPIC).');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/verification/voter-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voter_id: trimmed,
          simulate_local_dev: true, // Electoral roll local development lookup
        }),
      });

      const data = await res.json();
      if (!res.ok || (!data.verified && !data.record)) {
        setErrorMessage(data.message || 'Voter ID verification failed or voter not found in electoral roll.');
      } else {
        setVerifiedElectoralRecord(data.record || data.voter);
        setFlowStage('AADHAAR_ENTRY');
      }
    } catch (err) {
      setErrorMessage('Network error communicating with Electoral Roll service.');
    } finally {
      setLoading(false);
    }
  };

  // STAGE 2: Request Aadhaar OTP via official UIDAI OTP 2.5 API
  const handleSendOtp = async () => {
    if (!consentGiven) {
      setErrorMessage(isTamil ? 'ஆதார் அங்கீகாரத்திற்கு உங்கள் ஒப்புதல் தேவை.' : 'User consent is required to proceed with Aadhaar verification.');
      return;
    }

    const cleanAadhaar = aadhaarInput.replace(/[\s-]+/g, '');
    if (!/^[2-9]\d{11}$/.test(cleanAadhaar)) {
      setErrorMessage(isTamil ? 'சரியான 12-இலக்க ஆதார் எண்ணை உள்ளிடவும்.' : 'Please enter a valid 12-digit Aadhaar number.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // POST /api/v1/verification/aadhaar/otp/request/
      const res = await fetch('/api/v1/verification/aadhaar/otp/request/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aadhaar_number: cleanAadhaar,
          user_consent: consentGiven,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        // If UIDAI is not configured, show exact required text
        if (data.status === 'UNCONFIGURED' || res.status === 503) {
          setErrorMessage('UIDAI Aadhaar authentication is not configured in this environment.');
        } else {
          setErrorMessage(data.message || 'Failed to request OTP from UIDAI.');
        }
      } else {
        setOtpTxId(data.transaction_id);
        setFlowStage('OTP_ENTRY');
      }
    } catch (err) {
      setErrorMessage('Network error communicating with UIDAI Gateway.');
    } finally {
      setLoading(false);
    }
  };

  // STAGE 3: Verify OTP via official UIDAI Auth 2.5 API
  const handleVerifyOtp = async () => {
    if (!otpTxId) {
      setErrorMessage('No active OTP transaction found. Please request OTP first.');
      return;
    }

    const cleanOtp = otpInput.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage(isTamil ? 'சரியான 6-இலக்க OTP-ஐ உள்ளிடவும்.' : 'Please enter a 6-digit numerical OTP.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // POST /api/v1/verification/aadhaar/otp/verify/
      const res = await fetch('/api/v1/verification/aadhaar/otp/verify/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: otpTxId,
          otp: cleanOtp,
          voter_id: voterIdInput.trim().toUpperCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || data.status !== 'AUTHENTICATED') {
        if (data.status === 'UNCONFIGURED' || res.status === 503) {
          setErrorMessage('UIDAI Aadhaar authentication is not configured in this environment.');
        } else {
          setErrorMessage(data.message || 'Aadhaar OTP verification failed.');
        }
      } else {
        // Aadhaar authentication succeeded!
        setAuthReference(data.authentication_reference);

        // Generate anonymous one-time voting credential
        const credRes = await fetch('/api/v1/voting/credentials/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            auth_reference: data.authentication_reference,
            voter_id: voterIdInput.trim().toUpperCase(),
          }),
        });

        const credData = await credRes.json();
        if (!credRes.ok || !credData.credential_hash) {
          setErrorMessage(credData.message || 'Failed to generate anonymous voting credential.');
        } else {
          setAnonymousToken({
            raw: credData.raw_credential,
            hash: credData.credential_hash,
          });
          setFlowStage('AUTH_SUCCESS');
        }
      }
    } catch (err) {
      setErrorMessage('Error verifying authentication against UIDAI Gateway.');
    } finally {
      setLoading(false);
    }
  };

  // STAGE 4: Finalize and Navigate to Voter Dashboard
  const handleContinueToVote = () => {
    if (!anonymousToken || !authReference) return;

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/"
            className="inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isTamil ? 'முகப்புக்கு திரும்பு' : 'Back to Home'}</span>
          </Link>

          <button
            onClick={toggleLanguage}
            className="text-xs text-emerald-700 hover:underline flex items-center space-x-1 font-semibold"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isTamil ? 'English' : 'தமிழ்'}</span>
          </button>
        </div>

        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 shadow-inner">
            <Vote className="w-8 h-8" />
          </div>
        </div>

        <h2 className="mt-4 text-center text-2xl font-extrabold text-slate-900 tracking-tight">
          {isTamil ? 'வாக்காளர் உள்நுழைவு மற்றும் சரிபார்ப்பு' : 'Citizen Voter Authentication'}
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          {isTamil
            ? 'வாக்காளர் அடையாள அட்டை & ஆதார் OTP வழியாக தேர்தல் அங்கீகாரம்'
            : 'Statutory Voter ID (EPIC) & Official UIDAI Aadhaar OTP Verification'}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 sm:px-10 space-y-5">
          
          {/* Progress / Step Breadcrumb */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-[11px] font-bold">
            <span className={flowStage === 'VOTER_ID' ? 'text-emerald-700' : 'text-slate-400'}>
              1. {isTamil ? 'வாக்காளர் அட்டை' : 'Voter ID'}
            </span>
            <span className={flowStage === 'AADHAAR_ENTRY' ? 'text-emerald-700' : 'text-slate-400'}>
              2. {isTamil ? 'ஆதார் எண்' : 'Aadhaar'}
            </span>
            <span className={flowStage === 'OTP_ENTRY' ? 'text-emerald-700' : 'text-slate-400'}>
              3. {isTamil ? 'OTP சரிபார்ப்பு' : 'OTP Verify'}
            </span>
            <span className={flowStage === 'AUTH_SUCCESS' ? 'text-emerald-700' : 'text-slate-400'}>
              4. {isTamil ? 'வாக்களிக்க தொடர்க' : 'Authorization'}
            </span>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Config Message Box */}
          {configSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{configSuccessMsg}</span>
            </div>
          )}

          {/* UIDAI Unconfigured Notice when not configured */}
          {uidaiStatus && !uidaiStatus.isConfigured && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
              <div className="font-bold flex items-center space-x-1.5 text-amber-950">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>UIDAI Aadhaar authentication is not configured in this environment.</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                By statutory rule, voters cannot be authenticated when UIDAI integration is unconfigured.
              </p>
              
              {/* Developer/Testing Sandbox Switch */}
              <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between">
                <span className="text-[10px] text-amber-900 font-semibold">Test Environment:</span>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleToggleUidaiEnv('developer')}
                  className="px-2.5 py-1 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-[10px] flex items-center space-x-1"
                >
                  <Settings2 className="w-3 h-3" />
                  <span>Configure UIDAI Test Environment</span>
                </button>
              </div>
            </div>
          )}

          {/* UIDAI Active Developer Mode Notice */}
          {uidaiStatus && uidaiStatus.isConfigured && (
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-[11px] flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  <strong>UIDAI Gateway Configured:</strong> {uidaiStatus.environment.toUpperCase()} 2.5
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleUidaiEnv('unconfigured')}
                className="text-[10px] text-slate-500 hover:text-red-600 underline ml-2"
                title="Reset to test unconfigured error state"
              >
                Reset
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: VOTER ID & ELECTORAL ROLL CHECK                                  */}
          {/* ========================================================================= */}
          {flowStage === 'VOTER_ID' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  {isTamil ? 'வாக்காளர் அடையாள அட்டை எண் (EPIC)' : 'Voter Identification Number (EPIC)'}
                </label>
                <input
                  type="text"
                  required
                  value={voterIdInput}
                  onChange={(e) => setVoterIdInput(e.target.value)}
                  placeholder="e.g. TNL1029384"
                  className="mt-1 block w-full px-3 py-2 text-sm uppercase tracking-wider font-mono border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Sample pre-registered EPIC: <code className="font-bold text-slate-700">TNL1029384</code>
                </span>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleVerifyVoterId}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center space-x-1"
              >
                <span>{loading ? 'Verifying...' : isTamil ? 'வாக்காளர் பட்டியலை சரிபார்க்க' : 'Verify Voter ID & Eligibility'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: ENTER AADHAAR NUMBER & [ SEND OTP ]                               */}
          {/* ========================================================================= */}
          {flowStage === 'AADHAAR_ENTRY' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="text-[10px] font-bold text-emerald-800 uppercase">
                  ✓ {isTamil ? 'தேர்தல் பட்டியல் சரிபார்க்கப்பட்டது' : 'Electoral Eligibility Verified'}
                </div>
                <div className="font-bold text-slate-900 mt-0.5">
                  {verifiedElectoralRecord?.fullNameMasked || 'Registered Citizen Voter'}
                </div>
                <div className="text-[11px] text-slate-500">
                  Constituency: {verifiedElectoralRecord?.constituency || 'Central Chennai'}
                </div>
              </div>

              {/* Exact Prompt Required Label: Enter Aadhaar Number */}
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  {isTamil ? 'ஆதார் எண்ணை உள்ளிடவும்' : 'Enter Aadhaar Number'}
                </label>
                <input
                  type="text"
                  value={aadhaarInput}
                  onChange={(e) => setAadhaarInput(e.target.value)}
                  placeholder="5432 9876 1238"
                  className="mt-1 block w-full px-3 py-2 text-sm font-mono tracking-widest border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  12-digit UIDAI number (Verhoeff checksum validated)
                </span>
              </div>

              {/* User Consent */}
              <div className="flex items-start space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="voterConsent"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                />
                <label htmlFor="voterConsent" className="text-[11px] text-slate-600 leading-snug">
                  {isTamil
                    ? 'வாக்காளர் சரிபார்ப்புக்காக ஆதார் விதிகளின்படி எனது தகவல்களைப் பயன்படுத்த முழு ஒப்புதல் அளிக்கிறேன்.'
                    : 'I give voluntary consent under Section 8 of the Aadhaar Act to authenticate my electoral identity via UIDAI OTP service.'}
                </label>
              </div>

              {/* Exact Prompt Required Button: [ Send OTP ] */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={loading || !consentGiven}
                  onClick={handleSendOtp}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{loading ? 'Requesting OTP from UIDAI...' : isTamil ? 'OTP அனுப்பவும்' : 'Send OTP'}</span>
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setFlowStage('VOTER_ID')}
                  className="text-[11px] text-slate-500 hover:underline"
                >
                  ← Back to Voter ID
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: ENTER OTP & [ VERIFY OTP ]                                        */}
          {/* ========================================================================= */}
          {flowStage === 'OTP_ENTRY' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs">
                <div className="text-emerald-800 font-semibold">
                  OTP successfully dispatched via UIDAI Gateway.
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">
                  TxID: {otpTxId}
                </div>
                {uidaiStatus?.environment === 'developer' && (
                  <div className="mt-1 text-[11px] text-emerald-900 font-bold">
                    Developer Test Sandbox OTP: <code className="bg-emerald-100 px-1 py-0.5 rounded">123456</code>
                  </div>
                )}
              </div>

              {/* Exact Prompt Required Label: Enter OTP */}
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  {isTamil ? 'OTP எண்ணை உள்ளிடவும்' : 'Enter OTP'}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="123456"
                  className="mt-1 block w-full px-3 py-2 text-base font-mono tracking-widest text-center border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 font-bold"
                />
                <span className="text-[10px] text-slate-500 mt-1 block text-center">
                  6-digit numerical code sent to registered mobile
                </span>
              </div>

              {/* Exact Prompt Required Button: [ Verify OTP ] */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleVerifyOtp}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center space-x-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{loading ? 'Verifying with UIDAI...' : isTamil ? 'OTP சரிபார்க்கவும்' : 'Verify OTP'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <button
                  type="button"
                  onClick={() => setFlowStage('AADHAAR_ENTRY')}
                  className="hover:underline"
                >
                  ← Resend / Change Aadhaar
                </button>
                <span className="text-[10px] text-slate-400">Attempts limited to 3</span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: AUTHENTICATION SUCCESS & AUTHORIZATION SUMMARY                    */}
          {/* ========================================================================= */}
          {flowStage === 'AUTH_SUCCESS' && (
            <div className="space-y-5">
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {isTamil ? 'அங்கீகாரம் வெற்றிகரமாக முடிந்தது' : 'Suffrage Verification Completed'}
                </h3>
              </div>

              {/* Statutory Checklist exactly per prompt requirement */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border-2 border-emerald-500 space-y-3 text-xs">
                {/* 1. ✓ Aadhaar authentication successful */}
                <div className="flex items-center space-x-2.5 font-bold text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>✓ {isTamil ? 'ஆதார் அங்கீகாரம் வெற்றிகரமாக முடிந்தது' : 'Aadhaar authentication successful'}</span>
                </div>

                {/* 2. ✓ Electoral eligibility verified */}
                <div className="flex items-center space-x-2.5 font-bold text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>✓ {isTamil ? 'தேர்தல் தகுதி சரிபார்க்கப்பட்டது' : 'Electoral eligibility verified'}</span>
                </div>

                {/* 3. ✓ One-time voting authorization issued */}
                <div className="flex items-center space-x-2.5 font-bold text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>✓ {isTamil ? 'ஒருமுறை மட்டுமே பயன்படுத்தக்கூடிய வாக்கு டோக்கன் வழங்கப்பட்டது' : 'One-time voting authorization issued'}</span>
                </div>
              </div>

              {/* Zero Linkage Privacy Assurance */}
              <div className="p-3 bg-purple-50 rounded-xl text-[11px] text-purple-950 border border-purple-200 flex items-start space-x-2">
                <Lock className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Zero Identity-Ballot Linkage:</strong> Your Aadhaar identity has been verified and permanently unlinked from the issued anonymous voting token.
                </span>
              </div>

              {/* Exact Prompt Required Action: [ → Continue to Vote ] */}
              <button
                type="button"
                onClick={handleContinueToVote}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-extrabold shadow-md hover:shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2"
              >
                <span>{isTamil ? '→ வாக்களிக்க தொடரவும்' : '→ Continue to Vote'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Footer Navigation Link */}
          <div className="pt-3 border-t border-slate-100 text-center">
            <Link
              to="/admin/login"
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Election Official or Returning Officer? Go to Admin Portal →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
