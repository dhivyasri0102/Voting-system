import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link, useOutletContext } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, AlertCircle, User
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { Candidate, Election } from '../../types/index.js';
import { VoterLayoutContext } from './VoterLayout.js';

export const VoterCandidateSelect: React.FC = () => {
  const { electionId } = useParams<{ electionId: string }>();
  const navigate = useNavigate();
  const { accessibility } = useAuth();
  const { 
    speakText, 
    voiceActive, 
    isTanglish, 
    registerVoiceHandler, 
    unregisterVoiceHandler 
  } = useOutletContext<VoterLayoutContext>();
  const isTamil = accessibility.language === 'ta';

  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch election and candidate details
  useEffect(() => {
    if (!electionId) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/v1/elections/${electionId}`).then((r) => r.json()),
      fetch(`/api/v1/elections/${electionId}/candidates`).then((r) => r.json()),
    ])
      .then(([elecData, candData]) => {
        setElection(elecData);
        // Only active candidates can be voted on
        const activeCandidates = (candData || []).filter(
          (c: Candidate) => c.status !== 'DISABLED'
        );
        setCandidates(activeCandidates);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [electionId]);

  const selectCandidateByIndex = useCallback((index: number) => {
    if (index >= 0 && index < candidates.length) {
      const c = candidates[index];
      setSelectedCandidateId(c.id);
      const msg = isTanglish
        ? `Candidate number ${index + 1}, ${c.name} select aayiduchu. Party ${c.party || 'Independent'}. Next step-ku poga Next nu sollunga.`
        : `Candidate number ${index + 1}, ${c.name} selected. Party ${c.party || 'Independent'}. Say Next to proceed.`;
      speakText(msg, true);
    }
  }, [candidates, isTanglish, speakText]);

  // ✅ BUG FIX: Tamil narration — text is now translated when isTamil is active.
  // Also waits for async voice loading (Chrome returns empty array on first call).
  const speakCandidate = (c: Candidate) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    // Build narration text in the active language
    const text = isTamil
      ? `வேட்பாளர்: ${c.name}. கட்சி: ${c.party || 'சுயேச்சை'}. சின்னம்: ${c.symbol || ''}. ${c.description || ''}`
      : `Candidate: ${c.name}. Party: ${c.party || 'Independent'}. Symbol: ${c.symbol || ''}. ${c.description || ''}`;

    const u = new SpeechSynthesisUtterance(text);
    u.lang = isTamil ? 'ta-IN' : 'en-IN';
    u.rate = isTamil ? 0.85 : 0.95;

    const doSpeak = () => {
      if (isTamil) {
        const voices = window.speechSynthesis.getVoices();
        const tamilVoice = voices.find((v) => v.lang.startsWith('ta'));
        if (tamilVoice) u.voice = tamilVoice;
      }
      window.speechSynthesis.speak(u);
    };

    // Voices may not be loaded yet in Chrome
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      doSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        doSpeak();
      };
    }
  };

  const handleProceedToReview = useCallback(() => {
    if (!selectedCandidateId) {
      const errMsg = isTanglish 
        ? 'Oru candidate-ai select pannunga. Apram Next nu sollunga.' 
        : 'Please select a candidate before proceeding.';
      setErrorMessage(errMsg);
      speakText(errMsg, true);
      return;
    }

    // Save choice temporarily in sessionStorage for ballot review page
    sessionStorage.setItem('evoting_ballot_selection', JSON.stringify({
      electionId,
      candidateId: selectedCandidateId,
    }));

    navigate(`/voter/election/${electionId}/ballot`);
  }, [selectedCandidateId, electionId, navigate, isTanglish, speakText]);

  // Page-entry voice announcement
  const announcedRef = useRef(false);
  useEffect(() => {
    if (!loading && candidates.length > 0 && !announcedRef.current) {
      if (voiceActive || accessibility.speechAssistance || accessibility.seniorCitizenMode) {
        announcedRef.current = true;
        const msg = isTanglish
          ? `Vote panna virumbura candidate-ai select pannunga. Total-aa ${candidates.length} candidates irukaanga. Candidate select panna, Select candidate one, two, illa three nu sollunga. Candidate select pannitu Next nu sollunga.`
          : `Please select your candidate. There are ${candidates.length} candidates available. Say select candidate one, two, or three to pick, then say Next to review.`;
        speakText(msg, true);
      }
    }
  }, [loading, candidates.length, voiceActive, accessibility.speechAssistance, accessibility.seniorCitizenMode, isTanglish, speakText]);

  // Register voice navigation commands
  useEffect(() => {
    const handleVoiceCommand = (cmd: string) => {
      if (cmd === 'NEXT') {
        handleProceedToReview();
      } else if (cmd === 'BACK') {
        navigate('/voter/dashboard');
      } else if (cmd === 'REPEAT') {
        const msg = isTanglish
          ? `Vote panna candidate-ai select pannunga. Select candidate one, two, illa three nu sollunga. Next nu sonnaa review page pogalam.`
          : `Select your candidate. Say select candidate one, two, or three, then say Next to proceed.`;
        speakText(msg, true);
      } else if (cmd === 'SELECT_1') {
        selectCandidateByIndex(0);
      } else if (cmd === 'SELECT_2') {
        selectCandidateByIndex(1);
      } else if (cmd === 'SELECT_3') {
        selectCandidateByIndex(2);
      } else if (cmd === 'SELECT_4') {
        selectCandidateByIndex(3);
      } else if (cmd === 'SELECT_5') {
        selectCandidateByIndex(4);
      }
    };

    registerVoiceHandler(handleVoiceCommand);
    return () => {
      unregisterVoiceHandler();
    };
  }, [registerVoiceHandler, unregisterVoiceHandler, handleProceedToReview, selectCandidateByIndex, navigate, isTanglish, speakText]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-2">
        <Link
          to="/voter/dashboard"
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isTanglish ? 'Voter Dashboard-ku thirumba' : 'Back to Voter Dashboard'}</span>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <span className="text-xs font-mono font-bold text-emerald-700 uppercase">
              {isTanglish ? 'Adhigaarappoorva Electronic Ballot' : 'Official Electronic Ballot'}
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              {election?.title || 'Constituency Election'}
            </h1>
            <p className="text-xs text-slate-500">
              Constituency: <strong>{election?.constituency}</strong>. {isTanglish ? 'Ungal viruppamana oru candidate-ai select pannunga.' : 'Select exactly one candidate of your choice.'}
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-slate-500">
              {isTanglish ? 'Total Candidates' : 'Candidates'}: {candidates.length}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Candidate List */}
        <div className="mt-6 space-y-3">
          {candidates.map((c, idx) => {
            const isSelected = selectedCandidateId === c.id;
            return (
              <label
                key={c.id}
                onClick={() => {
                  setSelectedCandidateId(c.id);
                  if (voiceActive || accessibility.speechAssistance || accessibility.seniorCitizenMode) {
                    const msg = isTanglish
                      ? `${c.name} select aayiduchu. Party: ${c.party || 'Independent'}. Symbol: ${c.symbol}. Next nu sollunga review panna.`
                      : `Selected: ${c.name}. Party: ${c.party || 'Independent'}. Symbol: ${c.symbol}. Say Next to review.`;
                    speakText(msg, true);
                  }
                }}
                className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-4 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-4">
                  {/* Candidate index badge */}
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">
                    {idx + 1}
                  </div>

                  {/* Radio control */}
                  <input
                    type="radio"
                    name="candidateSelection"
                    checked={isSelected}
                    onChange={() => setSelectedCandidateId(c.id)}
                    className="w-5 h-5 text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />

                  {/* Photo or Avatar */}
                  {c.photo ? (
                    <img
                      src={c.photo}
                      alt={c.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm shrink-0">
                      {c.name.charAt(0)}
                    </div>
                  )}

                  {/* Candidate Info */}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-extrabold text-slate-900">{c.name}</span>
                      {c.logo && <img src={c.logo} alt="" className="h-7 w-7 rounded object-contain border border-slate-200" />}
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {c.party || 'Independent'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{c.description}</div>
                    {c.information && (
                      <div className="text-[11px] text-slate-400 mt-0.5">{c.information}</div>
                    )}
                  </div>
                </div>

                {/* Symbol */}
                <div className="flex items-center space-x-3 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Symbol</span>
                    <span className="text-xs font-bold text-slate-800">{c.symbol}</span>
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {/* Bottom Proceed Action */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
          <Link
            to="/voter/dashboard"
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
          >
            {isTanglish ? 'Cancel' : 'Cancel'}
          </Link>

          <button
            type="button"
            disabled={!selectedCandidateId}
            onClick={handleProceedToReview}
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center space-x-2 shadow-md disabled:opacity-40 transition-all"
          >
            <span>{isTanglish ? 'Ballot Review Panna' : 'Review Ballot Selection'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
