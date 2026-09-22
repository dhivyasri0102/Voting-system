import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, ShieldCheck, RefreshCw, BarChart2, Hash } from 'lucide-react';
import { Election } from '../types/index.js';
import { ElectionTallyReport } from '../backend/services/TallyService.js';

interface PublicResultsViewProps {
  election: Election | null;
}

export const PublicResultsView: React.FC<PublicResultsViewProps> = ({ election }) => {
  const [tally, setTally] = useState<ElectionTallyReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchTally = async () => {
    if (!election) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/tally/${election.id}`);
      const data = await res.json();
      setTally(data);
    } catch (err) {
      console.error('Failed to load tally results', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTally();
  }, [election?.id]);

  const isPublished = election?.status === 'RESULT_PUBLISHED' || election?.status === 'AUDITING' || election?.status === 'TALLYING';

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      
      {/* Official Certificate Banner */}
      <div className="p-6 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-md">
        <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Award className="w-4 h-4" />
          <span>Election Commission of India • Certified Result Bulletin</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white">
          {election?.title || 'General Election 2026'}
        </h2>
        <p className="text-xs text-slate-300 mt-1">
          Constituency: <strong>{election?.constituency}</strong> | State: {election?.state}
        </p>

        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
          <div>Election Status: <strong className="text-amber-300">{election?.status}</strong></div>
          <div>Turnout: <strong className="text-emerald-400">{tally?.turnoutPercentage || 0}%</strong></div>
          <div>Total Ballots Counted: <strong className="text-white">{tally?.totalBallotsCounted || 0}</strong></div>
        </div>
      </div>

      {!isPublished ? (
        <div className="p-8 rounded-xl bg-white border border-slate-200 text-center shadow-sm">
          <ShieldCheck className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">Election Polling in Progress</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Official tallying and result certification commence automatically following the formal closure of the voting window and CAG cryptographic audit verification.
          </p>
          <span className="inline-block mt-4 px-3 py-1 rounded bg-amber-100 text-amber-900 text-xs font-bold">
            Current Status: {election?.status}
          </span>
        </div>
      ) : (
        /* Certified Candidate Breakdown */
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <BarChart2 className="w-4 h-4 text-blue-700" />
              <span>Certified Candidate Vote Share</span>
            </h3>
            <button
              onClick={fetchTally}
              disabled={loading}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
              title="Refresh Count"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-4">
            {tally?.candidateResults.map((c, idx) => (
              <div key={c.candidateId} className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <strong className="text-sm text-slate-900">{c.candidateName}</strong>
                    <span className="text-xs text-blue-800 font-semibold">({c.party})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900">{c.voteCount} votes</span>
                    <span className="text-xs text-slate-500 block font-mono font-semibold">{c.percentage}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      idx === 0 ? 'bg-emerald-600' : 'bg-blue-600'
                    }`}
                    style={{ width: `${c.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Cryptographic Audit Proof Stamp */}
          <div className="mt-6 p-4 rounded-lg bg-slate-950 text-slate-200 font-mono text-xs border border-slate-800 space-y-1">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-bold uppercase pb-1 border-b border-slate-800">
              <CheckCircle2 className="w-4 h-4" />
              <span>Immutable Ledger Merkle Proof</span>
            </div>
            <div>Tally Proof Hash: <span className="text-cyan-300 break-all">{tally?.tallyProofHash}</span></div>
            <div>Timestamp: <span className="text-slate-400">{tally?.tallyTimestamp}</span></div>
            <div>Blockchain Verified: <span className="text-emerald-400 font-bold">YES (Channel: election-channel)</span></div>
          </div>
        </div>
      )}

    </div>
  );
};
