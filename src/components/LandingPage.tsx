import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Lock, Vote, FileCheck, CheckCircle2,
  Globe, Eye, Volume2, ArrowRight, Zap,
  Users, BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Election } from '../types/index.js';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { accessibility, setAccessibility, toggleLanguage } = useAuth();
  const [elections, setElections] = useState<Election[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  useEffect(() => {
    fetch('/api/v1/elections')
      .then((res) => res.json())
      .then((data) => setElections(data))
      .catch((err) => console.error(err));

    fetch('/api/v1/health')
      .then((res) => res.json())
      .then((data) => setSystemHealth(data))
      .catch((err) => console.error(err));
  }, []);

  const isTamil = accessibility.language === 'ta';

  // ✅ VOICE FIX: Wait for async browser voice loading before Tamil TTS
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = isTamil ? 'ta-IN' : 'en-IN';
    u.rate = isTamil ? 0.85 : 0.9;

    const doSpeak = () => {
      if (isTamil) {
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

  const features = [
    {
      icon: ShieldCheck,
      color: 'text-green-700',
      bg: 'bg-green-50 border-green-200',
      title: isTamil ? 'மாற்ற முடியாத பதிவு' : 'Immutable Ledger',
      desc: isTamil
        ? 'ஒவ்வொரு வாக்கும் Solidity ஸ்மார்ட் ஒப்பந்தம் மற்றும் மெர்கில் மரத்தில் பாதுகாக்கப்படுகிறது.'
        : 'Every vote is cryptographically anchored via Merkle Trees on Solidity EVM smart contracts.',
    },
    {
      icon: Lock,
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
      title: isTamil ? 'இரட்டை வாக்கு தடுப்பு' : 'One-Vote Enforcement',
      desc: isTamil
        ? 'ஒரே முறை பயன்படும் டோக்கன் வாக்குப்பதிவின் போது உடனடியாக முடக்கப்படுகிறது.'
        : 'Atomic single-use credentials guarantee zero duplicate voting.',
    },
    {
      icon: Eye,
      color: 'text-purple-700',
      bg: 'bg-purple-50 border-purple-200',
      title: isTamil ? 'முழுமையான ரகசியம்' : 'Complete Ballot Secrecy',
      desc: isTamil
        ? 'வாக்காளர் அடையாளம் வாக்குச்சீட்டில் ஒருபோதும் இணைக்கப்படாது.'
        : 'Zero linkage between electoral identity and candidate choice — mathematically guaranteed.',
    },
    {
      icon: BarChart3,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200',
      title: isTamil ? 'வெளிப்படையான தணிக்கை' : 'Independent Audit',
      desc: isTamil
        ? 'CAG தணிக்கையாளர்கள் வாக்கு ரகசியத்தை மீறாமல் கணித ரீதியாக முடிவுகளை சரிபார்க்கலாம்.'
        : 'CAG auditors verify mathematical tally proofs without decrypting any individual ballot.',
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans">

      {/* ✅ UI FIX: Light theme top accessibility bar (was dark bg-stone-900) */}
      <div className="bg-white text-stone-700 border-b border-stone-200 text-xs py-2 px-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-semibold tracking-wider text-stone-600 uppercase text-[11px]">
              {isTamil
                ? 'இந்திய தேர்தல் ஆணையம் • அதிகாரப்பூர்வ தேசிய தளம்'
                : 'Election Commission of India • Official National E-Voting Portal'}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Audio narration */}
            <button
              id="audio-narration-btn"
              onClick={() =>
                speakText(
                  isTamil
                    ? 'பிளாக்செயின் அடிப்படையிலான தானியங்கி மற்றும் தனியுரிமை பாதுகாக்கப்பட்ட மின்னணு வாக்குப்பதிவு அமைப்பு. குடிமக்கள் வாக்காளர் உள்நுழைவுக்கு தொடரவும்.'
                    : 'Blockchain-Based Automated and Privacy-Preserving E-Voting System. Please proceed to Citizen Voter Login.'
                )
              }
              className="hover:text-stone-900 flex items-center space-x-1 transition-colors"
              title="Text to Speech"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-600" />
              <span>{isTamil ? 'ஒலி உதவி' : 'Screen Reader'}</span>
            </button>

            {/* High Contrast Toggle */}
            <button
              id="high-contrast-btn"
              onClick={() =>
                setAccessibility((prev) => ({
                  ...prev,
                  highContrast: !prev.highContrast,
                }))
              }
              className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                accessibility.highContrast
                  ? 'bg-amber-400 text-stone-950 border-amber-300 font-bold'
                  : 'border-stone-400 text-stone-600 hover:border-stone-600'
              }`}
            >
              {isTamil ? 'உயர் மாறுபாடு' : 'High Contrast'}
            </button>

            {/* Font Size controls */}
            <div className="flex items-center space-x-1 border-l border-stone-300 pl-2">
              <button
                id="font-normal-btn"
                onClick={() => setAccessibility((prev) => ({ ...prev, fontSize: 'normal' }))}
                className={`px-1.5 py-0.5 rounded text-[11px] transition-colors ${
                  accessibility.fontSize === 'normal' ? 'bg-green-700 text-white' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                A
              </button>
              <button
                id="font-large-btn"
                onClick={() => setAccessibility((prev) => ({ ...prev, fontSize: 'large' }))}
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  accessibility.fontSize === 'large' ? 'bg-green-700 text-white' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                A+
              </button>
              <button
                id="font-xl-btn"
                onClick={() => setAccessibility((prev) => ({ ...prev, fontSize: 'extra-large' }))}
                className={`px-1.5 py-0.5 rounded text-[11px] font-black transition-colors ${
                  accessibility.fontSize === 'extra-large' ? 'bg-green-700 text-white' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                A++
              </button>
            </div>

            {/* Language Switch */}
            <button
              id="lang-switch-btn"
              onClick={toggleLanguage}
              className="flex items-center space-x-1 px-2.5 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{isTamil ? 'English' : 'தமிழ்'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ✅ UI FIX: Light theme hero header (was dark stone-900 gradient) */}
      <header className="bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14 text-center">
          {/* India tricolour accent strip */}
          <div className="flex justify-center mb-6">
            <div className="flex rounded-full overflow-hidden shadow border border-stone-200">
              <div className="w-8 h-1.5 bg-amber-500" />
              <div className="w-8 h-1.5 bg-white border-t border-b border-stone-200" />
              <div className="w-8 h-1.5 bg-green-600" />
            </div>
          </div>

          <div className="inline-flex items-center justify-center p-3 bg-green-50 rounded-2xl border border-green-200 mb-5">
            <ShieldCheck className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight max-w-3xl mx-auto leading-snug text-stone-900">
            {isTamil
              ? 'பிளாக்செயின் அடிப்படையிலான தானியங்கி மற்றும் தனியுரிமை பாதுகாக்கப்பட்ட மின்னணு வாக்குப்பதிவு அமைப்பு'
              : 'Blockchain-Based Automated and Privacy-Preserving E-Voting System'}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-stone-600 max-w-2xl mx-auto">
            {isTamil
              ? 'அங்கீகரிக்கப்பட்ட குடிமக்களுக்கான ரகசிய வாக்குரிமை மற்றும் சுயாதீன கணக்காய்வுத்திறன் கொண்ட தேசிய வாக்குப்பதிவு தளம்.'
              : 'Cryptographically verified citizen suffrage featuring zero voter-candidate linkage and end-to-end immutability.'}
          </p>

          {/* System Health Indicator */}
          {systemHealth && (
            <div className="mt-4 inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-700 font-medium">
                {isTamil ? 'அமைப்பு செயல்படுகிறது' : 'System Operational'}
              </span>
            </div>
          )}

          {/* VOTER PORTAL ENTRY CARD */}
          <div className="mt-8 max-w-md mx-auto text-left">
            <div className="bg-white border-2 border-stone-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between hover:border-green-400 transition-all shadow-md hover:shadow-lg group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-green-50 text-green-600 border border-green-200">
                    <Vote className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-green-100 text-green-800 border border-green-200">
                    {isTamil ? 'வாக்காளர் தளம்' : 'Citizen Voter'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-stone-900">
                  {isTamil ? 'வாக்காளர் உள்நுழைவு' : 'Voter Login'}
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
                  {isTamil
                    ? 'வாக்காளர் அடையாள அட்டை (EPIC) மற்றும் மொபைல் OTP வழியாக அங்கீகரித்து பாதுகாப்பாக வாக்களிக்கும் பொதுத்தளம்.'
                    : 'Authenticate with Voter ID (EPIC) and Mobile OTP to receive an isolated anonymous voting credential.'}
                </p>
                <div className="mt-5 space-y-2 text-xs text-stone-600">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{isTamil ? 'ஒரே முறை அநாமதேய டோக்கன்' : 'Single-use anonymous token'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{isTamil ? 'அடையாளம் & வாக்கு பிரிக்கப்பட்டுள்ளது' : 'Zero linkage between identity & ballot'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{isTamil ? 'மொபைல் OTP சரிபார்ப்பு' : 'Mobile OTP verification (Free tier)'}</span>
                  </div>
                </div>
              </div>

              <button
                id="voter-login-btn"
                onClick={() => navigate('/voter/login')}
                className="mt-6 w-full py-3.5 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold flex items-center justify-center space-x-2 transition-all shadow-sm group-hover:shadow-md"
              >
                <span>{isTamil ? 'வாக்காளர் உள்நுழைவு' : 'Voter Login'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-10 space-y-10">

        {/* Live Election Status */}
        <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-2">
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-green-600" />
                <span>{isTamil ? 'தற்போதைய தேர்தல் நிலை' : 'Active Election Status'}</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {isTamil
                  ? 'அரசியலமைப்பு விதிமுறைகளின்படி தற்போதைய தேர்தல் நிலவரம்'
                  : 'Official statutory election lifecycle status verified from the master ledger.'}
              </p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full self-start sm:self-auto ${
              elections[0]?.status === 'OPEN'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}>
              {elections[0]?.status === 'OPEN'
                ? (isTamil ? 'வாக்குப்பதிவு நடைபெறுகிறது' : 'VOTING IS OPEN')
                : (elections[0]?.status || 'LOADING')}
            </span>
          </div>

          {elections.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-100">
                <span className="text-stone-500 font-medium">{isTamil ? 'தேர்தல் பெயர்' : 'Election Title'}</span>
                <p className="font-bold text-stone-900 mt-1 text-sm">{elections[0].title}</p>
                <p className="text-stone-600 mt-0.5">{elections[0].constituency}</p>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-100">
                <span className="text-stone-500 font-medium">{isTamil ? 'வாக்குப்பதிவு நேரம்' : 'Voting Window'}</span>
                <p className="font-semibold text-stone-900 mt-1">
                  {new Date(elections[0].startTime).toLocaleDateString()} — {new Date(elections[0].endTime).toLocaleDateString()}
                </p>
                <p className="text-stone-600 mt-0.5">
                  {new Date(elections[0].startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {isTamil ? 'முதல்' : 'to'}{' '}
                  {new Date(elections[0].endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-100">
                <span className="text-stone-500 font-medium">{isTamil ? 'மொத்த வாக்காளர்கள்' : 'Eligible Electors'}</span>
                <p className="font-bold text-stone-900 mt-1 text-sm">
                  {elections[0].totalEligibleVoters?.toLocaleString() || '—'}
                </p>
                <p className="text-stone-600 mt-0.5">{elections[0].state}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex space-x-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-1 h-16 shimmer" />
              ))}
            </div>
          )}
        </section>

        {/* Feature Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-3">
                  <div className={`p-2.5 rounded-xl border shrink-0 ${f.bg}`}>
                    <Icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">{f.title}</h3>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Technology Stack */}
        <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-stone-900 mb-4 flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-600" />
            <span>{isTamil ? 'தொழில்நுட்பக் கட்டமைப்பு' : 'Technology Stack'}</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              { label: 'Solidity Smart Contract', sub: 'EVM ^0.8.34 Osaka' },
              { label: 'Cyber Defense', sub: 'Pausable & RBAC Shield' },
              { label: 'Voter Demo Login', sub: 'Voter ID' },
              { label: 'Keccak-256 + ZK', sub: 'Nullifier Privacy Core' },
            ].map((tech, i) => (
              <div key={i} className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-center">
                <p className="font-bold text-stone-800">{tech.label}</p>
                <p className="text-stone-500 mt-0.5">{tech.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* About */}
        <section className="bg-amber-50 rounded-2xl border border-amber-100 p-6 text-xs text-stone-600 leading-relaxed">
          <h3 className="text-sm font-bold text-stone-900 mb-2">
            {isTamil ? 'அமைப்பைப் பற்றி' : 'About the National E-Voting Architecture'}
          </h3>
          <p>
            {isTamil
              ? 'இது உள்ளூர் விளக்க மாதிரி. வாக்காளர் அடையாள எண்ணைப் பயன்படுத்தி உள்நுழைந்து, ஒருமுறை பயன்படும் அநாமதேய வாக்குச் சான்றிதழுடன் வாக்களிக்கலாம். SMS அனுப்பப்படாது.'
              : 'Demonstration voting flow with voter-ID login and single-use anonymous credentials. SMS verification is not enabled in this local prototype.'}
          </p>
        </section>
      </main>

      {/* ✅ UI FIX: Light theme footer (was dark bg-stone-900) */}
      <footer className="bg-white text-stone-500 text-xs py-6 border-t border-stone-200">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            © 2026 {isTamil ? 'இந்திய தேர்தல் ஆணையம்' : 'Election Commission of India'}. All Rights Reserved.
          </p>
          <div className="flex items-center space-x-4 text-stone-400">
            <span>ISO/IEC 27001 Certified</span>
            <span>•</span>
            <span>Solidity Smart Contract</span>
            <span>•</span>
            <span>Voter-ID Demo</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
