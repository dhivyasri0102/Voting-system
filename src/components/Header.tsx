import React from 'react';
import { Shield, Award, Users, FileCheck, Activity, Globe, Eye, Volume2, CheckCircle2, AlertCircle } from 'lucide-react';
import { translations } from '../i18n/translations.js';
import { AccessibilityPreferences, SystemHealthState } from '../types/index.js';

interface HeaderProps {
  activeTab: 'voter' | 'authority' | 'auditor' | 'security' | 'results';
  setActiveTab: (tab: 'voter' | 'authority' | 'auditor' | 'security' | 'results') => void;
  accessibility: AccessibilityPreferences;
  setAccessibility: React.Dispatch<React.SetStateAction<AccessibilityPreferences>>;
  health: SystemHealthState | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  accessibility,
  setAccessibility,
  health,
}) => {
  const t = translations[accessibility.language];

  // ✅ BUG FIX: Use same logic as AuthContext.toggleLanguage for consistency
  const toggleLanguage = () => {
    setAccessibility((prev) => ({
      ...prev,
      language: prev.language === 'en' ? 'ta' : 'en',
    }));
  };

  const toggleSeniorMode = () => {
    setAccessibility((prev) => ({
      ...prev,
      seniorCitizenMode: !prev.seniorCitizenMode,
      fontSize: !prev.seniorCitizenMode ? 'extra-large' : 'normal',
      highContrast: !prev.seniorCitizenMode,
    }));
  };

  // ✅ VOICE FIX: Wait for async voice loading before speaking Tamil
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = accessibility.language === 'ta' ? 'ta-IN' : 'en-IN';
    u.rate = 0.9;

    const doSpeak = () => {
      if (accessibility.language === 'ta') {
        const voices = window.speechSynthesis.getVoices();
        const tamilVoice = voices.find((v) => v.lang.startsWith('ta'));
        if (tamilVoice) u.voice = tamilVoice;
      }
      window.speechSynthesis.speak(u);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      doSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        doSpeak();
      };
    }
  };

  return (
    <header className="w-full bg-slate-900 text-white border-b border-slate-800 shadow-md">
      {/* Tricolor Government Top Strip */}
      <div className="w-full h-1.5 flex">
        <div className="w-1/3 bg-amber-500"></div>
        <div className="w-1/3 bg-white"></div>
        <div className="w-1/3 bg-emerald-600"></div>
      </div>

      {/* Top Banner with Seal, Title, and Accessibility Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Official Emblem & Title */}
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-full bg-slate-800 border-2 border-amber-400/80 flex items-center justify-center p-1 shadow-inner">
              <Shield className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-700/50 uppercase tracking-wide">
                  GOV.IN • ECI
                </span>
                <span className="text-xs text-slate-400">
                  Secured by Hyperledger Fabric & SMS OTP authentication
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5">
                {t.appName}
              </h1>
              <p className="text-xs text-slate-300">
                {t.subTitle}
              </p>
            </div>
          </div>

          {/* Accessibility & Language Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Senior Citizen Mode Toggle */}
            <button
              id="btn-senior-mode-toggle"
              onClick={toggleSeniorMode}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border flex items-center space-x-1.5 transition-colors ${
                accessibility.seniorCitizenMode
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
              title="Toggle Large Fonts & High Contrast for Senior Citizens"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{accessibility.seniorCitizenMode ? 'Senior Mode ON' : t.seniorMode}</span>
            </button>

            {/* Language Switcher */}
            <button
              id="btn-language-toggle"
              onClick={toggleLanguage}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 flex items-center space-x-1.5 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>{accessibility.language === 'en' ? 'தமிழ் (Tamil)' : 'English'}</span>
            </button>

            {/* Audio Help Button */}
            <button
              id="btn-audio-help"
              onClick={() => speakText(t.subTitle + '. ' + t.seniorModeActive)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-slate-800 text-slate-300 border border-slate-700 hover:text-white hover:bg-slate-700 flex items-center space-x-1"
              title="Voice Assistance"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Audio Guide</span>
            </button>

            {/* System Status Pill */}
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-300">Ledger:</span>
              <span className="text-emerald-400 font-mono font-medium">Synced</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-300">SMS OTP:</span>
              <span className={health?.smsGateway === 'HEALTHY' ? 'text-emerald-400' : 'text-amber-400'}>
                {health?.smsGateway === 'HEALTHY' ? 'Live' : 'Not configured'}
              </span>
            </div>
          </div>

        </div>

        {/* Navigation Tabs */}
        <nav className="mt-3 pt-2 border-t border-slate-800 flex overflow-x-auto space-x-1 sm:space-x-2 scrollbar-none">
          <button
            id="nav-tab-voter"
            onClick={() => setActiveTab('voter')}
            className={`px-3.5 py-2 rounded-t-md text-xs sm:text-sm font-medium flex items-center space-x-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'voter'
                ? 'border-amber-400 text-amber-400 bg-slate-800/90 font-semibold'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t.voterPortal}</span>
          </button>

          <button
            id="nav-tab-authority"
            onClick={() => setActiveTab('authority')}
            className={`px-3.5 py-2 rounded-t-md text-xs sm:text-sm font-medium flex items-center space-x-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'authority'
                ? 'border-amber-400 text-amber-400 bg-slate-800/90 font-semibold'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>{t.authorityPortal}</span>
          </button>

          <button
            id="nav-tab-auditor"
            onClick={() => setActiveTab('auditor')}
            className={`px-3.5 py-2 rounded-t-md text-xs sm:text-sm font-medium flex items-center space-x-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'auditor'
                ? 'border-amber-400 text-amber-400 bg-slate-800/90 font-semibold'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>{t.auditorPortal}</span>
          </button>

          <button
            id="nav-tab-security"
            onClick={() => setActiveTab('security')}
            className={`px-3.5 py-2 rounded-t-md text-xs sm:text-sm font-medium flex items-center space-x-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'security'
                ? 'border-amber-400 text-amber-400 bg-slate-800/90 font-semibold'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>{t.securityPortal}</span>
          </button>

          <button
            id="nav-tab-results"
            onClick={() => setActiveTab('results')}
            className={`px-3.5 py-2 rounded-t-md text-xs sm:text-sm font-medium flex items-center space-x-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'results'
                ? 'border-amber-400 text-amber-400 bg-slate-800/90 font-semibold'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{t.resultsPortal}</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
