import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  CheckCircle2, ShieldCheck, Copy, Check, Lock, 
  ArrowRight, LogOut, FileCheck, Share2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const VoterConfirmation: React.FC = () => {
  const navigate = useNavigate();
  const { voterSession, logoutVoter, accessibility } = useAuth();
  const isTamil = accessibility.language === 'ta';
  const [copied, setCopied] = useState<boolean>(false);

  const receipt = voterSession?.lastVoteReceipt;

  if (!receipt) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center text-slate-600">
        {isTamil ? 'வாக்கு ரசீது கிடைக்கவில்லை.' : 'No vote receipt is available.'}
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(receipt.transactionReference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center border-4 border-emerald-50">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <span className="text-xs font-mono font-bold text-emerald-700 uppercase tracking-wider">
            {isTamil ? 'அரசியலமைப்பு வாக்குப்பதிவு முடிந்தது' : 'Consensus Confirmation'}
          </span>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            {isTamil ? 'உங்கள் வாக்கு வெற்றிகரமாக பதிவு செய்யப்பட்டது!' : 'Vote Recorded Successfully on Blockchain'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isTamil
              ? 'உங்கள் வாக்கு ஹைப்பர்லெட்ஜர் ஃபேப்ரிக் பிளாக்செயினில் நிரந்தரமாகப் பதிவு செய்யப்பட்டுள்ளது.'
              : 'Cryptographically anchored into the tamper-proof permissioned ledger.'}
          </p>
        </div>

        {/* Blockchain Receipt Details (Section 28 Requirement) */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="font-bold text-slate-800">
              {isTamil ? 'பிளாக்செயின் பரிவர்த்தனை ரசீது' : 'Cryptographic Suffrage Receipt'}
            </span>
            <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
              COMMITTED
            </span>
          </div>

          <div>
            <span className="text-slate-500 text-[11px] block">
              {isTamil ? 'பரிவர்த்தனை குறிப்பு (Tx Reference)' : 'Transaction Reference Hash'}:
            </span>
            <div className="flex items-center justify-between mt-0.5 bg-white p-2 rounded-lg border border-slate-200 font-mono text-slate-800 text-[11px] truncate">
              <span className="truncate">{receipt.transactionReference}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="ml-2 text-slate-500 hover:text-slate-800 shrink-0"
                title="Copy Hash"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 text-[11px]">
            <div>
              <span className="text-slate-500">{isTamil ? 'பிளாக் எண்' : 'Block Height'}:</span>
              <p className="font-mono font-bold text-slate-800">#{receipt.blockIndex}</p>
            </div>
            <div>
              <span className="text-slate-500">{isTamil ? 'நேரம்' : 'Committed Timestamp'}:</span>
              <p className="font-mono font-bold text-slate-800">
                {new Date(receipt.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-500">
            {/* ✅ BUG FIX: Translate token status text */}
            <strong>{isTamil ? 'டோக்கன் நிலை:' : 'Token Status:'}</strong>{' '}
            {isTamil
              ? 'அநாமதேய டோக்கன் பயன்படுத்தப்பட்டது. இரட்டை வாக்கு தடுக்கப்பட்டுள்ளது.'
              : 'Anonymous credential marked CONSUMED. Cannot be re-used for duplicate voting.'}
          </div>
        </div>

        {/* Zero Linkage Privacy Reminder */}
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-start space-x-2.5 text-left">
          <Lock className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <strong>{isTamil ? 'ரகசிய வாக்கு அறிவிப்பு' : 'Statutory Privacy Note'}:</strong>{' '}
            {isTamil
              ? 'இந்த ரசீதில் உங்கள் வேட்பாளர் தேர்வு குறிப்பிடப்படாது. உங்களைத் தவிர வேறு எவராலும் நீங்கள் யாருக்கு வாக்களித்தீர்கள் என்பதை அறிய முடியாது.'
              : 'As mandated by statutory election privacy law, this receipt certifies that you exercised your democratic franchise, without disclosing or recording which candidate was chosen.'}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/voter/status"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            {isTamil ? 'வாக்கு நிலையை சரிபார்க்க' : 'View Registered Status'}
          </Link>

          <button
            type="button"
            onClick={() => {
              logoutVoter();
              navigate('/');
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>{isTamil ? 'பாதுகாப்பாக வெளியேறு' : 'Exit Safely'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
