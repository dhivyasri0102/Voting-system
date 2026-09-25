/**
 * Voice Assistance & Speech Narration Engine
 * Designed for rural, illiterate, and elderly voters.
 *
 * Supports:
 * - Tamil Speech Synthesis (`ta-IN`)
 * - English Speech Synthesis (`en-IN`)
 * - Step-by-step vocal guidance and audio reading of candidates & symbols
 *
 * ✅ BUG FIX: Tamil voice is loaded asynchronously in Chrome/Edge.
 * getVoices() returns [] on first call. We must wait for onvoiceschanged
 * or retry after the voices are populated.
 */

export class VoiceAssistant {
  private static synth: SpeechSynthesis | null =
    typeof window !== 'undefined' ? window.speechSynthesis : null;
  private static isSpeaking = false;

  public static isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public static cancel(): void {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }

  /**
   * Internal helper: resolves the best available voice for a given language.
   * Waits for onvoiceschanged if voices aren't loaded yet (async Chrome behaviour).
   */
  private static getVoice(lang: 'en' | 'ta'): Promise<SpeechSynthesisVoice | null> {
    return new Promise((resolve) => {
      if (!this.synth) return resolve(null);

      const langCode = lang === 'ta' ? 'ta' : 'en';

      const findVoice = () => {
        const voices = this.synth!.getVoices();
        const match = voices.find((v) => v.lang.startsWith(langCode));
        return match ?? null;
      };

      const voices = this.synth.getVoices();
      if (voices.length > 0) {
        // Voices already loaded
        resolve(findVoice());
      } else {
        // Wait for async voice loading (Chrome)
        const onLoaded = () => {
          this.synth!.onvoiceschanged = null;
          resolve(findVoice());
        };
        this.synth.onvoiceschanged = onLoaded;

        // Fallback timeout: if voices never fire, proceed without a matched voice
        setTimeout(() => {
          if (this.synth) this.synth.onvoiceschanged = null;
          resolve(null);
        }, 2500);
      }
    });
  }

  public static async speak(
    text: string,
    lang: 'en' | 'ta' = 'ta',
    onEnd?: () => void
  ): Promise<void> {
    if (!this.synth) return;

    this.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
    utterance.rate = lang === 'ta' ? 0.85 : 0.95; // Slightly slower for Tamil clarity
    utterance.pitch = 1.0;

    // ✅ BUG FIX: Wait for the voice list to be ready before selecting Tamil voice
    const voice = await this.getVoice(lang);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
    };

    this.synth.speak(utterance);
  }

  public static async narrateCandidate(
    candidate: {
      name: string;
      party?: string;
      symbol?: string;
      description?: string;
      orderNumber?: number;
    },
    lang: 'en' | 'ta' = 'ta'
  ): Promise<void> {
    if (lang === 'ta') {
      const symbolDesc = candidate.symbol ? `சின்னம்: ${candidate.symbol}` : '';
      const text = `வேட்பாளர் எண் ${candidate.orderNumber || ''}: ${candidate.name}. கட்சி: ${candidate.party || 'சுயேச்சை'}. ${symbolDesc}.`;
      await this.speak(text, 'ta');
    } else {
      const text = `Candidate number ${candidate.orderNumber || ''}: ${candidate.name}. Party: ${candidate.party || 'Independent'}. Symbol: ${candidate.symbol || ''}.`;
      await this.speak(text, 'en');
    }
  }

  public static async narrateVerificationSuccess(
    voterName: string,
    constituency: string,
    lang: 'en' | 'ta' = 'ta'
  ): Promise<void> {
    if (lang === 'ta') {
      const text = `வணக்கம் ${voterName}. உங்கள் வாக்காளர் சரிபார்ப்பு வெற்றிகரமாக முடிந்தது. தொகுதி: ${constituency}. உங்கள் ரகசிய வாக்குச்சீட்டு தயாராக உள்ளது.`;
      await this.speak(text, 'ta');
    } else {
      const text = `Welcome ${voterName}. Your voter verification is successful for constituency ${constituency}. Your secret voting token is ready.`;
      await this.speak(text, 'en');
    }
  }

  public static async narrateBallotConfirmed(
    candidateName: string,
    txRef: string,
    lang: 'en' | 'ta' = 'ta'
  ): Promise<void> {
    if (lang === 'ta') {
      const text = `வாழ்த்துக்கள்! உங்கள் வாக்கு ${candidateName} வேட்பாளருக்கு வெற்றிகரமாக பிளாக்செயினில் பதிவு செய்யப்பட்டது. உங்கள் பரிவர்த்தனை எண்: ${txRef}. நன்றி!`;
      await this.speak(text, 'ta');
    } else {
      const text = `Congratulations! Your vote for ${candidateName} has been permanently secured on the blockchain ledger. Your receipt reference is ${txRef}. Thank you for voting!`;
      await this.speak(text, 'en');
    }
  }
}
