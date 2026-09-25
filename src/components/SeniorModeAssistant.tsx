import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mic, MicOff, Volume2, VolumeX, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

// ──────────────────────────────────────────────────────────────────────────────
// Page definitions: ordered list of pages the assistant can navigate between
// ──────────────────────────────────────────────────────────────────────────────
interface PageDef {
  path: string;
  label: string;        // spoken + displayed label
  labelTa: string;      // Tamil label
  keywords: string[];   // voice keywords that trigger navigation to this page
}

const PAGES: PageDef[] = [
  {
    path: '/',
    label: 'Home Page — Election Commission of India',
    labelTa: 'முகப்பு பக்கம் — இந்திய தேர்தல் ஆணையம்',
    keywords: ['home', 'start', 'landing', 'main', 'beginning', 'முகப்பு'],
  },
  {
    path: '/voter/login',
    label: 'Voter Login — Enter your Voter ID and mobile OTP',
    labelTa: 'வாக்காளர் உள்நுழைவு — உங்கள் வாக்காளர் அடையாள அட்டை மற்றும் மொபைல் OTP உள்ளிடுக',
    keywords: ['login', 'voter login', 'sign in', 'authenticate', 'voter', 'உள்நுழைவு', 'வாக்காளர்'],
  },
  {
    path: '/voter/dashboard',
    label: 'Voter Dashboard — Choose an election to vote in',
    labelTa: 'வாக்காளர் டாஷ்போர்டு — வாக்களிக்க ஒரு தேர்தலை தேர்ந்தெடுக்கவும்',
    keywords: ['dashboard', 'elections', 'choose election', 'select election', 'vote', 'டாஷ்போர்டு'],
  },
  {
    path: '/voter/status',
    label: 'Vote Status — Check if your vote was recorded',
    labelTa: 'வாக்கு நிலை — உங்கள் வாக்கு பதிவு செய்யப்பட்டதா என சரிபார்க்கவும்',
    keywords: ['status', 'check', 'receipt', 'confirm', 'verified', 'நிலை', 'சரிபார்'],
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function findPageByPath(path: string): PageDef | undefined {
  return PAGES.find((p) => p.path === path || path.startsWith(p.path.replace(/\/$/, '') + '/'));
}

function findPageByKeyword(text: string): PageDef | undefined {
  const lower = text.toLowerCase();
  return PAGES.find((p) => p.keywords.some((kw) => lower.includes(kw)));
}

function getNextPage(currentPath: string): PageDef {
  const idx = PAGES.findIndex((p) => currentPath.startsWith(p.path === '/' ? '/' : p.path));
  const nextIdx = idx === -1 || idx >= PAGES.length - 1 ? 0 : idx + 1;
  return PAGES[nextIdx];
}

// ──────────────────────────────────────────────────────────────────────────────
// SeniorModeAssistant Component
// ──────────────────────────────────────────────────────────────────────────────
export const SeniorModeAssistant: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessibility, setAccessibility } = useAuth();

  const isSeniorMode = accessibility.seniorCitizenMode;
  const isTamil = accessibility.language === 'ta';

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speakQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);

  // ── Text-to-speech ──────────────────────────────────────────────────────────
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = isTamil ? 'ta-IN' : 'en-IN';
    utt.rate = 0.85;
    utt.pitch = 1;
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    utt.onend = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      onEnd?.();
    };
    utt.onerror = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      onEnd?.();
    };
    window.speechSynthesis.speak(utt);
  }, [isTamil]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    isSpeakingRef.current = false;
    setIsSpeaking(false);
  }, []);

  // ── Announce current page when route changes ────────────────────────────────
  useEffect(() => {
    if (!isSeniorMode) return;
    const page = findPageByPath(location.pathname);
    if (!page) return;

    const label = isTamil ? page.labelTa : page.label;
    const prompt = isTamil
      ? `இப்போது நீங்கள் இருக்கும் பக்கம்: ${label}. அடுத்த பக்கத்திற்கு செல்ல "அடுத்து" என்று சொல்லுங்கள் அல்லது பக்கத்தின் பெயரை சொல்லுங்கள்.`
      : `You are now on: ${label}. Say "next" to go to the next page, or say the name of any page to navigate there.`;

    // Short delay so the page renders first
    const t = setTimeout(() => speak(prompt), 600);
    return () => clearTimeout(t);
  }, [location.pathname, isSeniorMode, isTamil, speak]);

  // ── Speech Recognition ──────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusMsg('Speech recognition not supported in this browser.');
      return;
    }

    stopSpeaking();

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = isTamil ? 'ta-IN' : 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setIsListening(true);
      setStatusMsg(isTamil ? 'கேட்கிறேன்...' : 'Listening...');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const said = Array.from(event.results[0])
        .map((r) => r.transcript)
        .join(' ');
      setTranscript(said);
      handleVoiceCommand(said);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      setStatusMsg(`Error: ${event.error}`);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [isTamil, stopSpeaking]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // ── Handle voice or text command ────────────────────────────────────────────
  const handleVoiceCommand = useCallback((text: string) => {
    const lower = text.toLowerCase().trim();
    setStatusMsg(`"${text}"`);

    // "next" → go to next page in sequence
    if (lower.includes('next') || lower.includes('அடுத்து') || lower.includes('forward')) {
      const next = getNextPage(location.pathname);
      speak(
        isTamil ? `${next.labelTa} பக்கத்திற்கு செல்கிறேன்.` : `Navigating to ${next.label}.`,
        () => navigate(next.path)
      );
      return;
    }

    // "back" / "previous"
    if (lower.includes('back') || lower.includes('previous') || lower.includes('முந்தைய')) {
      navigate(-1);
      speak(isTamil ? 'முந்தைய பக்கத்திற்கு செல்கிறேன்.' : 'Going back to previous page.');
      return;
    }

    // "home"
    if (lower.includes('home') || lower.includes('முகப்பு')) {
      speak(isTamil ? 'முகப்பு பக்கத்திற்கு செல்கிறேன்.' : 'Navigating to Home.', () => navigate('/'));
      return;
    }

    // keyword match against page list
    const matched = findPageByKeyword(lower);
    if (matched) {
      const label = isTamil ? matched.labelTa : matched.label;
      speak(
        isTamil ? `${label} பக்கத்திற்கு செல்கிறேன்.` : `Navigating to ${label}.`,
        () => navigate(matched.path)
      );
      return;
    }

    // "what page" / "where am i"
    if (lower.includes('where') || lower.includes('what page') || lower.includes('என்ன பக்கம்')) {
      const page = findPageByPath(location.pathname);
      if (page) speak(isTamil ? `நீங்கள் இப்போது ${page.labelTa} இல் இருக்கிறீர்கள்.` : `You are currently on ${page.label}.`);
      return;
    }

    // "repeat" / "again"
    if (lower.includes('repeat') || lower.includes('again') || lower.includes('மீண்டும்')) {
      const page = findPageByPath(location.pathname);
      if (page) {
        const label = isTamil ? page.labelTa : page.label;
        speak(isTamil ? `நீங்கள் ${label} இல் இருக்கிறீர்கள்.` : `You are on ${label}.`);
      }
      return;
    }

    speak(
      isTamil
        ? 'மன்னிக்கவும், புரியவில்லை. "அடுத்து", "முந்தைய", அல்லது பக்கத்தின் பெயரை சொல்லுங்கள்.'
        : 'Sorry, I did not understand. Say "next", "back", "home", "login", "dashboard", or "status".'
    );
  }, [location.pathname, navigate, speak, isTamil]);

  // ── "Any key / Enter" → next page ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Only activate when senior mode is ON and not in an input/textarea
      if (!isSeniorMode) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Enter' || e.key === 'ArrowRight') {
        const next = getNextPage(location.pathname);
        navigate(next.path);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isSeniorMode, location.pathname, navigate]);

  // ── Toggle senior mode ──────────────────────────────────────────────────────
  const toggleSeniorMode = () => {
    const next = !isSeniorMode;
    setAccessibility((prev) => ({ ...prev, seniorCitizenMode: next }));
    if (next) {
      setShowPanel(true);
      speak(
        isTamil
          ? 'மூத்த குடிமக்கள் பயன்முறை இயக்கப்பட்டது. நான் ஒவ்வொரு பக்கத்தையும் படிப்பேன்.'
          : 'Senior Mode enabled. I will read out every page for you.'
      );
    } else {
      stopSpeaking();
      stopListening();
      setShowPanel(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  const currentPage = findPageByPath(location.pathname);
  const currentLabel = currentPage
    ? isTamil ? currentPage.labelTa : currentPage.label
    : location.pathname;

  return (
    <>
      {/* ── Floating Senior Mode toggle button ── */}
      <button
        onClick={toggleSeniorMode}
        title={isSeniorMode ? 'Disable Senior Mode' : 'Enable Senior Mode'}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl font-bold text-sm transition-all
          ${isSeniorMode
            ? 'bg-amber-500 text-white ring-4 ring-amber-300 animate-pulse-slow'
            : 'bg-slate-800 text-amber-400 border border-amber-500 hover:bg-slate-700'
          }`}
      >
        <Volume2 className="w-5 h-5" />
        {isSeniorMode
          ? isTamil ? 'மூத்தோர் பயன்முறை இயக்கம்' : 'Senior Mode ON'
          : isTamil ? 'மூத்தோர் பயன்முறை' : 'Senior Mode'}
      </button>

      {/* ── Senior Mode Panel ── */}
      {isSeniorMode && showPanel && (
        <div className="fixed bottom-24 right-6 z-50 w-80 bg-slate-900 border border-amber-500 rounded-2xl shadow-2xl p-5 flex flex-col gap-4">
          {/* Current page */}
          <div>
            <p className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-1">
              {isTamil ? 'தற்போதைய பக்கம்' : 'Current Page'}
            </p>
            <p className="text-white text-sm font-semibold leading-snug">{currentLabel}</p>
          </div>

          {/* Status / transcript */}
          {statusMsg && (
            <div className="bg-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300">
              {statusMsg}
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2">
            {/* Mic */}
            <button
              onClick={isListening ? stopListening : startListening}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all
                ${isListening
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isListening
                ? isTamil ? 'நிறுத்து' : 'Stop'
                : isTamil ? 'பேசுங்கள்' : 'Speak'}
            </button>

            {/* Stop speaking */}
            <button
              onClick={stopSpeaking}
              disabled={!isSpeaking}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:opacity-40 transition-all"
            >
              <VolumeX className="w-4 h-4" />
              {isTamil ? 'நிறுத்து' : 'Mute'}
            </button>
          </div>

          {/* Next page quick button */}
          <button
            onClick={() => {
              const next = getNextPage(location.pathname);
              speak(
                isTamil ? `${next.labelTa} பக்கத்திற்கு செல்கிறேன்.` : `Going to ${next.label}.`,
                () => navigate(next.path)
              );
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all"
          >
            {isTamil ? 'அடுத்த பக்கம்' : 'Next Page'}
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Page list */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-semibold">
              {isTamil ? 'வேகமான வழிசெலுத்தல்' : 'Quick Navigation'}
            </p>
            <div className="flex flex-col gap-1">
              {PAGES.map((p) => (
                <button
                  key={p.path}
                  onClick={() => {
                    speak(
                      isTamil ? `${p.labelTa} பக்கத்திற்கு செல்கிறேன்.` : `Going to ${p.label}.`,
                      () => navigate(p.path)
                    );
                  }}
                  className={`text-left text-xs px-3 py-2 rounded-lg transition-all font-medium
                    ${location.pathname === p.path
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                >
                  {isTamil ? p.labelTa.split('—')[0].trim() : p.label.split('—')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          {/* Hint */}
          <p className="text-xs text-slate-500 text-center leading-relaxed">
            {isTamil
              ? '💡 "அடுத்து", "முந்தைய", "வீடு", "உள்நுழைவு" என்று சொல்லுங்கள்'
              : '💡 Say "next", "back", "home", "login", "dashboard" or "status"'}
          </p>
        </div>
      )}
    </>
  );
};
