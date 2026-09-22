import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  BarChart3, CheckCircle2, AlertTriangle, ShieldCheck, FileCheck, 
  ArrowLeft, RefreshCw, Send, Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const AdminResultsDashboard: React.FC = () => {
  const { electionId } = useParams<{ electionId: string }>();
  const { adminSession } = useAuth();

  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchResults = async () => {
    if (!electionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/results/${electionId}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (err) {
      console.error('Failed to load results', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [electionId]);

  const handlePublishResults = async () => {
    if (!electionId) return;
    const confirm = window.confirm(
      'Are you sure you want to publish the official election results to the public record? This requires that the CAG audit has achieved AUDIT_PASS.'
    );
    if (!confirm) return;

    setPublishing(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/results/${electionId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSession?.token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMessage(`Error: ${data.message}`);
      } else {
        setStatusMessage(data.message);
        fetchResults();
      }
    } catch (err) {
      setStatusMessage('Network error publishing results.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="flex items-center space-x-2">
        <Link
          to="/admin/dashboard"
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-xs font-bold">
              Election: {electionId}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              results?.electionStatus === 'RESULT_PUBLISHED'
                ? 'bg-green-100 text-green-900 border border-green-400'
                : 'bg-purple-100 text-purple-900 border border-purple-400'
            }`}>
              {results?.electionStatus || 'TALLYING'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Consensus Tally & Official Results Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Cryptographic tally proofs, blockchain consensus metrics, and statutory CAG audit verification.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {results?.canPublishResults && results?.electionStatus !== 'RESULT_PUBLISHED' && (
            <button
              onClick={handlePublishResults}
              disabled={publishing}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{publishing ? 'Publishing...' : 'Publish Official Results'}</span>
            </button>
          )}

          <button
            onClick={fetchResults}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-slate-900 text-white text-xs font-mono">
          {statusMessage}
        </div>
      )}

      {/* Aggregate Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-slate-500 font-medium">Total Registered Electors</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            {results?.totalEligibleVoters?.toLocaleString() || '1,250,000'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-slate-500 font-medium">Valid Ballots Counted</span>
          <div className="text-xl font-extrabold text-blue-600 mt-1">
            {results?.totalVotesCast?.toLocaleString() || 0}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-slate-500 font-medium">Voter Turnout</span>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">
            {results?.turnoutPercentage || '0.00'}%
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-slate-500 font-medium">CAG Audit Status</span>
          <div className="mt-1">
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
              results?.auditStatus === 'AUDIT_PASS'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              {results?.auditStatus || 'PENDING'}
            </span>
          </div>
        </div>
      </div>

      {/* Candidate Results Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <span>Candidate Vote Totals</span>
        </h2>

        <div className="space-y-3">
          {(results?.candidateResults || []).map((cand: any) => (
            <div key={cand.candidateId} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between mb-2 text-xs">
                <div>
                  <span className="font-bold text-slate-900 text-sm">{cand.candidateName}</span>
                  <span className="text-slate-500 ml-2">({cand.party})</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 text-sm">{cand.voteCount} votes</span>
                  <span className="text-blue-600 font-bold ml-2">({cand.percentage}%)</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(Number(cand.percentage), 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cryptographic Ledger & CAG Verification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <h3 className="font-bold text-slate-900 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Blockchain Ledger Integrity</span>
          </h3>
          <p className="text-slate-500 text-[11px]">
            Every block verified against its predecessor hash on the Hyperledger Fabric channel.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl space-y-1 font-mono text-[11px] text-slate-700">
            <div>Blocks Verified: {results?.blockchainVerification?.totalBlocks || 0}</div>
            <div>Tamper Free: {results?.blockchainVerification?.isTamperFree ? 'YES (Consensus Valid)' : 'DISCREPANCY'}</div>
            <div className="truncate">Tally Proof Hash: {results?.tallyProofHash || 'N/A'}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <h3 className="font-bold text-slate-900 flex items-center space-x-2">
            <Lock className="w-4 h-4 text-purple-600" />
            <span>Zero Knowledge & Voter Privacy Guarantee</span>
          </h3>
          <p className="text-slate-500 text-[11px]">
            Statutory privacy notice pursuant to Constitutional Rule 49-M.
          </p>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            The system contains zero mapping between authenticated voter identities and candidate ballot choices. All results are aggregated mathematically without any identity cross-referencing.
          </p>
        </div>
      </div>
    </div>
  );
};
