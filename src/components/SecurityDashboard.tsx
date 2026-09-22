import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, AlertOctagon, Terminal, Server, Cpu, RefreshCw, Radio } from 'lucide-react';
import { SecurityEvent, SystemHealthState } from '../types/index.js';

export const SecurityDashboard: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [health, setHealth] = useState<(SystemHealthState & { details: Record<string, string> }) | null>(null);
  const [prometheusText, setPrometheusText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const [eventsRes, healthRes, metricsRes] = await Promise.all([
        fetch('/api/v1/security/events'),
        fetch('/api/v1/health'),
        fetch('/api/v1/metrics'),
      ]);

      const eventsData = await eventsRes.json();
      const healthData = await healthRes.json();
      const metricsData = await metricsRes.text();

      setEvents(eventsData);
      setHealth(healthData);
      setPrometheusText(metricsData);
    } catch (err) {
      console.error('Failed to fetch security data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
    const interval = setInterval(fetchSecurityData, 10000);
    return () => clearInterval(interval);
  }, []);

  const severityColors: Record<string, string> = {
    LOW: 'bg-blue-100 text-blue-800 border-blue-200',
    MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
    CRITICAL: 'bg-red-100 text-red-900 border-red-300 font-bold',
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white uppercase">
              Role: SYSTEM_ADMIN & SOC MONITOR
            </span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
              Live Telemetry Stream Active
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Cybersecurity, Node Health & Threat Detection Console
          </h2>
          <p className="text-xs text-slate-500">
            Real-time rate-limiting audits, UIDAI connectivity diagnostics, and Prometheus OpenMetrics exporter.
          </p>
        </div>

        <button
          onClick={fetchSecurityData}
          disabled={loading}
          className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Monitors</span>
        </button>
      </div>

      {/* Subsystem Health Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Blockchain Ledger', status: health?.blockchain, icon: Server },
          { label: 'UIDAI Gateway', status: health?.uidai, icon: ShieldCheck },
          { label: 'Electoral Roll', status: health?.electoralRoll, icon: Server },
          { label: 'Database Replication', status: health?.database, icon: Server },
          { label: 'Redis State/Locks', status: health?.redis, icon: Cpu },
          { label: 'Express API Cluster', status: health?.backend, icon: Activity },
        ].map((node, idx) => (
          <div key={idx} className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <node.icon className="w-4 h-4 text-slate-400" />
              <span className={`w-2 h-2 rounded-full ${
                node.status === 'HEALTHY' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            </div>
            <span className="text-xs text-slate-500 block mt-2 font-medium">{node.label}</span>
            <strong className={`text-xs block mt-0.5 ${
              node.status === 'HEALTHY' ? 'text-emerald-700' : 'text-amber-700'
            }`}>
              {node.status || 'CHECKING'}
            </strong>
          </div>
        ))}
      </div>

      {/* Real-time Security Event Feed */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <AlertOctagon className="w-4 h-4 text-amber-600" />
            <span>Security Incident & Audit Trail</span>
          </h3>
          <span className="text-xs text-slate-500">Showing last {events.length} security events</span>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {events.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No security alerts recorded.</p>
          ) : (
            events.map((evt) => (
              <div
                key={evt.id}
                className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-start justify-between text-xs gap-3"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${severityColors[evt.severity]}`}>
                      {evt.severity}
                    </span>
                    <span className="font-bold text-slate-900">{evt.type}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{evt.correlationId}</span>
                  </div>
                  <p className="text-slate-700 mt-1">{evt.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-400 block">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{evt.clientIpMasked}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Prometheus OpenMetrics Exporter Live Preview */}
      <div className="p-6 rounded-xl bg-slate-950 text-slate-100 border border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2 font-mono">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Prometheus Scrape Endpoint (/api/v1/metrics)</span>
          </h3>
          <span className="text-xs text-slate-400">Content-Type: text/plain; version=0.0.4</span>
        </div>

        <pre className="p-3 rounded-lg bg-slate-900 font-mono text-xs text-emerald-400 overflow-x-auto border border-slate-800">
          {prometheusText || '# Loading metrics...'}
        </pre>
      </div>

    </div>
  );
};
