/**
 * Voice Assistance & Speech Narration Engine
 * Designed for rural, illiterate, and elderly voters.
 * 
 * Supports:
 * - Tamil Speech Synthesis (`ta-IN`)
 * - English Speech Synthesis (`en-IN`)
 * - Step-by-step vocal guidance and audio reading of candidates & symbols
 */

export class VoiceAssistant {
  private static synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
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

  public static speak(text: string, lang: 'en' | 'ta' = 'ta', onEnd?: () => void): void {
    if (!this.synth) return;

    this.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
    utterance.rate = lang === 'ta' ? 0.9 : 0.95; // Slightly slower for clarity
    utterance.pitch = 1.0;

    // Pick Tamil voice if available in the browser
    if (lang === 'ta') {
      const voices = this.synth.getVoices();
      const tamilVoice = voices.find((v) => v.lang.startsWith('ta'));
      if (tamilVoice) {
        utterance.voice = tamilVoice;
      }
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

  public static narrateCandidate(
    candidate: { name: string; party?: string; symbol?: string; description?: string; orderNumber?: number },
    lang: 'en' | 'ta' = 'ta'
  ): void {
    if (lang === 'ta') {
      const symbolDesc = candidate.symbol ? `சின்னம்: ${candidate.symbol}` : '';
      const text = `வேட்பாளர் எண் ${candidate.orderNumber || ''}: ${candidate.name}. கட்சி: ${candidate.party || 'சுயேச்சை'}. ${symbolDesc}.`;
      this.speak(text, 'ta');
    } else {
      const text = `Candidate number ${candidate.orderNumber || ''}: ${candidate.name}. Party: ${candidate.party || 'Independent'}. Symbol: ${candidate.symbol || ''}.`;
      this.speak(text, 'en');
    }
  }

  public static narrateVerificationSuccess(voterName: string, constituency: string, lang: 'en' | 'ta' = 'ta'): void {
    if (lang === 'ta') {
      const text = `வணக்கம் ${voterName}. உங்கள் வாக்காளர் சரிபார்ப்பு வெற்றிகரமாக முடிந்தது. தொகுதி: ${constituency}. உங்கள் ரகசிய வாக்குச்சீட்டு தயாராக உள்ளது.`;
      this.speak(text, 'ta');
    } else {
      const text = `Welcome ${voterName}. Your voter verification is successful for constituency ${constituency}. Your secret voting token is ready.`;
      this.speak(text, 'en');
    }
  }

  public static narrateBallotConfirmed(candidateName: string, txRef: string, lang: 'en' | 'ta' = 'ta'): void {
    if (lang === 'ta') {
      const text = `வாழ்த்துக்கள்! உங்கள் வாக்கு ${candidateName} வேட்பாளருக்கு வெற்றிகரமாக பிளாக்செயினில் பதிவு செய்யப்பட்டது. உங்கள் பரிவர்த்தனை எண்: ${txRef}. நன்றி!`;
      this.speak(text, 'ta');
    } else {
      const text = `Congratulations! Your vote for ${candidateName} has been permanently secured on the blockchain ledger. Your receipt reference is ${txRef}. Thank you for voting!`;
      this.speak(text, 'en');
    }
  }
}
