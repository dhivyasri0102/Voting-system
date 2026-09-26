/**
 * VoiceGuidance.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Tanglish Voice Assistant & Continuous Speech Engine for E-Voting Flow.
 *
 * • 100% Tanglish Tamil (plain English phonetics for browser SpeechSynthesis)
 * • Zero Tamil Unicode in TTS output for crystal-clear Indian English synthesis
 * • Automatic Speak → Listen → Understand → Execute → Next Step loop
 * • Auto-restarting continuous speech recognition without requiring mic taps
 * • Fully respects OTP, eligibility, token, confirmation, and blockchain validation
 * • Browser-local only — zero audio storage
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
import { Volume2, VolumeX, Mic } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VotingStep =
  | 'LANDING'
  | 'VOTER_ID'
  | 'AADHAAR'
  | 'OTP'
  | 'FINGERPRINT_REGISTER'
  | 'FINGERPRINT_AUTH'
  | 'ELIGIBILITY'
  | 'CREDENTIAL'
  | 'DASHBOARD'
  | 'CANDIDATE_SELECT'
  | 'CONFIRMATION'
  | 'SUBMITTING'
  | 'SUCCESS'
  | 'IDLE';

// ─── All step messages (100% Pure Tanglish — NO Tamil Unicode) ───────────────

export const STEP_MESSAGES: Record<VotingStep, string> = {
  LANDING:
    'Voice assistant activate aayiduchu. National E-Voting Portal. Citizen Voter Login-ku poga Next nu sollunga.',
  VOTER_ID:
    'Ungaloda Voter ID-ai enter pannunga. Apram Next nu sollunga.',
  AADHAAR:
    'Ungaloda mobile number-ai enter panni, consent-ai confirm pannunga. Apram Next nu sollunga.',
  OTP:
    'Ungaluku OTP anupapattirukku. OTP-ai enter pannunga. Apram Confirm nu sollunga.',
  FINGERPRINT_REGISTER:
    'Ungaloda Voter ID verify aayiduchu. Fingerprint register panna Register Fingerprint button-ai click pannunga, illa Fingerprint nu sollunga.',
  FINGERPRINT_AUTH:
    'Ungaloda Voter ID verify aayiduchu. Fingerprint verify panna sensor-la viral veinga, illa Authenticate nu sollunga.',
  ELIGIBILITY:
    'Ungaloda voting eligibility verify pannitu irukku. Konjam wait pannunga.',
  CREDENTIAL:
    'Ungaloda identity verify aayiduchu. Secure voting credential issue pannitu irukku. Next nu sollunga.',
  DASHBOARD:
    'Voter dashboard. Vote panna election-ai choose panni, Next nu sollunga.',
  CANDIDATE_SELECT:
    'Vote panna candidate-ai select pannunga. Candidate name-um party symbol-um screen-la irukku. Select candidate one, two, illa three nu sollunga. Apram Next nu sollunga.',
  CONFIRMATION:
    'Ungaloda selection-ai check pannunga. Vote submit panna Confirm nu sollunga. Candidate-ai maatha Back nu sollunga.',
  SUBMITTING:
    'Ungaloda vote blockchain-la record pannitu irukku. Page-ai close pannatheenga.',
  SUCCESS:
    'Ungaloda vote successfully record aayiduchu. Cryptographic receipt screen-la display aagiduchu. Vote pannadhukku nandri.',
  IDLE: '',
};

// ─── Command Normalizer (English + Tanglish) ──────────────────────────────────

export function normalizeVoiceCommand(raw: string): string {
  const t = raw
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Select Candidate 1..5 (checked first)
  if (
    /\b(select candidate (one|1)|candidate (one|1)|first candidate|number (one|1)|mutha candidate|onnu|first|number 1)\b/.test(
      t
    ) || t === '1' || t === 'one' || t === 'onnu'
  ) {
    return 'SELECT_1';
  }

  if (
    /\b(select candidate (two|2)|candidate (two|2)|second candidate|number (two|2)|rendavathu candidate|rendu|second|number 2)\b/.test(
      t
    ) || t === '2' || t === 'two' || t === 'rendu'
  ) {
    return 'SELECT_2';
  }

  if (
    /\b(select candidate (three|3)|candidate (three|3)|third candidate|number (three|3)|moonavathu candidate|moonu|third|number 3)\b/.test(
      t
    ) || t === '3' || t === 'three' || t === 'moonu'
  ) {
    return 'SELECT_3';
  }

  if (
    /\b(select candidate (four|4)|candidate (four|4)|fourth candidate|number (four|4)|naalu|naangu|four|fourth|number 4)\b/.test(
      t
    ) || t === '4' || t === 'four' || t === 'naalu'
  ) {
    return 'SELECT_4';
  }

  if (
    /\b(select candidate (five|5)|candidate (five|5)|fifth candidate|number (five|5)|ainthavathu candidate|anju|aindhu|five|fifth|number 5)\b/.test(
      t
    ) || t === '5' || t === 'five' || t === 'anju'
  ) {
    return 'SELECT_5';
  }

  // Next / Continue / Proceed
  if (
    /\b(next|continue|proceed|forward|munaadi|munaadi po|munnadi|munnadi po|aduthu|aaduthu|nextu|next page|ponga|go|polam|vaanga)\b/.test(
      t
    )
  ) {
    return 'NEXT';
  }

  // Back / Previous / Change
  if (
    /\b(back|previous|thirumbi|thirumbi po|piragu|pinnadi|pinnadi po|go back|change|maathu|maatha|thirumba)\b/.test(
      t
    )
  ) {
    return 'BACK';
  }

  // Repeat / Again
  if (
    /\b(repeat|again|marubadi|marubadi sollu|marubadiyum|marupadi|sollu|mela sollu|once more|oru murai|pesu|puriyala|kekkala)\b/.test(
      t
    )
  ) {
    return 'REPEAT';
  }

  // Confirm / Submit / Vote
  if (
    /\b(confirm|confirm pannunga|submit|yes confirm|vote|seri|yes|ok|okk|sure|aama|aam|podu|kudu|panre)\b/.test(
      t
    )
  ) {
    return 'CONFIRM';
  }

  // Fingerprint / Biometric / Register / Authenticate
  if (
    /\b(fingerprint|biometric|kairegai|kai regai|viral|sensor|finger print)\b/.test(
      t
    )
  ) {
    return 'FINGERPRINT';
  }

  if (
    /\b(register|register fingerprint|register pannu|pathivu|pathivu sei)\b/.test(
      t
    )
  ) {
    return 'REGISTER';
  }

  if (
    /\b(authenticate|verify|auth|saripaaru|login|ulnuzhai)\b/.test(
      t
    )
  ) {
    return 'AUTHENTICATE';
  }

  // Cancel / Stop
  if (/\b(cancel|stop|vendam|exit|close|mudi|niruthu)\b/.test(t)) {
    return 'CANCEL';
  }

  return '';
}

// ─── Context ──────────────────────────────────────────────────────────────────

export type CommandHandler = (cmd: string, rawText?: string) => void;

interface VoiceGuidanceCtx {
  voiceOn: boolean;
  toggleVoice: () => void;
  speak: (step: VotingStep, customSuffix?: string) => void;
  speakCustom: (text: string, onEnd?: () => void) => void;
  repeat: () => void;
  stop: () => void;
  isSpeaking: boolean;
  isListening: boolean;
  lastTranscript: string;
  registerCommandHandler: (fn: CommandHandler) => void;
  unregisterCommandHandler: () => void;
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

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');

  const voiceOnRef = useRef(voiceOn);
  const isSpeakingRef = useRef(false);
  const lastTextRef = useRef('');
  const activeUttRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<any>(null);
  const commandHandlerRef = useRef<CommandHandler | null>(null);
  const restartTimerRef = useRef<any>(null);
  const cachedVoicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    voiceOnRef.current = voiceOn;
  }, [voiceOn]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        try {
          const vs = window.speechSynthesis.getVoices();
          if (vs && vs.length > 0) {
            cachedVoicesRef.current = vs;
          }
        } catch {}
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const stopListeningRef = useRef<() => void>(() => {});
  const startListeningRef = useRef<() => void>(() => {});
  const speakCustomRef = useRef<(text: string, onEnd?: () => void) => void>(() => {});

  // ── Speech Recognition Engine ───────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);
  stopListeningRef.current = stopListening;

  const startListening = useCallback(() => {
    if (!voiceOnRef.current || isSpeakingRef.current || typeof window === 'undefined') {
      return;
    }

    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    try {
      const rec = new SR();
      recognitionRef.current = rec;
      rec.lang = 'en-IN';
      rec.interimResults = false;
      rec.maxAlternatives = 3;
      rec.continuous = false;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (e: any) => {
        let text = '';
        if (e.results && e.results.length > 0) {
          const lastRes = e.results[e.results.length - 1];
          if (lastRes && lastRes[0]) {
            text = lastRes[0].transcript;
          }
        }
        if (!text && e.results[0] && e.results[0][0]) {
          text = e.results[0][0].transcript;
        }

        if (text) {
          const cleaned = text.trim();
          setLastTranscript(cleaned);
          const cmd = normalizeVoiceCommand(cleaned);

          if (cmd === 'REPEAT') {
            if (lastTextRef.current) {
              speakCustomRef.current(lastTextRef.current);
            }
            return;
          }

          if (commandHandlerRef.current) {
            commandHandlerRef.current(cmd, cleaned);
          }
        }
      };

      rec.onerror = (e: any) => {
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
        // Automatically restart listening if Voice is active and not speaking
        if (voiceOnRef.current && !isSpeakingRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (voiceOnRef.current && !isSpeakingRef.current) {
              startListeningRef.current();
            }
          }, 350);
        }
      };

      rec.start();
    } catch (err) {
      setIsListening(false);
    }
  }, []);
  startListeningRef.current = startListening;

  // ── Speech Synthesis Engine ─────────────────────────────────────────────────
  const speakCustom = useCallback((text: string, onEnd?: () => void) => {
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onEnd?.();
      return;
    }

    lastTextRef.current = text;
    stopListeningRef.current(); // Pause listening while speaking to avoid feedback loop

    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {}

    const utt = new SpeechSynthesisUtterance(text);
    activeUttRef.current = utt; // Prevent V8 garbage collection

    // Best voice selection (en-IN or Indian English)
    try {
      const liveVoices = window.speechSynthesis.getVoices();
      const voices = liveVoices && liveVoices.length > 0 ? liveVoices : cachedVoicesRef.current;
      if (voices && voices.length > 0) {
        const match =
          voices.find((v) => v.lang.toLowerCase().startsWith('en-in')) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('en'));
        if (match) utt.voice = match;
      }
    } catch {}

    utt.lang = 'en-IN';
    utt.rate = 0.82; // Clear, senior-friendly pacing
    utt.pitch = 1.0;
    utt.volume = 1;

    isSpeakingRef.current = true;
    setIsSpeaking(true);

    utt.onstart = () => {
      isSpeakingRef.current = true;
      setIsSpeaking(true);
    };

    utt.onend = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      activeUttRef.current = null;
      onEnd?.();

      // Automatically start listening after instruction finishes speaking
      if (voiceOnRef.current) {
        setTimeout(() => {
          startListeningRef.current();
        }, 250);
      }
    };

    utt.onerror = (e) => {
      console.warn('VoiceGuidance utterance error:', e);
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      activeUttRef.current = null;
      onEnd?.();

      if (voiceOnRef.current) {
        setTimeout(() => {
          startListeningRef.current();
        }, 250);
      }
    };

    setTimeout(() => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utt);
      } catch (err) {
        console.warn('Speech synthesis speak error:', err);
        isSpeakingRef.current = false;
        setIsSpeaking(false);
      }
    }, 60);
  }, []);
  speakCustomRef.current = speakCustom;

  const speak = useCallback((step: VotingStep, customSuffix = '') => {
    if (!voiceOnRef.current) return;
    const baseMsg = STEP_MESSAGES[step] || '';
    const fullText = customSuffix ? `${baseMsg} ${customSuffix}`.trim() : baseMsg;
    if (fullText) {
      speakCustomRef.current(fullText);
    }
  }, []);

  const repeat = useCallback(() => {
    if (lastTextRef.current) {
      speakCustomRef.current(lastTextRef.current);
    }
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    activeUttRef.current = null;
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    stopListeningRef.current();
  }, []);

  const toggleVoice = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
    } catch {}

    setVoiceOn((prev) => {
      const next = !prev;
      voiceOnRef.current = next;
      try {
        localStorage.setItem('vg_voice_on', String(next));
      } catch {}

      if (!next) {
        stop();
      }
      return next;
    });
  }, [stop]);

  const registerCommandHandler = useCallback((fn: CommandHandler) => {
    commandHandlerRef.current = fn;
  }, []);

  const unregisterCommandHandler = useCallback(() => {
    commandHandlerRef.current = null;
  }, []);

  const contextValue = React.useMemo<VoiceGuidanceCtx>(
    () => ({
      voiceOn,
      toggleVoice,
      speak,
      speakCustom,
      repeat,
      stop,
      isSpeaking,
      isListening,
      lastTranscript,
      registerCommandHandler,
      unregisterCommandHandler,
    }),
    [
      voiceOn,
      toggleVoice,
      speak,
      speakCustom,
      repeat,
      stop,
      isSpeaking,
      isListening,
      lastTranscript,
      registerCommandHandler,
      unregisterCommandHandler,
    ]
  );

  return (
    <VoiceGuidanceContext.Provider value={contextValue}>
      {children}
    </VoiceGuidanceContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceGuidance() {
  const ctx = useContext(VoiceGuidanceContext);
  if (!ctx) {
    throw new Error('useVoiceGuidance must be inside VoiceGuidanceProvider');
  }
  return ctx;
}

/**
 * useStepVoice — convenience hook for voting steps.
 * Automatically speaks the Tanglish instruction on mount, then automatically listens.
 */
export function useStepVoice(
  step: VotingStep,
  opts?: {
    customSuffix?: string;
    onNext?: () => void;
    onBack?: () => void;
    onConfirm?: () => void;
    extraCommands?: Record<string, () => void>;
  }
) {
  const vg = useVoiceGuidance();

  // Speak step instruction on mount
  useEffect(() => {
    if (!vg.voiceOn || step === 'IDLE') return;
    const t = setTimeout(() => {
      vg.speak(step, opts?.customSuffix);
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, vg.voiceOn]);

  // Register command routing
  useEffect(() => {
    vg.registerCommandHandler((cmd) => {
      if (cmd === 'REPEAT') {
        vg.repeat();
        return;
      }
      if (cmd === 'NEXT' && opts?.onNext) {
        opts.onNext();
        return;
      }
      if (cmd === 'BACK' && opts?.onBack) {
        opts.onBack();
        return;
      }
      if (cmd === 'CONFIRM' && opts?.onConfirm) {
        opts.onConfirm();
        return;
      }
      if (opts?.extraCommands && opts.extraCommands[cmd]) {
        opts.extraCommands[cmd]();
        return;
      }
    });

    return () => {
      vg.unregisterCommandHandler();
    };
  }, [vg, opts?.onNext, opts?.onBack, opts?.onConfirm, opts?.extraCommands]);
}

// ─── Floating Single Voice Assistant Bar ─────────────────────────────────────

export const VoiceGuidanceBar: React.FC = () => {
  const vg = useVoiceGuidance();
  const [hasSpeechSupport, setHasSpeechSupport] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
        setHasSpeechSupport(false);
      }
    }
  }, []);

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-2xl border backdrop-blur-md transition-all ${
          vg.voiceOn
            ? 'bg-slate-900/95 border-emerald-500 text-white ring-2 ring-emerald-500/20'
            : 'bg-slate-900/90 border-slate-700 text-slate-300'
        }`}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Toggle Voice Button */}
        <button
          id="btn-main-voice-toggle"
          onClick={vg.toggleVoice}
          title={vg.voiceOn ? 'Turn Voice Assistant OFF' : 'Turn Voice Assistant ON'}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
            vg.voiceOn
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-600'
          }`}
        >
          {vg.voiceOn ? (
            <>
              <Volume2 className="w-4 h-4 text-white" />
              <span>Voice ON</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-amber-400" />
              <span>Voice Assistant (Voice ON)</span>
            </>
          )}
        </button>

        {!hasSpeechSupport && (
          <span className="text-[11px] text-amber-400 px-2 py-0.5 bg-amber-950/60 rounded border border-amber-800">
            Use Chrome or Edge for voice input
          </span>
        )}

        {/* Live Status Indicator (When ON) */}
        {vg.voiceOn && (
          <div className="flex items-center gap-2 text-xs font-medium pl-1 border-l border-slate-700">
            {vg.isSpeaking ? (
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Speaking...</span>
              </span>
            ) : vg.isListening ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Listening...</span>
              </span>
            ) : (
              <span className="text-slate-400">Ready</span>
            )}

            {vg.lastTranscript && (
              <span className="text-[11px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md truncate max-w-[140px]">
                "{vg.lastTranscript}"
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

