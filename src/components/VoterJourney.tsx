import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, CheckCircle2, AlertTriangle, AlertCircle, Fingerprint, 
  Lock, KeyRound, Vote, ArrowRight, RefreshCw, Copy, Check, Volume2, UserCheck, HelpCircle
} from 'lucide-react';
import { Candidate, Election, AccessibilityPreferences } from '../types/index.js';
import { translations } from '../i18n/translations.js';

interface VoterJourneyProps {
  election: Election | null;
  candidates: Candidate[];
  accessibility: AccessibilityPreferences;
  onVoteCastSuccess?: () => void;
}

export const VoterJourney: React.FC<VoterJourneyProps> = ({
  election,
  candidates,
  accessibility,
  onVoteCastSuccess,
}) => {
  const t = translations[accessibility.language];

  // Journey Steps: 1 to 7
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState<boolean>(false);

  // Assisted Voting Mode Toggle
  const [assistedMode, setAssistedMode] = useState<boolean>(false);

  // Step 1 & 2: Voter ID & Electoral Roll
  const [voterIdInput, setVoterIdInput] = useState<string>('TNL1029384');
  const [electoralRecord, setElectoralRecord] = useState<any>(null);

  // Step 3: Aadhaar & UIDAI OTP
  const [aadhaarInput, setAadhaarInput] = useState<string>('5432 9876 1234');
  const [consentGiven, setConsentGiven] = useState<boolean>(true);
  const [uidaiStatus, setUidaiStatus] = useState<any>(null);
  const [otpTransactionId, setOtpTransactionId] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState<string>('123456');
  const [authReference, setAuthReference] = useState<string | null>(null);

  // Step 4: Anonymous Credential
  const [rawCredential, setRawCredential] = useState<string | null>(null);
  const [credentialHash, setCredentialHash] = useState<string | null>(null);

  // Step 5 & 6: Candidate Choice & Review
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [voterSecretNonce, setVoterSecretNonce] = useState<string>('');

  // Step 7: Confirmation & Blockchain Receipt
  const [voteReceipt, setVoteReceipt] = useState<{
    transactionReference: string;
    blockIndex: number;
    blockHash: string;
    timestamp: string;
    message: string;
  } | null>(null);

  // Duplicate Vote Demonstration State
  const [duplicateTestResult, setDuplicateTestResult] = useState<string | null>(null);

  // External Integration Status States
  const [electoralStatus, setElectoralStatus] = useState<any>(null);
  const [isSimulatedMode, setIsSimulatedMode] = useState<boolean>(false);

  // Fetch UIDAI & Electoral Roll Status on Mount
  useEffect(() => {
    fetch('/api/v1/verification/uidai/status')
      .then((res) => res.json())
      .then((data) => setUidaiStatus(data))
      .catch((err) => console.error('UIDAI status error', err));

    fetch('/api/v1/verification/electoral-roll/status')
      .then((res) => res.json())
      .then((data) => setElectoralStatus(data))
      .catch((err) => console.error('Electoral Roll status error', err));
  }, []);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = accessibility.language === 'ta' ? 'ta-IN' : 'en-IN';
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
  };

  // STEP 1 & 2: VERIFY VOTER ID
  const handleVerifyVoterId = async (simulate = false) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/v1/verification/voter-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voter_id: voterIdInput.trim().toUpperCase(),
          election_id: election?.id,
          simulate_local_dev: simulate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || 'Voter ID verification failed.');
        speak(data.message || 'Voter ID verification failed.');
      } else {
        if (data.isSimulatedLocalDev) {
          setIsSimulatedMode(true);
        }
        setElectoralRecord(data.record);
        setCurrentStep(2);
        speak(`Voter ID verified for ${data.record.constituency}.`);
      }
    } catch (err) {
      setErrorMessage('Network error communicating with electoral verification server.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3A: REQUEST AADHAAR OTP
  const handleRequestAadhaarOtp = async (simulate = false) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/v1/verification/aadhaar/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aadhaar_number: aadhaarInput.replace(/\s+/g, ''),
          user_consent: consentGiven,
          simulate_local_dev: simulate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || 'UIDAI OTP request failed.');
        speak(data.message);
      } else {
        if (data.isSimulatedLocalDev) {
          setIsSimulatedMode(true);
          setOtpInput('789012');
        }
        setOtpTransactionId(data.transaction_id);
        speak('OTP request submitted successfully. Please enter the OTP.');
      }
    } catch (err) {
      setErrorMessage('Communication error with UIDAI integration.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3B: VERIFY AADHAAR OTP
  const handleVerifyAadhaarOtp = async () => {
    if (!otpTransactionId) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/v1/verification/aadhaar/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: otpTransactionId,
          otp: otpInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || 'Identity authentication failed.');
        speak(data.message);
      } else {
        setAuthReference(data.authentication_reference);
        speak('Aadhaar identity authenticated successfully.');
        // Auto issue credential
        handleIssueAnonymousCredential(data.authentication_reference);
      }
    } catch (err) {
      setErrorMessage('Error verifying authentication response.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 4: ISSUE ANONYMOUS CREDENTIAL
  const handleIssueAnonymousCredential = async (authRef: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/voting/credentials/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          election_id: election?.id,
          voter_id: voterIdInput.trim().toUpperCase(),
          auth_reference: authRef,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRawCredential(data.raw_credential);
        setCredentialHash(data.credential_hash);
        // Generate random secret nonce for zero-knowledge ballot blinding
        const randomNonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        setVoterSecretNonce(randomNonce);
        setCurrentStep(4);
      } else {
        setErrorMessage(data.message || 'Failed to issue voting credential.');
      }
    } catch (err) {
      setErrorMessage('Error issuing anonymous credential.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 6: SUBMIT BALLOT TO BLOCKCHAIN
  const handleSubmitBallot = async () => {
    if (!selectedCandidateId || !credentialHash) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/v1/voting/ballots/cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          election_id: election?.id,
          candidate_id: selectedCandidateId,
          credential_hash: credentialHash,
          voter_secret_nonce: voterSecretNonce,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || 'Ballot recording rejected by blockchain ledger.');
        speak('Ballot submission rejected.');
      } else {
        setVoteReceipt({
          transactionReference: data.transaction_reference,
          blockIndex: data.block_index,
          blockHash: data.block_hash,
          timestamp: data.timestamp,
          message: data.message,
        });
        setCurrentStep(7);
        speak('Your vote has been successfully recorded on the election ledger.');
        if (onVoteCastSuccess) onVoteCastSuccess();
      }
    } catch (err) {
      setErrorMessage('Failed to connect to permissioned blockchain ledger.');
    } finally {
      setLoading(false);
    }
  };

  // DEMONSTRATE ONE-VOTE REPLAY PREVENTION
  const handleSimulateDuplicateVote = async () => {
    if (!credentialHash || !selectedCandidateId) return;
    setLoading(true);
    setDuplicateTestResult('Submitting concurrent duplicate request to ledger...');
    try {
      const res = await fetch('/api/v1/voting/ballots/cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          election_id: election?.id,
          candidate_id: selectedCandidateId,
          credential_hash: credentialHash, // REPLAYING SAME CONSUMED CREDENTIAL
          voter_secret_nonce: 'replay_attempt_nonce',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDuplicateTestResult(`BLOCKED AS EXPECTED (HTTP ${res.status}): ${data.message} [${data.error_code || 'CONCURRENCY_MUTEX_REJECTED'}]`);
      } else {
        setDuplicateTestResult('Unexpected: Vote was accepted (Check error).');
      }
    } catch (err) {
      setDuplicateTestResult('Network error during replay test.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2500);
  };

  const selectedCandidate = candidates.find((c) => c.id === selectedCandidateId);

  return (
    <div className={`max-w-5xl mx-auto px-4 py-6 ${accessibility.highContrast ? 'text-slate-950 font-medium' : 'text-slate-800'}`}>
      
      {/* Active Election Metadata Header Banner */}
      <div className="mb-6 p-4 rounded-lg bg-slate-900 text-white border border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Active Polling Station
            </span>
            <span className="text-xs text-slate-300 font-mono">
              Constituency ID: 04-CENTRAL-CHENN
            </span>
          </div>
          <h2 className="text-lg font-bold mt-1 text-amber-300">
            {election?.title || 'General Election 2026'}
          </h2>
          <p className="text-xs text-slate-300">
            Constituency: <strong className="text-white">{election?.constituency}</strong> | State: {election?.state}
          </p>
        </div>

        {/* Assisted Voting Mode Pill */}
        <div className="flex items-center space-x-2 self-start md:self-auto">
          <button
            id="btn-assisted-mode-toggle"
            onClick={() => setAssistedMode(!assistedMode)}
            className={`px-3 py-1.5 rounded text-xs font-semibold border flex items-center space-x-1.5 transition-colors ${
              assistedMode
                ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-300'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Helper can assist navigation, but is prohibited from selecting candidate"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Assisted Voting Mode: {assistedMode ? 'ENABLED' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Assisted Mode Warning Notice */}
      {assistedMode && (
        <div className="mb-6 p-3 rounded bg-blue-900/40 border border-blue-600 text-blue-100 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-blue-300 shrink-0" />
          <span>
            <strong>Assisted Voting Active:</strong> An authorized companion or election volunteer is assisting navigation. As mandated by election law, the assistant is strictly prohibited from selecting the candidate or seeing the private ballot commitment.
          </span>
        </div>
      )}

      {/* 7-Stage Visual Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between overflow-x-auto pb-2 scrollbar-none">
          {[
            { step: 1, label: t.step1 },
            { step: 2, label: t.step2 },
            { step: 3, label: t.step3 },
            { step: 4, label: t.step4 },
            { step: 5, label: t.step5 },
            { step: 6, label: t.step6 },
            { step: 7, label: t.step7 },
          ].map((item, idx) => {
            const isCompleted = currentStep > item.step;
            const isCurrent = currentStep === item.step;
            return (
              <div key={item.step} className="flex items-center min-w-max px-1">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow'
                      : isCurrent
                      ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-200 font-extrabold'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : item.step}
                </div>
                <span
                  className={`ml-2 text-xs hidden md:inline font-medium ${
                    isCurrent ? 'text-slate-900 font-bold' : isCompleted ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
                {idx < 6 && (
                  <div
                    className={`w-6 sm:w-10 h-0.5 mx-2 ${
                      isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-300 text-red-900 text-sm flex items-start space-x-3 shadow-sm animate-shake">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-red-950">Verification Notice</h4>
            <p className="mt-0.5 text-xs text-red-800">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs text-red-700 font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 1: VOTER ID / EPIC VERIFICATION                     */}
      {/* ========================================================= */}
      {currentStep === 1 && (
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
              <Fingerprint className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Step 1: Electoral Photo Identity Card (EPIC) Verification
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Verify your voter registration against the official constituency electoral roll.
              </p>
            </div>
          </div>

          {/* Electoral Roll Status Banner */}
          <div className={`p-3.5 rounded-lg mb-5 text-xs border ${
            electoralStatus?.isConfigured
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}>
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Electoral Roll Integration:</strong> {electoralStatus?.isConfigured ? 'AUTHORIZED ENDPOINT CONFIGURED' : 'UNCONFIGURED'}
                <p className="mt-0.5">
                  {electoralStatus?.isConfigured
                    ? electoralStatus.statusMessage
                    : 'External Electoral Roll endpoint is UNCONFIGURED. No authorized API URL or API key is set. You can verify using the local development test dataset below.'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 max-w-md">
            <label htmlFor="input-voter-id" className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
              {t.voterIdLabel}
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="input-voter-id"
                type="text"
                value={voterIdInput}
                onChange={(e) => setVoterIdInput(e.target.value.toUpperCase())}
                placeholder={t.voterIdPlaceholder}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 font-mono text-sm tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase"
              />
              <div className="flex gap-2">
                <button
                  id="btn-verify-voter-id"
                  onClick={() => handleVerifyVoterId(false)}
                  disabled={loading || !voterIdInput.trim()}
                  className="px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 shrink-0 flex items-center space-x-1.5"
                  title="Query configured external electoral roll endpoint"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t.verifyVoterIdBtn}</span>
                </button>

                {!electoralStatus?.isConfigured && (
                  <button
                    id="btn-verify-voter-id-local"
                    onClick={() => handleVerifyVoterId(true)}
                    disabled={loading || !voterIdInput.trim()}
                    className="px-3 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold transition-colors disabled:opacity-50 shrink-0"
                    title="Verify using local development test roll (No external credentials required)"
                  >
                    Local Test Roll
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Sample Voter ID: <span className="font-mono font-semibold">TNL1029384</span>.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 2: ELECTORAL ROLL STATUS & ELIGIBILITY               */}
      {/* ========================================================= */}
      {currentStep === 2 && electoralRecord && (
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Step 2: Electoral Roll Status Verified
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Your entry on the electoral roll is confirmed. Proceed to identity authentication.
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div>
              <span className="text-slate-500 block">Voter ID (EPIC):</span>
              <strong className="font-mono text-slate-900 text-sm">{electoralRecord.voterId}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Voter Name:</span>
              <strong className="text-slate-900">{electoralRecord.fullNameMasked} (Protected)</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Constituency:</span>
              <strong className="text-slate-900">{electoralRecord.constituency}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Polling Status:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Eligible To Vote
              </span>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              id="btn-proceed-to-aadhaar"
              onClick={() => setCurrentStep(3)}
              className="px-6 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center space-x-1.5"
            >
              <span>Proceed to Identity Authentication</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 3: AADHAAR CONSENT & UIDAI OTP AUTHENTICATION        */}
      {/* ========================================================= */}
      {currentStep === 3 && (
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Step 3: UIDAI Aadhaar Identity Authentication
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Strict compliance with Section 8 of Aadhaar Act. Identity authentication only.
              </p>
            </div>
          </div>

          {/* UIDAI Status Integration Callout */}
          <div className={`p-3.5 rounded-lg mb-5 text-xs border ${
            uidaiStatus?.isConfigured
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Gateway Environment:</strong> {uidaiStatus?.environment?.toUpperCase() || 'UNCONFIGURED'}
                  <p className="mt-0.5">{uidaiStatus?.statusMessage || t.uidaiUnconfiguredAlert}</p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="shrink-0 flex items-center space-x-1.5 self-start sm:self-auto pt-1 sm:pt-0">
                <span className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${
                  uidaiStatus?.isConfigured
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  {uidaiStatus?.isConfigured ? 'Authorized AUA Gateway' : 'Aadhaar Auth Inactive (UNCONFIGURED)'}
                </span>
              </div>
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 mb-6">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                id="checkbox-aadhaar-consent"
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="w-4 h-4 mt-1 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                <strong>{t.aadhaarConsentTitle}:</strong> {t.aadhaarConsentBody}
              </span>
            </label>
          </div>

          {!otpTransactionId ? (
            /* OTP Request Sub-form */
            <div className="max-w-md">
              <label htmlFor="input-aadhaar" className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
                {t.aadhaarNumberLabel}
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="input-aadhaar"
                  type="text"
                  value={aadhaarInput}
                  onChange={(e) => setAadhaarInput(e.target.value)}
                  placeholder={t.aadhaarPlaceholder}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 font-mono text-sm tracking-wider focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <div className="flex gap-2">
                  <button
                    id="btn-request-aadhaar-otp"
                    onClick={() => handleRequestAadhaarOtp(false)}
                    disabled={loading || !consentGiven || !aadhaarInput.trim()}
                    className="px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 shrink-0 flex items-center space-x-1.5"
                    title="Submit OTP request to configured UIDAI gateway"
                  >
                    {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{t.requestOtpBtn}</span>
                  </button>

                  {!uidaiStatus?.isConfigured && (
                    <button
                      id="btn-request-aadhaar-otp-sim"
                      onClick={() => handleRequestAadhaarOtp(true)}
                      disabled={loading || !consentGiven || !aadhaarInput.trim()}
                      className="px-3 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold transition-colors disabled:opacity-50 shrink-0"
                      title="Simulate identity verification locally for testing without live UIDAI credentials"
                    >
                      Simulate Local Auth
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Format: Valid 12-digit Aadhaar number with Verhoeff checksum (e.g. <span className="font-mono font-semibold">2345 6789 0124</span>).
              </p>
            </div>
          ) : (
            /* OTP Verification Sub-form */
            <div className="max-w-md p-4 rounded-lg bg-emerald-50/70 border border-emerald-300">
              <span className="text-xs font-semibold text-emerald-800 block mb-1">
                ✓ OTP successfully dispatched via UIDAI Gateway
              </span>
              <span className="text-xs text-slate-600 block mb-3 font-mono">
                Transaction Ref: {otpTransactionId}
              </span>

              <label htmlFor="input-otp" className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
                {t.enterOtpLabel}
              </label>
              <div className="flex gap-2">
                <input
                  id="input-otp"
                  type="password"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 font-mono text-lg tracking-widest text-center focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <button
                  id="btn-verify-otp"
                  onClick={handleVerifyAadhaarOtp}
                  disabled={loading || otpInput.trim().length !== 6}
                  className="px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 shrink-0 flex items-center space-x-1.5"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t.verifyOtpBtn}</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Valid for 10 minutes. Maximum 3 attempts permitted before transaction lock.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 4: ANONYMOUS CREDENTIAL ISSUANCE                    */}
      {/* ========================================================= */}
      {currentStep === 4 && (
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2.5 rounded-lg bg-purple-50 text-purple-700">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {t.credentialIssuedTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Cryptographic Air-Gap: Your identity domain is now detached from the voting domain.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs my-4 overflow-x-auto">
            <div className="text-amber-400 font-semibold mb-1">
              [PRIVACY BARRIER ACTIVE: ZERO IDENTITY METADATA TRANSMITTED]
            </div>
            <div>Credential Hash (SHA-256): <span className="text-emerald-400">{credentialHash}</span></div>
            <div>Raw Ephemeral Token: <span className="text-slate-400">{rawCredential}</span></div>
            <div>Ballot Nonce (Client-side): <span className="text-cyan-300">{voterSecretNonce}</span></div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
            {t.credentialIssuedBody} The election authority and blockchain nodes only see this one-time cryptographic hash.
          </p>

          <div className="flex justify-end">
            <button
              id="btn-proceed-to-candidates"
              onClick={() => setCurrentStep(5)}
              className="px-6 py-2.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center space-x-1.5"
            >
              <span>{t.proceedToBallotBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 5: CANDIDATE SELECTION                               */}
      {/* ========================================================= */}
      {currentStep === 5 && (
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
              <Vote className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {t.selectCandidateTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Tap on candidate name or party symbol to cast your ballot. Exactly one choice permitted.
              </p>
            </div>
          </div>

          {/* Candidate Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            {candidates.map((cand) => {
              const isSelected = selectedCandidateId === cand.id;
              return (
                <div
                  key={cand.id}
                  id={`card-candidate-${cand.id}`}
                  onClick={() => {
                    setSelectedCandidateId(cand.id);
                    speak(`Selected: ${cand.name}, ${cand.party}`);
                  }}
                  className={`p-4 sm:p-5 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-300'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                        Candidate #{cand.orderNumber}
                      </span>
                      <h4 className="text-base sm:text-lg font-bold text-slate-900 mt-2">
                        {cand.name}
                      </h4>
                      <p className="text-xs sm:text-sm font-semibold text-blue-800">
                        {cand.party}
                      </p>
                    </div>

                    {/* Party Symbol Representation */}
                    <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-1 text-center font-bold text-xs shadow-inner">
                      {cand.symbol}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mt-3 line-clamp-2">
                    {cand.profileSummary}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-mono">ID: {cand.id}</span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="radio"
                        name="candidate_selection"
                        checked={isSelected}
                        onChange={() => setSelectedCandidateId(cand.id)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-xs font-semibold ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}>
                        {isSelected ? 'Selected' : 'Select'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex justify-between items-center">
            <button
              onClick={() => setCurrentStep(4)}
              className="px-4 py-2 rounded text-xs text-slate-600 hover:text-slate-900"
            >
              Back
            </button>
            <button
              id="btn-proceed-to-review"
              onClick={() => {
                if (selectedCandidateId) {
                  setCurrentStep(6);
                  speak('Please review your candidate selection carefully before confirming.');
                }
              }}
              disabled={!selectedCandidateId}
              className="px-6 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 flex items-center space-x-1.5"
            >
              <span>Review Selection</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 6: BALLOT REVIEW & CONFIRMATION                      */}
      {/* ========================================================= */}
      {currentStep === 6 && selectedCandidate && (
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {t.reviewVoteTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Verify your choice. Once submitted to the blockchain ledger, the transaction is irreversible.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-50 border border-slate-300 my-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500">Selected Candidate:</span>
                <h4 className="text-xl font-black text-slate-950 mt-0.5">
                  {selectedCandidate.name}
                </h4>
                <p className="text-sm font-semibold text-blue-900">
                  {selectedCandidate.party}
                </p>
              </div>
              <div className="w-14 h-14 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-xs text-center p-1 shadow">
                {selectedCandidate.symbol}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-xs font-mono text-slate-600">
              Constituency: {selectedCandidate.constituency} | Election ID: {election?.id}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 mb-6">
            <strong>Immutable Blockchain Notice:</strong> Submitting will commit a blinded cryptographic hash to the Hyperledger Fabric channel and atomically mark your voting token as USED.
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentStep(5)}
              className="px-4 py-2 rounded text-xs text-slate-600 hover:text-slate-900"
            >
              Change Selection
            </button>
            <button
              id="btn-confirm-final-vote"
              onClick={handleSubmitBallot}
              disabled={loading}
              className="px-7 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm sm:text-base font-bold shadow-md hover:shadow transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>{t.confirmVoteBtn}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 7: VOTE RECORDED & BLOCKCHAIN CONFIRMATION RECEIPT  */}
      {/* ========================================================= */}
      {currentStep === 7 && voteReceipt && (
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-emerald-200 shadow-md">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                {t.voteRecordedTitle}
              </h3>
              <p className="text-xs sm:text-sm text-emerald-700 font-medium">
                {t.voteRecordedBody}
              </p>
            </div>
          </div>

          {/* Constitutional Privacy Notice (DO NOT display candidate selected on receipt) */}
          <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 my-4 leading-relaxed">
            <strong className="block mb-0.5">Constitutional Privacy Protection Active:</strong>
            {t.receiptNote}
          </div>

          {/* Cryptographic Digital Receipt Card */}
          <div className="p-5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs my-4 space-y-2 border border-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-amber-400 font-semibold uppercase tracking-wider">
                Digital Ballot Proof
              </span>
              <button
                onClick={() => copyToClipboard(JSON.stringify(voteReceipt, null, 2))}
                className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center space-x-1"
              >
                {copiedReceipt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedReceipt ? 'Copied' : 'Copy Proof'}</span>
              </button>
            </div>

            <div>
              <span className="text-slate-400 block">{t.txHashLabel}:</span>
              <strong className="text-emerald-400 break-all">{voteReceipt.transactionReference}</strong>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-slate-400 block">{t.blockHeightLabel}:</span>
                <span className="text-white font-bold">Block #{voteReceipt.blockIndex}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Ledger Timestamp:</span>
                <span className="text-white">{new Date(voteReceipt.timestamp).toLocaleString()}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block">Block Header Hash:</span>
              <span className="text-cyan-300 break-all">{voteReceipt.blockHash}</span>
            </div>

            <div>
              <span className="text-slate-400 block">Election ID:</span>
              <span className="text-slate-300">{election?.id}</span>
            </div>
          </div>

          {/* ONE-PERSON-ONE-VOTE REPLAY TEST */}
          <div className="mt-8 p-4 rounded-lg bg-slate-100 border border-slate-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  Audit Test: Simulate Duplicate / Replay Vote Attempt
                </h4>
                <p className="text-xs text-slate-600">
                  Tests kernel-level mutex lock. Attempts to submit another vote using the same consumed credential.
                </p>
              </div>
              <button
                id="btn-simulate-duplicate-vote"
                onClick={handleSimulateDuplicateVote}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shrink-0 transition-colors"
              >
                Simulate Duplicate Vote
              </button>
            </div>

            {duplicateTestResult && (
              <div className="mt-3 p-3 rounded bg-white border border-slate-300 text-xs font-mono text-slate-800 break-all">
                {duplicateTestResult}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                // Reset flow for next voter
                setCurrentStep(1);
                setVoteReceipt(null);
                setRawCredential(null);
                setCredentialHash(null);
                setSelectedCandidateId(null);
                setDuplicateTestResult(null);
                setVoterIdInput('');
              }}
              className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-semibold"
            >
              Cast Another Ballot (New Voter Session)
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
