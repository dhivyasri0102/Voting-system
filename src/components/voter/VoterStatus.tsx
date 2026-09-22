import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, Clock, ShieldCheck, ArrowLeft, Lock, 
  FileCheck, Vote, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const VoterStatus: React.FC = () => {
  const { voterSession, accessibility } = useAuth();
  const isTamil = accessibility.language === 'ta';

  const [remoteStatus, setRemoteStatus] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStatus = async () => {
    if (!voterSession?.voterId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/voting/status?voter_id=${voterSession.voterId}`);
      if (res.ok) {
        const data = await res.json();
        setRemoteStatus(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [voterSession?.voterId]);

  const hasVoted = voterSession?.hasVoted || remoteStatus?.has_voted;
  const txRef = voterSession?.lastVoteReceipt?.transactionReference || remoteStatus?.vote_record?.transaction_hash || 'TX-COMMITTED';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-2">
        <Link
          to="/voter/dashboard"
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isTamil ? 'முதன்மைப் பக்கத்திற்கு திரும்பு' : 'Back to Voter Dashboard'}</span>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isTamil ? 'அதிகாரப்பூர்வ வாக்குப்பதிவு நிலை' : 'Official Electoral Suffrage Status'}
            </h1>
            <p className="text-xs text-slate-500">
              EPIC: <strong>{voterSession?.voterId}</strong> • {voterSession?.constituency}
            </p>
          </div>

          <button
            onClick={fetchStatus}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="Refresh Status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Status Card (Section 29 Requirement) */}
        <div className={`p-6 rounded-2xl border-2 flex flex-col sm:flex-row items-center justify-between gap-4 ${
          hasVoted
            ? 'bg-emerald-50/60 border-emerald-500 text-emerald-950'
            : 'bg-amber-50/60 border-amber-400 text-amber-950'
        }`}>
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              hasVoted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {hasVoted ? <CheckCircle2 className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase">
                {isTamil ? 'தற்போதைய நிலை' : 'Ledger Status'}
              </div>
              <div className="text-lg font-black">
                {hasVoted
                  ? (isTamil ? 'வாக்கு பதிவு செய்யப்பட்டுள்ளது' : 'VOTE RECORDED')
                  : (isTamil ? 'வாக்களிக்கவில்லை' : 'NOT YET VOTED')}
              </div>
            </div>
          </div>

          {hasVoted ? (
            <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold">
              CONFIRMED
            </span>
          ) : (
            <Link
              to="/voter/dashboard"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-sm transition-colors"
            >
              {isTamil ? 'வாக்களிக்க செல்லவும்' : 'Go to Ballot →'}
            </Link>
          )}
        </div>

        {/* Receipt reference if voted */}
        {hasVoted && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-slate-700 font-mono">
            <div className="text-[11px] font-sans font-bold text-slate-500 uppercase">
              {isTamil ? 'பிளாக்செயின் குறிப்பு எண்' : 'Blockchain Ledger Reference'}
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-slate-200 truncate">
              {txRef}
            </div>
            <div className="text-[11px] font-sans text-slate-500">
              {isTamil ? 'வாக்களித்த நேரம்' : 'Recorded Timestamp'}: {new Date().toLocaleDateString()}
            </div>
          </div>
        )}

        {/* Privacy Note */}
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-start space-x-2.5">
          <Lock className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <strong>{isTamil ? 'ரகசிய வாக்கு பாதுகாப்பு' : 'Strict Constitutional Privacy'}</strong>:
            <p className="mt-0.5">
              {isTamil
                ? 'உங்கள் வாக்காளர் நிலைப் பக்கத்தில் நீங்கள் யாருக்கு வாக்களித்தீர்கள் என்ற விவரம் காட்டப்படாது.'
                : 'Pursuant to the Conduct of Elections Rules, this status page verifies your participation in the democratic process without displaying your selected candidate.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
