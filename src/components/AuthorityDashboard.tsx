import React, { useState } from 'react';
import { Award, Play, Square, FileText, CheckCircle, AlertTriangle, Shield, Key, Users, BarChart3, RefreshCw } from 'lucide-react';
import { Election, Candidate, ElectionStatus } from '../types/index.js';

interface AuthorityDashboardProps {
  election: Election | null;
  candidates: Candidate[];
  onRefresh: () => void;
}

export const AuthorityDashboard: React.FC<AuthorityDashboardProps> = ({
  election,
  candidates,
  onRefresh,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [mfaCode, setMfaCode] = useState<string>('123456');
  const [showMfaModal, setShowMfaModal] = useState<boolean>(false);
  const [targetStatus, setTargetStatus] = useState<ElectionStatus | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleInitiateTransition = (status: ElectionStatus) => {
    setTargetStatus(status);
    setShowMfaModal(true);
  };

  const handleConfirmTransition = async () => {
    if (!election || !targetStatus) return;
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/v1/admin/elections/${election.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_status: targetStatus,
          mfa_code: mfaCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMessage(`Error: ${data.message}`);
      } else {
        setStatusMessage(`Success: ${data.message}`);
        setShowMfaModal(false);
        onRefresh();
      }
    } catch (err) {
      setStatusMessage('Network error updating election state.');
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<ElectionStatus, string> = {
    DRAFT: 'bg-slate-100 text-slate-800 border-slate-300',
    SCHEDULED: 'bg-blue-100 text-blue-800 border-blue-300',
    OPEN: 'bg-emerald-100 text-emerald-800 border-emerald-400',
    CLOSED: 'bg-amber-100 text-amber-800 border-amber-400',
    TALLYING: 'bg-purple-100 text-purple-800 border-purple-400',
    AUDITING: 'bg-cyan-100 text-cyan-800 border-cyan-400',
    RESULT_PUBLISHED: 'bg-green-100 text-green-900 border-green-500',
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      
      {/* Title & ECI Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase">
              Role: ELECTION_AUTHORITY
            </span>
            <span className="text-xs text-slate-500">MFA Enforced Session</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Election Commission Administrative Console
          </h2>
          <p className="text-xs text-slate-500">
            Lifecycle state machine management, candidate configuration, and aggregate participation telemetry.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh State</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-lg bg-slate-900 text-white text-xs font-mono">
          {statusMessage}
        </div>
      )}

      {/* Lifecycle State Machine Card */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold">Active Election</span>
            <h3 className="text-lg font-bold text-slate-900">{election?.title}</h3>
            <p className="text-xs text-slate-500">{election?.constituency} • ID: {election?.id}</p>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold text-slate-500">Current Phase:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${election ? statusColors[election.status] : ''}`}>
              ● {election?.status}
            </span>
          </div>
        </div>

        {/* State Machine Action Buttons */}
        <div className="mt-6">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Permitted State Machine Transitions:
          </h4>
          <div className="flex flex-wrap gap-2.5">
            {election?.status === 'DRAFT' && (
              <button
                id="btn-schedule-election"
                onClick={() => handleInitiateTransition('SCHEDULED')}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center space-x-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Transition to SCHEDULED</span>
              </button>
            )}

            {(election?.status === 'SCHEDULED' || election?.status === 'DRAFT') && (
              <button
                id="btn-open-election"
                onClick={() => handleInitiateTransition('OPEN')}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Open Polls (Status: OPEN)</span>
              </button>
            )}

            {election?.status === 'OPEN' && (
              <button
                id="btn-close-election"
                onClick={() => handleInitiateTransition('CLOSED')}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center space-x-1.5"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Close Polling (Status: CLOSED)</span>
              </button>
            )}

            {election?.status === 'CLOSED' && (
              <button
                id="btn-start-tallying"
                onClick={() => handleInitiateTransition('TALLYING')}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center space-x-1.5"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Begin Automated Tallying (Status: TALLYING)</span>
              </button>
            )}

            {election?.status === 'TALLYING' && (
              <button
                id="btn-start-auditing"
                onClick={() => handleInitiateTransition('AUDITING')}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold flex items-center space-x-1.5"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Handover to CAG Auditor (Status: AUDITING)</span>
              </button>
            )}

            {election?.status === 'AUDITING' && (
              <button
                id="btn-publish-results"
                onClick={() => handleInitiateTransition('RESULT_PUBLISHED')}
                className="px-4 py-2 rounded-lg bg-green-700 hover:bg-green-800 text-white text-xs font-semibold flex items-center space-x-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Publish Official Certified Results</span>
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Note: In accordance with Rule 65, Election Authorities cannot modify votes or inspect private voter choices.
          </p>
        </div>
      </div>

      {/* Candidate Roster */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4">
          Nominated Candidates ({candidates.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidates.map((c) => (
            <div key={c.id} className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500">#{c.orderNumber} • {c.id}</span>
                <h4 className="text-base font-bold text-slate-900 mt-0.5">{c.name}</h4>
                <p className="text-xs font-semibold text-blue-700">{c.party}</p>
                <p className="text-xs text-slate-600 mt-2">{c.profileSummary}</p>
              </div>
              <div className="w-12 h-12 rounded bg-white border border-slate-200 flex items-center justify-center font-bold text-xs p-1 shadow-sm shrink-0 ml-3">
                {c.symbol}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Administrative MFA Modal */}
      {showMfaModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-300">
            <div className="flex items-center space-x-2 text-amber-600 mb-3">
              <Shield className="w-5 h-5" />
              <h3 className="font-bold text-slate-900">Privileged Authority Authorization</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Transitioning election state to <strong>{targetStatus}</strong> requires multi-factor authentication (MFA) under Election Commission IT directives.
            </p>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Enter 6-Digit Authenticator TOTP Code:
            </label>
            <input
              type="password"
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300 font-mono text-center text-lg tracking-widest outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="123456"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowMfaModal(false)}
                className="px-4 py-2 rounded text-xs text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-mfa"
                onClick={handleConfirmTransition}
                disabled={loading}
                className="px-5 py-2 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold"
              >
                {loading ? 'Authorizing...' : 'Authorize State Change'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
