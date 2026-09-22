import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft, RefreshCw, Filter, Shield, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { AdminAuditEvent } from '../../types/index.js';

export const AdminAuditDashboard: React.FC = () => {
  const { adminSession } = useAuth();
  const [logs, setLogs] = useState<AdminAuditEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/audit/logs', {
        headers: {
          Authorization: `Bearer ${adminSession?.token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filterAction === 'ALL') return true;
    return log.action === filterAction;
  });

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
              ECI AUDIT TRAIL
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Immutable Append-Only Log
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Administrative Audit & Security Governance Trail
          </h1>
          <p className="text-xs text-slate-500">
            Cryptographic, unalterable trail of all Returning Officer operations. Ballot contents remain completely protected by zero knowledge proofs.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Filter */}
          <div className="flex items-center space-x-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs"
            >
              <option value="ALL">All Actions</option>
              <option value="ADMIN_LOGIN">ADMIN_LOGIN</option>
              <option value="ELECTION_CREATED">ELECTION_CREATED</option>
              <option value="ELECTION_OPENED">ELECTION_OPENED</option>
              <option value="ELECTION_CLOSED">ELECTION_CLOSED</option>
              <option value="CANDIDATE_CREATED">CANDIDATE_CREATED</option>
              <option value="CANDIDATE_UPDATED">CANDIDATE_UPDATED</option>
              <option value="CANDIDATE_DISABLED">CANDIDATE_DISABLED</option>
              <option value="RESULTS_PUBLISHED">RESULTS_PUBLISHED</option>
            </select>
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center space-x-2">
        <Lock className="w-4 h-4 text-blue-700 shrink-0" />
        <span>
          <strong>Zero Linkage Guarantee:</strong> Audit records document administrative administrative commands and system operations. Under constitutional privacy protections, individual voter ballot choices are never recorded or inspectable.
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold">Timestamp</th>
                <th className="py-3 px-4 font-bold">Admin ID</th>
                <th className="py-3 px-4 font-bold">Action</th>
                <th className="py-3 px-4 font-bold">Election ID</th>
                <th className="py-3 px-4 font-bold">Candidate ID</th>
                <th className="py-3 px-4 font-bold">Result</th>
                <th className="py-3 px-4 font-bold">Audit Request ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 text-slate-600 font-sans whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {log.admin_id}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold text-[11px] border border-slate-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {log.election_id || '-'}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {log.candidate_id || '-'}
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      log.result === 'SUCCESS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {log.result}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[10px] text-slate-400 truncate max-w-xs">
                    {log.request_id}
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                    No audit records match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
