/**
 * VoiceGuidance.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides step-by-step voice guidance for the entire e-voting flow.
 *
 * • Language modes : EN | TANGLISH | BOTH
 * • Senior-friendly: slow speech rate (0.78)
 * • Voice commands : "next", "back", "repeat", "select candidate 1/2/3"
 * • DOES NOT bypass : OTP, eligibility, confirmation, backend, blockchain
 * • DOES NOT store  : voice recordings (Web Speech API is browser-local)
 * • No Tamil Unicode: all Tanglish messages use plain English letters
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Mic, MicOff, Volume2, VolumeX, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VoiceLang = 'EN' | 'TANGLISH' | 'BOTH';

export type VotingStep =
  | 'VOTER_ID'
  | 'PHONE'
  | 'OTP'
  | 'ELIGIBILITY'
  | 'CREDENTIAL'
  | 'CANDIDATE_SELECT'
  | 'CONFIRMATION'
  | 'SUBMITTING'
  | 'SUCCESS'
  | 'IDLE';

interface StepMessage {
  en: string;
  tanglish: string;
}

// ─── All step messages (NO Tamil Unicode anywhere) ────────────────────────────

const STEP_MESSAGES: Record<VotingStep, StepMessage> = {
  VOTER_ID: {
    en: 'Please enter your Voter ID.',
    tanglish: 'Ungaloda Voter ID-ai enter pannunga.',
  },
  PHONE: {
    en: 'Please enter your registered mobile number and give your consent.',
    tanglish: 'Ungaloda registered mobile number-ai enter pannunga, consent-ai confirm pannunga.',
  },
  OTP: {
    en: 'Please enter the OTP sent to your registered mobile number.',
    tanglish: 'Ungaluku OTP anupapattirukku. OTP-ai enter pannunga.',
  },
  ELIGIBILITY: {
    en: 'Your eligibility is being verified. Please wait.',
    tanglish: 'Ungaloda voting eligibility verify pannitu irukku. Konjam wait pannunga.',
  },
  CREDENTIAL: {
    en: 'Your identity is verified. A secure voting credential is being issued.',
    tanglish:
      'Ungaloda identity verify aayiduchu. Secure voting credential issue pannitu irukku.',
  },
  CANDIDATE_SELECT: {
    en: 'Please select the candidate you want to vote for. Candidate name and party symbol are displayed on the screen.',
    tanglish:
      'Neenga vote panna virumbura candidate-ai select pannunga. Candidate name-um party symbol-um screen-la display aagum.',
  },
  CONFIRMATION: {
    en: 'Please check your selected candidate and confirm your vote. Warning: your vote cannot be changed after submission.',
    tanglish:
      'Neenga select panna candidate-ai check panni vote-ai confirm pannunga. Warning: Vote submit pannina apram atha change panna mudiyathu.',
  },
  SUBMITTING: {
    en: 'Your vote is being recorded on the blockchain. Please do not close this page.',
    tanglish:
      'Ungaloda vote blockchain-la record pannitu irukku. Page-ai close pannatheenga.',
  },
  SUCCESS: {
    en: 'Your vote has been successfully recorded. Thank you for voting.',
    tanglish:
      'Ungaloda vote successfully record aayiduchu. Vote pannathukku nandri.',
  },
  IDLE: {
    en: '',
    tanglish: '',
  },
};

// ─── Build the spoken text based on language mode ────────────────────────────

function buildText(step: VotingStep, lang: VoiceLang): string {
  const msg = STEP_MESSAGES[step];
  if (!msg.en && !msg.tanglish) return '';
  switch (lang) {
    case 'EN':
      return msg.en;
    case 'TANGLISH':
      return msg.tanglish;
    case 'BOTH':
      // Say English first, then Tanglish — natural pause between them
      return msg.en + (msg.tanglish ? '  ... ' + msg.tanglish : '');
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface VoiceGuidanceCtx {
  voiceOn: boolean;
  lang: VoiceLang;
  setLang: (l: VoiceLang) => void;
  toggleVoice: () => void;
  speak: (step: VotingStep) => void;
  speakCustom: (text: string) => void;
  repeat: () => void;
  stop: () => void;
  isSpeaking: boolean;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  lastTranscript: string;
  /** Register a callback to handle voice commands on the current page */
  registerCommandHandler: (fn: CommandHandler) => void;
  unregisterCommandHandler: () => void;
}

type CommandHandler = (cmd: string) => void;

interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
}

const VoiceGuidanceContext = createContext<VoiceGuidanceCtx | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const VoiceGuidanceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [voiceOn, setVoiceOn] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vg_voice_on') === 'true';
    } catch {
      return false;
    }
  });

  const [lang, setLangState] = useState<VoiceLang>(() => {
    try {
      return (localStorage.getItem('vg_lang') as VoiceLang) || 'BOTH';
    } catch {
      return 'BOTH';
    }
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');

  const lastTextRef = useRef('');
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const commandHandlerRef = useRef<CommandHandler | null>(null);

  // Persist prefs
  const setLang = useCallback((l: VoiceLang) => {
    setLangState(l);
    try { localStorage.setItem('vg_lang', l); } catch {}
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceOn((prev) => {
      const next = !prev;
      try { localStorage.setItem('vg_voice_on', String(next)); } catch {}
      if (!next) window.speechSynthesis?.cancel();
      return next;
    });
  }, []);

  // ── Core speak ──────────────────────────────────────────────────────────────
  const speakRaw = useCallback(
    (text: string) => {
      if (!voiceOn || !text || !('speechSynthesis' in window)) return;
      lastTextRef.current = text;
      window.speechSynthesis.cancel();

      const utt = new SpeechSynthesisUtterance(text);
      // Always use en-IN so Tanglish is read in English phonetics by the engine
      utt.lang = 'en-IN';
      utt.rate = 0.78;   // senior-friendly slow
      utt.pitch = 1.05;
      utt.volume = 1;

      utt.onstart = () => setIsSpeaking(true);
      utt.onend = () => setIsSpeaking(false);
      utt.onerror = () => setIsSpeaking(false);

      // Small delay lets the browser finish any previous cancel()
      setTimeout(() => window.speechSynthesis.speak(utt), 120);
    },
    [voiceOn]
  );

  const speak = useCallback(
    (step: VotingStep) => {
      const text = buildText(step, lang);
      speakRaw(text);
    },
    [lang, speakRaw]
  );

  const speakCustom = useCallback(
    (text: string) => speakRaw(text),
    [speakRaw]
  );

  const repeat = useCallback(() => {
    if (lastTextRef.current) speakRaw(lastTextRef.current);
  }, [speakRaw]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  // ── Voice commands ──────────────────────────────────────────────────────────
  const handleRecognitionResult = useCallback(
    (raw: string) => {
      const text = raw.toLowerCase().trim();
      setLastTranscript(raw);

      // Forward to page-specific handler first
      if (commandHandlerRef.current) {
        commandHandlerRef.current(text);
        return;
      }
    },
    []
  );

  const startListening = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return;

    stop(); // stop speaking before listening
    const rec = new SR() as BrowserSpeechRecognition;
    recognitionRef.current = rec;
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.continuous = false;

    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const said = Array.from(e.results[0])
        .map((r) => r.transcript)
        .join(' ');
      handleRecognitionResult(said);
    };
    rec.start();
  }, [stop, handleRecognitionResult]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const registerCommandHandler = useCallback((fn: CommandHandler) => {
    commandHandlerRef.current = fn;
  }, []);

  const unregisterCommandHandler = useCallback(() => {
    commandHandlerRef.current = null;
  }, []);

  return (
    <VoiceGuidanceContext.Provider
      value={{
        voiceOn,
        lang,
        setLang,
        toggleVoice,
        speak,
        speakCustom,
        repeat,
        stop,
        isSpeaking,
        isListening,
        startListening,
        stopListening,
        lastTranscript,
        registerCommandHandler,
        unregisterCommandHandler,
      }}
    >
      {children}
    </VoiceGuidanceContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceGuidance() {
  const ctx = useContext(VoiceGuidanceContext);
  if (!ctx) throw new Error('useVoiceGuidance must be inside VoiceGuidanceProvider');
  return ctx;
}

/**
 * useStepVoice — convenience hook for voting-step components.
 * Call it with the current step and it auto-speaks on mount.
 * Also registers voice commands: next, back, repeat.
 */
export function useStepVoice(
  step: VotingStep,
  opts?: {
    onNext?: () => void;
    onBack?: () => void;
    /** extra commands: { 'select candidate 1': fn, ... } */
    extraCommands?: Record<string, () => void>;
  }
) {
  const vg = useVoiceGuidance();

  // Speak on mount (with a small delay so page renders first)
  useEffect(() => {
    if (!vg.voiceOn || step === 'IDLE') return;
    const t = setTimeout(() => vg.speak(step), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, vg.voiceOn, vg.lang]);

  // Register command handler
  useEffect(() => {
    vg.registerCommandHandler((cmd) => {
      if (cmd.includes('repeat') || cmd.includes('again')) {
        vg.repeat();
        return;
      }
      if ((cmd.includes('next') || cmd.includes('proceed')) && opts?.onNext) {
        opts.onNext();
        return;
      }
      if ((cmd.includes('back') || cmd.includes('previous')) && opts?.onBack) {
        opts.onBack();
        return;
      }
      if (opts?.extraCommands) {
        for (const [key, action] of Object.entries(opts.extraCommands)) {
          if (cmd.includes(key)) {
            action();
            return;
          }
        }
      }
    });
    return () => vg.unregisterCommandHandler();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vg, opts?.onNext, opts?.onBack]);
}

// ─── Floating Control Bar (renders on every page) ─────────────────────────────

export const VoiceGuidanceBar: React.FC = () => {
  const vg = useVoiceGuidance();
  const [expanded, setExpanded] = useState(false);

  const langLabels: Record<VoiceLang, string> = {
    EN: 'English',
    TANGLISH: 'Tanglish',
    BOTH: 'EN + TG',
  };
  const langCycle: VoiceLang[] = ['EN', 'TANGLISH', 'BOTH'];

  const cycleLanguage = () => {
    const idx = langCycle.indexOf(vg.lang);
    vg.setLang(langCycle[(idx + 1) % langCycle.length]);
  };

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2"
      style={{ pointerEvents: 'none' }}
    >
      {/* ── Expanded panel ── */}
      {expanded && vg.voiceOn && (
        <div
          className="bg-slate-900 border border-blue-500 rounded-2xl shadow-2xl px-4 py-3 flex flex-col gap-3 w-72"
          style={{ pointerEvents: 'auto' }}
        >
          {/* Language selector */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
              Language
            </span>
            <button
              onClick={cycleLanguage}
              className="px-3 py-1 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold transition-all"
            >
              {langLabels[vg.lang]}
            </button>
          </div>

          {/* Mic / Listen */}
          <button
            onClick={vg.isListening ? vg.stopListening : vg.startListening}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all
              ${vg.isListening
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'}`}
          >
            {vg.isListening ? (
              <><MicOff className="w-4 h-4" /> Stop Listening</>
            ) : (
              <><Mic className="w-4 h-4" /> Say a Command</>
            )}
          </button>

          {/* Last transcript */}
          {vg.lastTranscript && (
            <div className="bg-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 truncate">
              Heard: "{vg.lastTranscript}"
            </div>
          )}

          {/* Voice command hints */}
          <div className="text-[11px] text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-400">Commands: </span>
            "repeat" · "next" · "back" · "select candidate 1" · "select candidate 2"
          </div>
        </div>
      )}

      {/* ── Main pill bar ── */}
      <div
        className={`flex items-center gap-1 px-3 py-2 rounded-full shadow-2xl border transition-all
          ${vg.voiceOn
            ? 'bg-slate-900 border-blue-500'
            : 'bg-slate-800 border-slate-600 opacity-80'}`}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Voice ON/OFF */}
        <button
          onClick={vg.toggleVoice}
          title={vg.voiceOn ? 'Turn voice OFF' : 'Turn voice ON'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all
            ${vg.voiceOn
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
        >
          {vg.voiceOn ? (
            <><Volume2 className="w-3.5 h-3.5" /> Voice ON</>
          ) : (
            <><VolumeX className="w-3.5 h-3.5" /> Voice OFF</>
          )}
        </button>

        {vg.voiceOn && (
          <>
            {/* Repeat */}
            <button
              onClick={vg.repeat}
              title="Repeat last message"
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Stop speaking */}
            <button
              onClick={vg.stop}
              disabled={!vg.isSpeaking}
              title="Stop speaking"
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition-all"
            >
              <VolumeX className="w-3.5 h-3.5" />
            </button>

            {/* Language pill */}
            <button
              onClick={cycleLanguage}
              title="Switch language"
              className="px-2 py-1 rounded-full bg-slate-700 hover:bg-slate-600 text-[11px] font-bold text-slate-200 transition-all"
            >
              {langLabels[vg.lang]}
            </button>

            {/* Expand/collapse */}
            <button
              onClick={() => setExpanded((p) => !p)}
              title="More options"
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
            >
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </>
        )}

        {/* Speaking indicator */}
        {vg.voiceOn && vg.isSpeaking && (
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse ml-1" />
        )}
      </div>
    </div>
  );
};
