import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Vote,
  LogOut,
  Globe,
  Mic,
  MicOff,
  Volume2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { connectWallet } from '../../services/blockchain.js';
import { VoiceAssistant } from '../../services/VoiceAssistant.js';

import { useVoiceGuidance } from '../VoiceGuidance.js';

export type VoiceCommandHandler = (command: string) => void;

export type VoterLayoutContext = {
  speakText: (text: string, force?: boolean) => void;
  voiceActive: boolean;
  isTanglish: boolean;
  registerVoiceHandler: (handler: VoiceCommandHandler) => void;
  unregisterVoiceHandler: () => void;
  stopVoiceAssistant: () => void;
};

export const VoterLayout: React.FC = () => {
  const navigate = useNavigate();
  const {
    voterSession,
    isVoterAuthenticated,
    logoutVoter,
    accessibility,
    setAccessibility,
    toggleLanguage,
  } = useAuth();
  const vg = useVoiceGuidance();

  const isTanglish = accessibility.language === 'ta';
  const [walletAddress, setWalletAddress] = React.useState<string | null>(null);
  const [walletError, setWalletError] = React.useState<string | null>(null);

  if (!isVoterAuthenticated || !voterSession) {
    navigate('/voter/login', { replace: true });
    return null;
  }

  const speakText = (text: string) => {
    vg.speakCustom(text);
  };

  const handleConnectWallet = async () => {
    try {
      setWalletError(null);
      const wallet = await connectWallet();
      setWalletAddress(wallet.address);
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Failed to connect wallet');
    }
  };

  const handleLogout = () => {
    vg.stop();
    logoutVoter();
    navigate('/voter/login');
  };

  const getFontSizeClass = () => {
    if (accessibility.fontSize === 'large') return 'text-base';
    if (accessibility.fontSize === 'extra-large') return 'text-lg';
    return 'text-sm';
  };

  const outletContext: VoterLayoutContext = {
    speakText,
    voiceActive: vg.voiceOn,
    isTanglish,
    registerVoiceHandler: (h) => vg.registerCommandHandler(h),
    unregisterVoiceHandler: () => vg.unregisterCommandHandler(),
    stopVoiceAssistant: () => vg.stop(),
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans ${accessibility.highContrast ? 'bg-black text-amber-300' : 'bg-stone-50 text-stone-900'}`}>
      <div className="bg-stone-100 text-stone-700 text-xs py-2 px-4 border-b border-stone-300">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-stone-600">
              {isTanglish ? 'தேசிய வாக்காளர் சேவை தளம் • அங்கீகரிக்கப்பட்ட அமர்வு' : 'National Citizen Suffrage Portal • Authenticated Session'}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={vg.toggleVoice}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg font-semibold transition-colors ${
                vg.voiceOn
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'bg-emerald-700 hover:bg-emerald-600 text-white'
              }`}
              title="Voice Assistant"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{vg.voiceOn ? 'Voice ON' : isTanglish ? 'குரல் உதவி' : 'Voice Assistant'}</span>
            </button>

            <button
              onClick={() => vg.speakCustom('Voter portal. Ungal constituency election-ai select panni anonymous-aa vote pannalam.')}
              className="hover:text-stone-900 flex items-center space-x-1 transition-colors"
              title="Voice Assistance"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-600" />
              <span>{isTanglish ? 'ஒலி வழிகாட்டி' : 'Audio Guide'}</span>
            </button>

            <button
              onClick={() => setAccessibility((prev) => ({ ...prev, highContrast: !prev.highContrast }))}
              className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${accessibility.highContrast ? 'bg-amber-400 text-stone-950 font-bold border-amber-300' : 'border-stone-400 hover:border-stone-600 text-stone-600'}`}
            >
              {isTanglish ? 'மாறுபாடு' : 'Contrast'}
            </button>

            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-1 px-2.5 py-0.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-semibold transition-colors"
              title="Switch language"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{isTanglish ? 'English' : 'தமிழ்'}</span>
            </button>
          </div>
        </div>
      </div>

      <header className="bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Vote className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-stone-900">
                {isTanglish ? 'தேசிய மின்னணு வாக்குப்பதிவு' : 'National E-Voting Portal'}
              </div>
              <div className="text-[11px] text-stone-500">
                EPIC: <span className="font-mono font-bold text-stone-700">{voterSession.voterId}</span> • {voterSession.constituency}
              </div>
            </div>
          </div>

          <nav className="flex items-center space-x-2">
            <button
              onClick={handleConnectWallet}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${walletAddress ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
            >
              {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : isTanglish ? 'பணப்பை இணைக்க' : 'Connect Wallet'}
            </button>

            <NavLink to="/voter/dashboard" className={({ isActive }) => `px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isActive ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'text-stone-600 hover:bg-stone-100'}`}>
              Dashboard
            </NavLink>

            <NavLink to="/voter/status" className={({ isActive }) => `px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isActive ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'text-stone-600 hover:bg-stone-100'}`}>
              {isTanglish ? 'நிலை' : 'Voting Status'}
            </NavLink>

            <button onClick={handleLogout} className="ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-1">
              <LogOut className="w-3.5 h-3.5" />
              <span>{isTanglish ? 'வெளியேறு' : 'Exit'}</span>
            </button>
          </nav>
        </div>
      </header>

      {walletError && (
        <div className="max-w-6xl w-full mx-auto px-4 pt-3">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-xs">{walletError}</div>
        </div>
      )}

      <main className={`flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 ${getFontSizeClass()}`}>
        <Outlet context={outletContext} />
      </main>

      <footer className="bg-stone-100 text-stone-500 text-xs py-4 border-t border-stone-200 text-center">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            {isTanglish ? 'இந்திய தேர்தல் ஆணையம் • அரசியலமைப்பு ரகசிய வாக்கு' : 'Election Commission of India • Constitutional Secret Ballot'}
          </span>
          <span className="text-[11px] text-stone-400">
            {isTanglish ? 'மறைமுகமான வாக்காளர்-வேட்பாளர் இணைப்பு இல்லை' : 'Zero Voter-Candidate Linkage Enforced'}
          </span>
        </div>
      </footer>
    </div>
  );
};