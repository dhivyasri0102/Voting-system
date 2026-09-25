import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Vote,
  LogOut,
  Globe,
  Volume2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { connectWallet } from '../../services/blockchain.js';
import { VoiceAssistant } from '../../services/VoiceAssistant.js';

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

  const isTamil = accessibility.language === 'ta';

  // ✅ BUG FIX: Wallet state hooks MUST be declared before any conditional return
  // (React Rules of Hooks — hooks cannot follow a conditional branch)
  const [walletAddress, setWalletAddress] = React.useState<string | null>(null);
  const [walletError, setWalletError] = React.useState<string | null>(null);

  // Auth guard — placed AFTER all hook declarations
  if (!isVoterAuthenticated || !voterSession) {
    navigate('/voter/login', { replace: true });
    return null;
  }

  // Connect MetaMask wallet
  const handleConnectWallet = async () => {
    try {
      setWalletError(null);
      const wallet = await connectWallet();
      setWalletAddress(wallet.address);
    } catch (error) {
      setWalletError(
        error instanceof Error ? error.message : 'Failed to connect wallet'
      );
    }
  };

  const handleLogout = () => {
    logoutVoter();
    navigate('/voter/login');
  };

  const speakText = (text: string) => {
    VoiceAssistant.speak(text, isTamil ? 'ta' : 'en');
  };

  const getFontSizeClass = () => {
    if (accessibility.fontSize === 'large') return 'text-base';
    if (accessibility.fontSize === 'extra-large') return 'text-lg';
    return 'text-sm';
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans ${
        accessibility.highContrast
          ? 'bg-black text-amber-300'
          : 'bg-stone-50 text-stone-900'
      }`}
    >
      {/* ✅ UI FIX: Light theme top accessibility bar (was dark bg-slate-900) */}
      <div className="bg-stone-100 text-stone-700 text-xs py-2 px-4 border-b border-stone-300">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">

          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-stone-600">
              {isTamil
                ? 'தேசிய வாக்காளர் சேவை தளம் • அங்கீகரிக்கப்பட்ட அமர்வு'
                : 'National Citizen Suffrage Portal • Authenticated Session'}
            </span>
          </div>

          <div className="flex items-center space-x-3">

            {/* Audio narration */}
            <button
              onClick={() =>
                speakText(
                  isTamil
                    ? 'வாக்காளர் தளம். நீங்கள் தேர்தல் விவரங்களைப் பார்த்து பாதுகாப்பாக வாக்களிக்கலாம்.'
                    : 'Voter portal. Review election candidates and cast your ballot anonymously.'
                )
              }
              className="hover:text-stone-900 flex items-center space-x-1 transition-colors"
              title="Voice Assistance"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {isTamil ? 'ஒலி வழிகாட்டி' : 'Audio Guide'}
              </span>
            </button>

            {/* High Contrast */}
            <button
              onClick={() =>
                setAccessibility((prev) => ({
                  ...prev,
                  highContrast: !prev.highContrast,
                }))
              }
              className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                accessibility.highContrast
                  ? 'bg-amber-400 text-stone-950 font-bold border-amber-300'
                  : 'border-stone-400 hover:border-stone-600 text-stone-600'
              }`}
            >
              {isTamil ? 'மாறுபாடு' : 'Contrast'}
            </button>

            {/* Language Switch */}
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-1 px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>
                {isTamil ? 'English' : 'தமிழ்'}
              </span>
            </button>

          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="bg-white border-b border-stone-200 shadow-sm">

        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">

          {/* Logo and voter information */}
          <div className="flex items-center space-x-3">

            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Vote className="w-6 h-6" />
            </div>

            <div>
              <div className="text-sm font-bold text-stone-900">
                {isTamil
                  ? 'தேசிய மின்னணு வாக்குப்பதிவு'
                  : 'National E-Voting Portal'}
              </div>

              <div className="text-[11px] text-stone-500">
                EPIC:{' '}
                <span className="font-mono font-bold text-stone-700">
                  {voterSession.voterId}
                </span>{' '}
                • {voterSession.constituency}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-2">

            {/* Connect Wallet */}
            <button
              onClick={handleConnectWallet}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                walletAddress
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {walletAddress
                ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                : isTamil ? 'பணப்பை இணைக்க' : 'Connect Wallet'}
            </button>

            {/* Dashboard */}
            <NavLink
              to="/voter/dashboard"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'text-stone-600 hover:bg-stone-100'
                }`
              }
            >
              {isTamil ? 'முதன்மைப் பக்கம்' : 'Dashboard'}
            </NavLink>

            {/* Voting Status */}
            <NavLink
              to="/voter/status"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'text-stone-600 hover:bg-stone-100'
                }`
              }
            >
              {isTamil ? 'வாக்கு நிலை' : 'Voting Status'}
            </NavLink>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>
                {isTamil ? 'வெளியேறு' : 'Exit'}
              </span>
            </button>

          </nav>
        </div>
      </header>

      {/* Wallet Error */}
      {walletError && (
        <div className="max-w-6xl w-full mx-auto px-4 pt-3">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-xs">
            {walletError}
          </div>
        </div>
      )}

      {/* Main Outlet */}
      <main
        className={`flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 ${getFontSizeClass()}`}
      >
        <Outlet />
      </main>

      {/* ✅ UI FIX: Light theme footer (was dark bg-slate-900) */}
      <footer className="bg-stone-100 text-stone-500 text-xs py-4 border-t border-stone-200 text-center">

        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">

          <span>
            {isTamil
              ? 'இந்திய தேர்தல் ஆணையம் • அரசியலமைப்பு ரகசிய வாக்கு'
              : 'Election Commission of India • Constitutional Secret Ballot'}
          </span>

          <span className="text-[11px] text-stone-400">
            Zero Voter-Candidate Linkage Enforced
          </span>

        </div>

      </footer>

    </div>
  );
};