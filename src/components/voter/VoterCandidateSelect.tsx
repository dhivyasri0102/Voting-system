import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link, useOutletContext } from 'react-router-dom';
import { ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { Candidate, Election } from '../../types/index.js';
import { VoterLayoutContext } from './VoterLayout.js';

import { useVoiceGuidance } from '../VoiceGuidance.js';

export const VoterCandidateSelect: React.FC = () => {
  const { electionId } = useParams<{ electionId: string }>();
  const navigate = useNavigate();
  const { accessibility } = useAuth();
  const vg = useVoiceGuidance();
  const outletCtx = useOutletContext<VoterLayoutContext | undefined>();

  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!electionId) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/v1/elections/${electionId}`).then((r) => r.json()),
      fetch(`/api/v1/elections/${electionId}/candidates`).then((r) => r.json()),
    ])
      .then(([elecData, candData]) => {
        setElection(elecData);
        const activeCandidates = (candData || []).filter((c: Candidate) => c.status !== 'DISABLED');
        setCandidates(activeCandidates);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [electionId]);

  const selectCandidateByIndex = useCallback((index: number) => {
    if (index >= 0 && index < candidates.length) {
      const c = candidates[index];
      setSelectedCandidateId(c.id);
      const msg = `Candidate number ${index + 1}, ${c.name} select aayiduchu. Party ${c.party || 'Independent'}, Symbol ${c.symbol}. Next step-ku poga Next nu sollunga.`;
      vg.speakCustom(msg);
    }
  }, [candidates, vg]);

  const handleProceedToReview = useCallback(() => {
    if (!selectedCandidateId) {
      const errMsg = 'Oru candidate-ai select pannunga. Apram Next nu sollunga.';
      setErrorMessage(errMsg);
      vg.speakCustom(errMsg);
      return;
    }

    sessionStorage.setItem('evoting_ballot_selection', JSON.stringify({ electionId, candidateId: selectedCandidateId }));
    navigate(`/voter/election/${electionId}/ballot`);
  }, [selectedCandidateId, electionId, navigate, vg]);

  const announcedRef = useRef(false);
  useEffect(() => {
    if (!loading && candidates.length > 0 && !announcedRef.current) {
      announcedRef.current = true;
      if (vg.voiceOn) {
        const msg = `Vote panna candidate-ai select pannunga. Total-aa ${candidates.length} candidates irukaanga. Candidate select panna, Select candidate one, two, illa three nu sollunga. Candidate select pannitu Next nu sollunga.`;
        vg.speakCustom(msg);
      }
    }
  }, [loading, candidates.length, vg.voiceOn]);

  useEffect(() => {
    if (!vg.voiceOn) return;

    const handleVoiceCommand = (cmd: string) => {
      if (cmd === 'NEXT') {
        handleProceedToReview();
      } else if (cmd === 'BACK') {
        navigate('/voter/dashboard');
      } else if (cmd === 'REPEAT') {
        const msg = `Vote panna candidate-ai select pannunga. Select candidate one, two, illa three nu sollunga. Next nu sonnaa review page pogalam.`;
        vg.speakCustom(msg);
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

    vg.registerCommandHandler(handleVoiceCommand);
    return () => {
      vg.unregisterCommandHandler();
    };
  }, [vg.voiceOn, handleProceedToReview, selectCandidateByIndex, navigate]);

  const isTamil = accessibility.language === 'ta';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-2">
        <Link to="/voter/dashboard" className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isTamil ? 'முதன்மைப் பக்கத்திற்கு திரும்பு' : 'Back to Voter Dashboard'}</span>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <span className="text-xs font-mono font-bold text-emerald-700 uppercase">
              {isTamil ? 'அதிகாரப்பூர்வ மின்னணு வாக்குச்சீட்டு' : 'Official Electronic Ballot'}
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-1">{election?.title || 'Constituency Election'}</h1>
            <p className="text-xs text-slate-500">
              Constituency: <strong>{election?.constituency}</strong>. {isTamil ? 'உங்கள் விருப்பமான ஒரு வேட்பாளரை தேர்ந்தெடுக்கவும்.' : 'Select exactly one candidate of your choice.'}
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-slate-500">{isTamil ? 'வேட்பாளர்கள்' : 'Candidates'}: {candidates.length}</span>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {candidates.map((c, idx) => {
            const isSelected = selectedCandidateId === c.id;
            return (
              <label
                key={c.id}
                onClick={() => {
                  selectCandidateByIndex(idx);
                }}
                className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-4 cursor-pointer transition-all ${isSelected ? 'border-emerald-600 bg-emerald-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">
                    {idx + 1}
                  </div>
                  <input type="radio" name="candidateSelection" checked={isSelected} onChange={() => selectCandidateByIndex(idx)} className="w-5 h-5 text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer" />
                  {c.photo ? (
                    <img src={c.photo} alt={c.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm shrink-0">{c.name.charAt(0)}</div>
                  )}

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-extrabold text-slate-900">{c.name}</span>
                      {c.logo && <img src={c.logo} alt="" className="h-7 w-7 rounded object-contain border border-slate-200" />}
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">{c.party || 'Independent'}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{c.description}</div>
                    {c.information && <div className="text-[11px] text-slate-400 mt-0.5">{c.information}</div>}
                  </div>
                </div>

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

        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
          <Link to="/voter/dashboard" className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold">
            {isTamil ? 'ரத்து செய்க' : 'Cancel'}
          </Link>

          <button type="button" disabled={!selectedCandidateId} onClick={handleProceedToReview} className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center space-x-2 shadow-md disabled:opacity-40 transition-all">
            <span>{isTamil ? 'வாக்கு தேர்வை சரிபார்க்கவும்' : 'Review Ballot Selection'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
