import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Vote, ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, 
  Lock, ArrowRight, HelpCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { Candidate, Election } from '../../types/index.js';

export const VoterBallotReview: React.FC = () => {
  const { electionId } = useParams<{ electionId: string }>();
  const navigate = useNavigate();
  const { voterSession, updateVoterSession, accessibility } = useAuth();
  const isTamil = accessibility.language === 'ta';

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Retrieve chosen candidate from sessionStorage
    const stored = sessionStorage.getItem('evoting_ballot_selection');
    if (!stored || !electionId) {
      navigate(`/voter/election/${electionId}/candidates`);
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (parsed.electionId !== electionId || !parsed.candidateId) {
        navigate(`/voter/election/${electionId}/candidates`);
        return;
      }

      Promise.all([
        fetch(`/api/v1/elections/${electionId}`).then((r) => r.json()),
        fetch(`/api/v1/elections/${electionId}/candidates`).then((r) => r.json()),
      ]).then(([elecData, candData]) => {
        setElection(elecData);
        const match = (candData || []).find((c: Candidate) => c.id === parsed.candidateId);
        if (match) {
          setCandidate(match);
        } else {
          navigate(`/voter/election/${electionId}/candidates`);
        }
      });
    } catch (e) {
      navigate(`/voter/election/${electionId}/candidates`);
    }
  }, [electionId]);

  const handleConfirmVote = async () => {
    if (!electionId || !candidate || !voterSession) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/voting/ballots/cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          election_id: electionId,
          candidate_id: candidate.id,
          credential_hash: voterSession.credentialHash,
          raw_credential: voterSession.rawCredential,
          voter_secret_nonce: crypto.randomUUID(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Ballot casting failed.');
      } else {
        // Clear selection from temporary storage
        sessionStorage.removeItem('evoting_ballot_selection');

        // Update voter session state: vote is cast!
        updateVoterSession({
          hasVoted: true,
          lastVoteReceipt: {
            transactionReference: data.transaction_reference,
            blockIndex: data.block_index,
            blockHash: data.block_hash,
            timestamp: data.timestamp,
            electionId,
          },
        });

        // Navigate to confirmation page
        navigate('/voter/vote-confirmation');
      }
    } catch (err) {
      setErrorMessage('Network error attempting to cast ballot to blockchain.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-2">
        <Link
          to={`/voter/election/${electionId}/candidates`}
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isTamil ? 'வேட்பாளர் தேர்வுக்கு திரும்பு' : 'Go Back to Change Selection'}</span>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="text-center pb-4 border-b border-slate-100">
          <span className="text-xs font-mono font-bold text-emerald-700 uppercase">
            {isTamil ? 'வாக்கு உறுதிப்படுத்தல்' : 'Review & Confirm Your Vote'}
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {isTamil ? 'உங்கள் வாக்குத் தேர்வு' : 'Ballot Choice Verification'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {election?.title} • {election?.constituency}
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Selected Candidate Card (Section 25 Requirement) */}
        <div className="p-6 rounded-2xl bg-emerald-50/60 border-2 border-emerald-500 space-y-4">
          <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
            {isTamil ? 'நீங்கள் தேர்ந்தெடுத்த வேட்பாளர்:' : 'You Have Selected:'}
          </div>

          <div className="flex items-center space-x-4">
            {candidate?.photo ? (
              <img
                src={candidate.photo}
                alt={candidate.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-300 shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-emerald-200 flex items-center justify-center font-bold text-emerald-800 text-xl">
                {candidate?.name.charAt(0)}
              </div>
            )}

            <div>
              <h2 className="text-lg font-extrabold text-slate-900">{candidate?.name}</h2>
              <p className="text-xs font-bold text-emerald-800">{candidate?.party || 'Independent'}</p>
              <p className="text-xs text-slate-600 mt-0.5">
                {isTamil ? 'சின்னம்' : 'Electoral Symbol'}: <strong>{candidate?.symbol}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Statutory Warning Notice */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
          <div className="font-bold flex items-center space-x-1.5 text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{isTamil ? 'முக்கிய அறிவிப்பு:' : 'Statutory Finality Warning:'}</span>
          </div>
          <p className="leading-relaxed">
            {isTamil
              ? 'உங்கள் வாக்கை உறுதிசெய்த பிறகு, அதை மாற்றவோ ரத்து செய்யவோ முடியாது. உங்கள் அநாமதேய வாக்கு டோக்கன் உடனடியாகப் பயன்படுத்தப்பட்டு முடக்கப்படும்.'
              : 'Once you confirm your vote, it cannot be changed, reversed, or cast again. Your anonymous voting credential will be permanently marked as CONSUMED in the ledger.'}
          </p>
        </div>

        {/* Privacy Assurance */}
        <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {isTamil
              ? 'உங்கள் வாக்கு அநாமதேய குறியீடாக மட்டுமே சங்கிலியில் பதிவு செய்யப்படும்; உங்கள் அடையாளத்துடன் இணைக்கப்படாது.'
              : 'Your vote is transmitted anonymously. No record links your EPIC identity to this candidate choice.'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(`/voter/election/${electionId}/candidates`)}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            {isTamil ? '← வேட்பாளரை மாற்றுக' : '← Go Back & Change'}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleConfirmVote}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-extrabold shadow-lg hover:shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2"
          >
            <Vote className="w-4 h-4" />
            <span>{loading ? 'Recording Ballot...' : isTamil ? 'வாக்கை உறுதி செய்க' : 'Confirm & Cast Vote'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
