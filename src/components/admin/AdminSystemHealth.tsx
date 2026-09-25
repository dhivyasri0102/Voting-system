import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Cpu, Server, Database, ShieldCheck, AlertTriangle, CheckCircle2, 
  ArrowLeft, RefreshCw, Activity, Terminal
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const AdminSystemHealth: React.FC = () => {
  const { adminSession } = useAuth();
  const [healthData, setHealthData] = useState<any>(null);
  const [metricsData, setMetricsData] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [modeMessage, setModeMessage] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/health');
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }

      const metRes = await fetch('/api/v1/metrics');
      if (metRes.ok) {
        const text = await metRes.text();
        setMetricsData(text);
      }
    } catch (err) {
      console.error('Failed to load health metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">HEALTHY</span>;
      case 'DEGRADED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">DEGRADED</span>;
      case 'NOT CONFIGURED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-200 text-slate-700 border border-slate-300">NOT CONFIGURED</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300">UNAVAILABLE</span>;
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
          <h1 className="text-xl font-bold text-slate-900">
            System Infrastructure & Government Integration Gateway
          </h1>
          <p className="text-xs text-slate-500">
            Health monitoring of core subsystems. External government integrations are strictly reported as NOT CONFIGURED until authorized endpoints are verified.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {modeMessage && (
        <div className="p-3.5 rounded-xl bg-slate-900 text-white text-xs font-mono">
          {modeMessage}
        </div>
      )}

      {/* Integration Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Backend API */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <Server className="w-4 h-4 text-emerald-600" />
              <span>Backend API</span>
            </span>
            {getStatusBadge(healthData?.components?.backend || 'HEALTHY')}
          </div>
          <p className="text-xs text-slate-500">Express REST Gateway & RBAC middleware engine.</p>
        </div>

        {/* PostgreSQL Database */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <Database className="w-4 h-4 text-amber-600" />
              <span>PostgreSQL Database</span>
            </span>
            {getStatusBadge(healthData?.components?.database || 'HEALTHY')}
          </div>
          <p className="text-xs text-slate-500">Persistent relation repository for metadata and audit records.</p>
        </div>

        {/* Redis Cache */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-rose-600" />
              <span>Redis Cluster</span>
            </span>
            {getStatusBadge(healthData?.components?.redis || 'HEALTHY')}
          </div>
          <p className="text-xs text-slate-500">In-memory distributed lock & atomic token consumption.</p>
        </div>

        {/* Solidity EVM Smart Contract */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Solidity EVM Smart Contract</span>
            </span>
            {getStatusBadge(healthData?.components?.blockchain || 'HEALTHY')}
          </div>
          <p className="text-xs text-slate-500">Decentralized EVM nodes maintaining tamper-proof Voting.sol contract.</p>
        </div>

        {/* SMS Gateway */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <Activity className="w-4 h-4 text-amber-600" />
              <span>SMS OTP Gateway</span>
            </span>
            {getStatusBadge(healthData?.components?.smsGateway || 'NOT CONFIGURED')}
          </div>
          <p className="text-xs text-slate-500">
            Twilio delivery. Configure Twilio credentials for live OTP messages.
          </p>
        </div>

        {/* Electoral Roll */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>ECI Electoral Roll</span>
            </span>
            {getStatusBadge(healthData?.components?.electoralRoll || 'NOT CONFIGURED')}
          </div>
          <p className="text-xs text-slate-500">
            Official statutory voter registry verification endpoint.
          </p>
        </div>
      </div>

      {/* Prometheus Telemetry Preview */}
      <div className="bg-slate-900 rounded-2xl p-5 text-slate-200 space-y-3 font-mono text-xs">
        <div className="flex items-center space-x-2 text-slate-400">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>Prometheus Metrics Export Preview</span>
        </div>
        <pre className="overflow-x-auto text-[11px] text-slate-300 max-h-48 bg-slate-950 p-4 rounded-xl border border-slate-800">
          {metricsData || '# Loading Prometheus telemetry export...'}
        </pre>
      </div>
    </div>
  );
};
