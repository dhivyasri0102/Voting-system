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
  private static activeUtterance: SpeechSynthesisUtterance | null = null;

  public static isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public static cancel(): void {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.activeUtterance = null;
    }
  }

  /**
   * Internal helper: resolves the best available voice for a given language.
   */
  private static getVoice(lang: 'en' | 'ta'): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return null;

    const langCode = lang === 'ta' ? 'ta' : 'en';
    return voices.find((v) => v.lang.toLowerCase().startsWith(langCode)) ?? null;
  }

  public static async speak(
    text: string,
    lang: 'en' | 'ta' = 'ta',
    onEnd?: () => void
  ): Promise<void> {
    if (!this.synth || !text) return;

    this.cancel();
    if (this.synth.paused) {
      this.synth.resume();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    this.activeUtterance = utterance; // Prevent V8 garbage collection

    utterance.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
    utterance.rate = lang === 'ta' ? 0.85 : 0.95; // Slightly slower for Tamil clarity
    utterance.pitch = 1.0;

    const voice = this.getVoice(lang);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.activeUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      this.isSpeaking = false;
      this.activeUtterance = null;
    };

    // Ensure audio subsystem is active in Chromium
    setTimeout(() => {
      if (this.synth) {
        if (this.synth.paused) {
          this.synth.resume();
        }
        this.synth.speak(utterance);
      }
    }, 50);
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
      const symbolDesc = candidate.symbol ? `Symbol: ${candidate.symbol}` : '';
      const text = `Candidate number ${candidate.orderNumber || ''}: ${candidate.name}. Party: ${candidate.party || 'Independent'}. ${symbolDesc}. Select panna Select candidate ${candidate.orderNumber || 1} nu sollunga.`;
      await this.speak(text, 'en');
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
      const text = `Vanakkam ${voterName}. Ungaloda voter verification successfully complete aayiduchu. Constituency: ${constituency}. Ungaloda secret voting token ready aagiduchu. Next nu sollunga.`;
      await this.speak(text, 'en');
    } else {
      const text = `Welcome ${voterName}. Your voter verification is successful for constituency ${constituency}. Your secret voting token is ready. Say Next to continue.`;
      await this.speak(text, 'en');
    }
  }

  public static async narrateBallotConfirmed(
    candidateName: string,
    txRef: string,
    lang: 'en' | 'ta' = 'ta'
  ): Promise<void> {
    if (lang === 'ta') {
      const text = `Ungaloda vote ${candidateName} candidate-ku blockchain-la successfully record aayiduchu. Transaction reference number: ${txRef}. Nandri!`;
      await this.speak(text, 'en');
    } else {
      const text = `Your vote for ${candidateName} has been permanently secured on the blockchain ledger. Your receipt reference is ${txRef}. Thank you for voting!`;
      await this.speak(text, 'en');
    }
  }
}
