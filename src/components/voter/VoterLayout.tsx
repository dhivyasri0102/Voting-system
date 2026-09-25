import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Vote,
  LogOut,
  Globe,
  Mic,
  MicOff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { connectWallet } from '../../services/blockchain.js';
import { VoiceAssistant } from '../../services/VoiceAssistant.js';

// Type exported for child pages via Outlet context
export type VoiceCommandHandler = (command: string) => void;

export type VoterLayoutContext = {
  speakText: (text: string, force?: boolean) => void;
  voiceActive: boolean;
  isTanglish: boolean;
  registerVoiceHandler: (handler: VoiceCommandHandler) => void;
  unregisterVoiceHandler: () => void;
  stopVoiceAssistant: () => void;
};

/** Normalise a free-form transcript into a fixed command token */
function normalizeCommand(raw: string): string {
  const t = raw.toLowerCase().trim();
  if (/\b(next|go next|next page|munaadi|munaadi po|continue|proceed|forward|nextu)\b/.test(t))  return 'NEXT';
  if (/\b(back|go back|previous|piragu|piragu po|change|pakkam)\b/.test(t))                      return 'BACK';
  if (/\b(repeat|again|sollu|repeat karo|oru murai|mela sollu)\b/.test(t))                       return 'REPEAT';
  if (/\b(confirm|yes confirm|confirm pannunga|submit|yes|seri|okk|ok)\b/.test(t))               return 'CONFIRM';
  if (/\b(stop|vendam|end|finish|close)\b/.test(t))                                               return 'STOP';
  if (/\b(candidate one|select one|onnu|one|first|candidate 1|number one|1)\b/.test(t))          return 'SELECT_1';
  if (/\b(candidate two|select two|rendu|two|second|candidate 2|number two|2)\b/.test(t))        return 'SELECT_2';
  if (/\b(candidate three|select three|moonu|three|third|candidate 3|number three|3)\b/.test(t)) return 'SELECT_3';
  if (/\b(candidate four|select four|naangu|four|fourth|candidate 4|number four|4)\b/.test(t))   return 'SELECT_4';
  if (/\b(candidate five|select five|anju|five|fifth|candidate 5|number five|5)\b/.test(t))      return 'SELECT_5';
  return '';
}

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

  // isTanglish = user selected "Tamil" toggle → we speak Tanglish
  const isTanglish = accessibility.language === 'ta';

  // ✅ BUG FIX: Wallet state hooks MUST be declared before any conditional return
  // (React Rules of Hooks — hooks cannot follow a conditional branch)
  const [walletAddress, setWalletAddress] = React.useState<string | null>(null);
  const [walletError, setWalletError]     = React.useState<string | null>(null);

  // Voice assistant UI state
  const [voiceActive,  setVoiceActive]  = React.useState(false);
  const [isListening,  setIsListening]  = React.useState(false);
  const [lastCommand,  setLastCommand]  = React.useState('');

  // Refs that survive across re-renders without stale closures
  const recognitionRef      = React.useRef<any>(null);
  const voiceActiveRef      = React.useRef(false);          // always mirrors voiceActive state
  const currentHandlerRef   = React.useRef<VoiceCommandHandler | null>(null);
  const lastSpokenRef       = React.useRef<{ text: string; time: number }>({ text: '', time: 0 });
  const isTanglishRef       = React.useRef(isTanglish);

  // Keep refs in sync with latest values
  React.useEffect(() => { voiceActiveRef.current = voiceActive; }, [voiceActive]);
  React.useEffect(() => { isTanglishRef.current = isTanglish; }, [isTanglish]);

  // Auth guard — placed AFTER all hook declarations
  if (!isVoterAuthenticated || !voterSession) {
    navigate('/voter/login', { replace: true });
    return null;
  }

  // ─── Speech Synthesis ─────────────────────────────────────────────────────
  const speakText = React.useCallback((text: string, force = false) => {
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const now = Date.now();
    if (!force && lastSpokenRef.current.text === text && now - lastSpokenRef.current.time < 1500) return;
    lastSpokenRef.current = { text, time: now };
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    // Tanglish is roman-script Tamil; en-IN voice engine handles it naturally
    u.lang = 'en-IN';
    u.rate = 0.82;
    window.speechSynthesis.speak(u);
  }, []);

  // ─── Speech Recognition — inner start ────────────────────────────────────
  const startRecognition = React.useCallback(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous      = false;   // shorter sessions → more reliable restart
    rec.interimResults  = false;
    rec.lang            = 'en-IN';

    rec.onstart = () => setIsListening(true);

    rec.onend = () => {
      setIsListening(false);
      // Auto-restart only while voice assistant is still active
      if (voiceActiveRef.current) {
        setTimeout(() => {
          try { recognitionRef.current?.start(); } catch (_) {}
        }, 350);
      }
    };

    rec.onresult = (e: any) => {
      const transcript: string = e.results[e.results.length - 1][0].transcript;
      const cmd = normalizeCommand(transcript);
      setLastCommand(transcript.trim());

      if (!cmd) {
        speakText('Puriyala. Next, Back, Repeat, illa Confirm nu sollunga.', true);
        return;
      }
      if (cmd === 'STOP') {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        stopVoice();
        return;
      }
      currentHandlerRef.current?.(cmd);
    };

    rec.onerror = (e: any) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      setIsListening(false);
    };

    recognitionRef.current = rec;
    try { rec.start(); } catch (_) {}
  // stopVoice defined below — referenced by name, not as dependency
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakText]);

  // ─── Stop voice assistant ─────────────────────────────────────────────────
  // Defined as a plain inner function (stable ref) to avoid circular deps
  // eslint-disable-next-line prefer-const
  let stopVoice: () => void;
  stopVoice = React.useCallback(() => {
    voiceActiveRef.current = false;
    setVoiceActive(false);
    setIsListening(false);
    setLastCommand('');
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }
    window.speechSynthesis?.cancel();
  }, []);

  // ─── Start voice assistant ────────────────────────────────────────────────
  const startVoice = React.useCallback(() => {
    voiceActiveRef.current = true;
    setVoiceActive(true);
    const msg = isTanglishRef.current
      ? 'Voice Assistant start aayiduchu. Naanga ungalukku voting-la help pannuvoam.'
      : 'Voice Assistant started. We will guide you through the voting process.';
    speakText(msg, true);
    // Wait for TTS to finish before opening mic
    setTimeout(() => startRecognition(), 2200);
  }, [speakText, startRecognition]);

  // Stop mic when voiceActive goes false (e.g. from child pages calling stopVoiceAssistant)
  React.useEffect(() => {
    if (!voiceActive && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
  }, [voiceActive]);

  // ─── Page handler registration ────────────────────────────────────────────
  const registerVoiceHandler = React.useCallback((handler: VoiceCommandHandler) => {
    currentHandlerRef.current = handler;
  }, []);
  const unregisterVoiceHandler = React.useCallback(() => {
    currentHandlerRef.current = null;
  }, []);

  // ─── Wallet ───────────────────────────────────────────────────────────────
  const handleConnectWallet = async () => {
    try {
      setWalletError(null);
      const wallet = await connectWallet();
      setWalletAddress(wallet.address);
      console.log('Wallet connected:', wallet.address);
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Failed to connect wallet');
    } catch (error) {
      setWalletError(
        error instanceof Error ? error.message : 'Failed to connect wallet'
      );
    }
  };

  const handleLogout = () => {
    stopVoice();
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

  // ─── Context passed to child pages ────────────────────────────────────────
  const outletContext: VoterLayoutContext = {
    speakText,
    voiceActive,
    isTanglish,
    registerVoiceHandler,
    unregisterVoiceHandler,
    stopVoiceAssistant: stopVoice,
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans ${
        accessibility.highContrast
          ? 'bg-black text-amber-300'
          : 'bg-stone-50 text-stone-900'
      }`}
    >

      {/* ── Top Accessibility Bar ──────────────────────────────────────────── */}
      <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">

          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-300">
              National Citizen Suffrage Portal • Authenticated Session
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

            {/* ONE Voice Assistant button */}
            {!voiceActive ? (
              <button
                onClick={startVoice}
                className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold transition-colors"
                title="Start Voice Assistant (Tanglish / English guidance)"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Start Voice Assistant</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-bold text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse" />
                  <Mic className="w-3 h-3" />
                  <span>🎤 Voice Assistant ON</span>
                </span>
                <button
                  onClick={stopVoice}
                  className="text-[11px] text-red-400 hover:text-red-300 underline"
                  title="Stop Voice Assistant"
                >
                  Stop
                </button>
              </div>
            )}
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
              Contrast
            </button>

            {/* Language — English / Tanglish */}
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-1 px-2.5 py-0.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-semibold transition-colors"
              title="Switch between English and Tanglish voice guidance"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{isTanglish ? 'English' : 'Tanglish'}</span>
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

      {/* ── Voice Status Bar (visible only when active) ────────────────────── */}
      {voiceActive && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-4">

            {/* Listening indicator */}
            <span
              className={`flex items-center space-x-1.5 font-bold ${
                isListening ? 'text-emerald-700' : 'text-slate-500'
              }`}
            >
              {isListening ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  <span>👂 Listening...</span>
                </>
              ) : (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  <span>Processing...</span>
                </>
              )}
            </span>

            {/* Last recognised command */}
            {lastCommand && (
              <span className="text-slate-600">
                Heard: <strong className="text-slate-800">"{lastCommand}"</strong>
              </span>
            )}

            {/* Hint */}
            <span className="text-slate-400 text-[11px] ml-auto hidden sm:block">
              Say: Next • Back • Repeat • Confirm • Select candidate one / two / three
            </span>

          </div>
        </div>
      )}
      {/* Main Navigation Header */}
      <header className="bg-white border-b border-stone-200 shadow-sm">

      {/* ── Main Navigation Header ─────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">

            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Vote className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                National E-Voting Portal
              </div>
              <div className="text-[11px] text-slate-500">
              <div className="text-sm font-bold text-stone-900">
                {isTamil
                  ? 'தேசிய மின்னணு வாக்குப்பதிவு'
                  : 'National E-Voting Portal'}
              </div>

              <div className="text-[11px] text-stone-500">
                EPIC:{' '}
                <span className="font-mono font-bold text-stone-700">
                  {voterSession.voterId}
                </span>
                {' '}• {voterSession.constituency}
              </div>
            </div>
          </div>

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
              Dashboard
            </NavLink>

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
              Voting Status
            </NavLink>

            <button
              onClick={handleLogout}
              className="ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit</span>
              <span>
                {isTamil ? 'வெளியேறு' : 'Exit'}
              </span>
            </button>

          </nav>
        </div>
      </header>

      {/* Wallet error */}
      {walletError && (
        <div className="max-w-6xl w-full mx-auto px-4 pt-3">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-xs">
            {walletError}
          </div>
        </div>
      )}

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className={`flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 ${getFontSizeClass()}`}>
        <Outlet context={outletContext} />
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-4 border-t border-slate-800 text-center">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Election Commission of India • Constitutional Secret Ballot</span>
          <span className="text-[11px] text-slate-500">
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