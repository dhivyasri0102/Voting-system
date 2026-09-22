import React, { useState, useEffect } from 'react';
import { FileCheck, ShieldAlert, CheckCircle2, Download, RefreshCw, Layers, Database, Lock, Search } from 'lucide-react';
import { BlockchainBlock, ElectionAuditReport } from '../types/index.js';

interface AuditorDashboardProps {
  electionId?: string;
}

export const AuditorDashboard: React.FC<AuditorDashboardProps> = ({ electionId = 'ELEC-2026-CHENN-01' }) => {
  const [blocks, setBlocks] = useState<BlockchainBlock[]>([]);
  const [auditReport, setAuditReport] = useState<ElectionAuditReport | null>(null);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);
  const [loadingBlocks, setLoadingBlocks] = useState<boolean>(false);
  const [selectedBlock, setSelectedBlock] = useState<BlockchainBlock | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchBlocks = async () => {
    setLoadingBlocks(true);
    try {
      const res = await fetch('/api/v1/blockchain/blocks');
      const data = await res.json();
      setBlocks(data);
      if (data.length > 0 && !selectedBlock) {
        setSelectedBlock(data[data.length - 1]);
      }
    } catch (err) {
      console.error('Failed to fetch blocks', err);
    } finally {
      setLoadingBlocks(false);
    }
  };

  const runAudit = async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch(`/api/v1/audit/${electionId}`);
      const data = await res.json();
      setAuditReport(data);
    } catch (err) {
      console.error('Audit run error', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    fetchBlocks();
    runAudit();
  }, [electionId]);

  const downloadReport = () => {
    if (!auditReport) return;
    const blob = new Blob([JSON.stringify(auditReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CAG-ELECTION-AUDIT-REPORT-${electionId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredBlocks = blocks.filter((b) => {
    if (!searchTerm) return true;
    const matchIndex = b.index.toString() === searchTerm.trim();
    const matchHash = b.hash.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTx = b.transactions.some((tx) =>
      tx.transactionReference.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return matchIndex || matchHash || matchTx;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      
      {/* Official Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-300 uppercase">
              Role: INDEPENDENT_AUDITOR (CAG & Judiciary)
            </span>
            <span className="text-xs text-slate-500">Read-Only Cryptographic Inspection</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Independent Election Integrity & Ledger Audit Portal
          </h2>
          <p className="text-xs text-slate-500">
            Real-time verification of hash-chains, Merkle roots, credential consumption congruence, and zero identity leakage.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="btn-run-audit"
            onClick={runAudit}
            disabled={loadingAudit}
            className="px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            {loadingAudit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
            <span>Execute 10-Point Automated Audit</span>
          </button>

          {auditReport && (
            <button
              id="btn-download-audit-report"
              onClick={downloadReport}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit Dossier</span>
            </button>
          )}
        </div>
      </div>

      {/* Audit Result Status Banner */}
      {auditReport && (
        <div className={`p-5 rounded-xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
          auditReport.auditStatus === 'AUDIT_PASS'
            ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
            : auditReport.auditStatus === 'AUDIT_WARNING'
            ? 'bg-amber-50/90 border-amber-300 text-amber-950'
            : 'bg-red-50/90 border-red-300 text-red-950'
        }`}>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase ${
                auditReport.auditStatus === 'AUDIT_PASS'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-red-600 text-white'
              }`}>
                {auditReport.auditStatus}
              </span>
              <span className="text-xs font-mono text-slate-600">
                Audited By: {auditReport.auditorOrg}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold mt-1.5 text-slate-900">
              {auditReport.auditStatus === 'AUDIT_PASS'
                ? 'All 10 Cryptographic Integrity & Ballot Secrecy Checks Passed'
                : 'Discrepancies Detected during Automated Audit Protocol'}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Verified {auditReport.blockChainHeight} Blocks • {auditReport.totalBlockchainTransactions} Ledger Transactions • Merkle Root Chain: {auditReport.merkleChainVerified ? 'VALID' : 'INVALID'}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white/80 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-500 block">Tokens Issued:</span>
              <strong className="text-slate-900 text-sm">{auditReport.totalCredentialsIssued}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Tokens Used:</span>
              <strong className="text-slate-900 text-sm">{auditReport.totalCredentialsUsed}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Valid Ballots:</span>
              <strong className="text-emerald-700 text-sm">{auditReport.validBallotsRecorded}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Rejection Rate:</span>
              <strong className="text-slate-900 text-sm">0.00%</strong>
            </div>
          </div>
        </div>
      )}

      {/* 10-Point Verification Checks Grid */}
      {auditReport && (
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">
            Auditor Automated Verification Protocol Results
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {auditReport.checks.map((chk) => (
              <div
                key={chk.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start space-x-3 text-xs"
              >
                <div className={`p-1.5 rounded-full shrink-0 ${
                  chk.status === 'PASS' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {chk.status === 'PASS' ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 text-xs sm:text-sm">{chk.name}</strong>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                      chk.status === 'PASS' ? 'bg-emerald-200/60 text-emerald-800' : 'bg-red-200 text-red-800'
                    }`}>
                      {chk.status}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1">{chk.description}</p>
                  <p className="text-slate-800 font-mono mt-1 text-[11px] bg-white p-1.5 rounded border border-slate-200">
                    {chk.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blockchain Block Explorer */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-purple-700" />
              <span>Permissioned Hyperledger Block Explorer</span>
            </h3>
            <p className="text-xs text-slate-500">
              Channel: <span className="font-mono font-semibold">election-channel</span> • Total Height: {blocks.length} Blocks
            </p>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search block # or hash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs w-56 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Blocks Horizontal / Grid List */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 my-4">
          {filteredBlocks.map((b) => (
            <button
              key={b.index}
              onClick={() => setSelectedBlock(b)}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedBlock?.index === b.index
                  ? 'border-purple-600 bg-purple-50/80 shadow ring-2 ring-purple-200'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Block</span>
              <span className="text-sm font-black text-slate-900 font-mono">#{b.index}</span>
              <span className="text-[10px] text-slate-500 block truncate font-mono mt-1">
                {b.transactions.length} Tx(s)
              </span>
            </button>
          ))}
        </div>

        {/* Block Detailed Inspector */}
        {selectedBlock && (
          <div className="mt-4 p-4 rounded-lg bg-slate-950 text-slate-100 font-mono text-xs space-y-2 border border-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-amber-400 font-bold uppercase">
                Block #{selectedBlock.index} Raw Header Inspector
              </span>
              <span className="text-slate-400 text-[11px]">{new Date(selectedBlock.timestamp).toISOString()}</span>
            </div>

            <div className="space-y-1">
              <div><span className="text-slate-400">Block Hash:</span> <span className="text-emerald-400 break-all">{selectedBlock.hash}</span></div>
              <div><span className="text-slate-400">Previous Hash:</span> <span className="text-slate-300 break-all">{selectedBlock.previousHash}</span></div>
              <div><span className="text-slate-400">Merkle Root:</span> <span className="text-cyan-300 break-all">{selectedBlock.merkleRoot}</span></div>
              <div><span className="text-slate-400">Peer Validator MSP:</span> <span className="text-purple-300">{selectedBlock.validatorSignature}</span></div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <span className="text-amber-300 text-[11px] font-semibold block mb-1">
                Constituent Ballot Transactions ({selectedBlock.transactions.length}):
              </span>
              {selectedBlock.transactions.map((tx, idx) => (
                <div key={idx} className="p-2 rounded bg-slate-900 border border-slate-800 my-1 text-[11px]">
                  <div className="text-slate-300">Tx Ref: <strong className="text-white">{tx.transactionReference}</strong></div>
                  <div>Ballot Commitment: <span className="text-emerald-300">{tx.ballotCommitment}</span></div>
                  <div>Credential Hash: <span className="text-slate-400">{tx.credentialHash}</span></div>
                  <div>Status: <span className="text-emerald-400 font-bold">{tx.status}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
