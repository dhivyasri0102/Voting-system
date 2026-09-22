import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Lock, Users, Vote, FileCheck, CheckCircle2, 
  ExternalLink, Globe, Eye, Volume2, ArrowRight, ShieldAlert, Cpu
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

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = isTamil ? 'ta-IN' : 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Accessibility & Language Bar */}
      <div className="bg-slate-900 text-slate-200 border-b border-slate-800 text-xs py-2 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold tracking-wider text-slate-300 uppercase">
              {isTamil ? 'இந்திய தேர்தல் ஆணையம் • அதிகாரப்பூர்வ தேசிய தளம்' : 'Election Commission of India • Official National E-Voting Portal'}
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
              className="hover:text-white flex items-center space-x-1 transition-colors"
              title="Text to Speech"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
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
              className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                accessibility.highContrast
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                  : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              {isTamil ? 'உயர் மாறுபாடு' : 'High Contrast'}
            </button>

            {/* Font Size controls */}
            <div className="flex items-center space-x-1 border-l border-slate-700 pl-2">
              <button
                id="font-normal-btn"
                onClick={() => setAccessibility((prev) => ({ ...prev, fontSize: 'normal' }))}
                className={`px-1.5 py-0.5 rounded text-[11px] ${
                  accessibility.fontSize === 'normal' ? 'bg-blue-600 text-white' : 'hover:text-white'
                }`}
              >
                A
              </button>
              <button
                id="font-large-btn"
                onClick={() => setAccessibility((prev) => ({ ...prev, fontSize: 'large' }))}
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                  accessibility.fontSize === 'large' ? 'bg-blue-600 text-white' : 'hover:text-white'
                }`}
              >
                A+
              </button>
              <button
                id="font-xl-btn"
                onClick={() => setAccessibility((prev) => ({ ...prev, fontSize: 'extra-large' }))}
                className={`px-1.5 py-0.5 rounded text-[11px] font-black ${
                  accessibility.fontSize === 'extra-large' ? 'bg-blue-600 text-white' : 'hover:text-white'
                }`}
              >
                A++
              </button>
            </div>

            {/* Language Switch */}
            <button
              id="lang-switch-btn"
              onClick={toggleLanguage}
              className="flex items-center space-x-1 px-2.5 py-0.5 rounded bg-blue-700 hover:bg-blue-600 text-white font-semibold transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{isTamil ? 'English' : 'தமிழ்'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <header className="bg-gradient-to-b from-slate-900 to-slate-950 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-blue-900/40 rounded-2xl border border-blue-500/30 mb-4">
            <ShieldCheck className="w-10 h-10 text-blue-400" />
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight max-w-3xl mx-auto leading-snug">
            {isTamil
              ? 'பிளாக்செயின் அடிப்படையிலான தானியங்கி மற்றும் தனியுரிமை பாதுகாக்கப்பட்ட மின்னணு வாக்குப்பதிவு அமைப்பு'
              : 'Blockchain-Based Automated and Privacy-Preserving E-Voting System'}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
            {isTamil
              ? 'அங்கீகரிக்கப்பட்ட குடிமக்களுக்கான ரகசிய வாக்குரிமை மற்றும் சுயாதீன கணக்காய்வுத்திறன் கொண்ட தேசிய வாக்குப்பதிவு தளம்.'
              : 'Cryptographically verified citizen suffrage featuring zero voter-candidate linkage and end-to-end immutability.'}
          </p>

          {/* VOTER PORTAL ENTRY CARD */}
          <div className="mt-8 max-w-xl mx-auto text-left">
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 sm:p-8 flex flex-col justify-between hover:border-emerald-400 transition-all shadow-xl hover:shadow-emerald-500/10 group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                    <Vote className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {isTamil ? 'வாக்காளர் தளம்' : 'Citizen Voter'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white">
                  {isTamil ? 'வாக்காளர் உள்நுழைவு' : 'Voter Login'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  {isTamil
                    ? 'வாக்காளர் அடையாள அட்டை (EPIC) மற்றும் ஆதார் OTP வழியாக அங்கீகரித்து பாதுகாப்பாக வாக்களிக்கும் பொதுத்தளம்.'
                    : 'Citizen suffrage portal. Authenticate with Voter ID (EPIC) and UIDAI OTP to receive an isolated anonymous voting credential.'}
                </p>
                <div className="mt-5 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Single-use anonymous token</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Zero linkage between identity & ballot</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Immutable cryptographic ledger verification</span>
                  </div>
                </div>
              </div>

              <button
                id="voter-login-btn"
                onClick={() => navigate('/voter/login')}
                className="mt-6 w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center space-x-2 transition-all shadow-md group-hover:bg-emerald-500"
              >
                <span>{isTamil ? 'வாக்காளர் உள்நுழைவு' : 'Voter Login'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-10 space-y-12">
        {/* Live Election Status */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-blue-600" />
                <span>{isTamil ? 'தற்போதைய தேர்தல் நிலை' : 'Active Election Status'}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {isTamil ? 'அரசியலமைப்பு விதிமுறைகளின்படி தற்போதைய தேர்தல் நிலவரம்' : 'Official statutory election lifecycle status verified from the master ledger.'}
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
              {elections[0]?.status === 'OPEN' ? (isTamil ? 'வாக்குப்பதிவு நடைபெறுகிறது' : 'VOTING IS OPEN') : elections[0]?.status || 'DRAFT'}
            </span>
          </div>

          {elections.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-medium">{isTamil ? 'தேர்தல் பெயர்' : 'Election Title'}</span>
                <p className="font-bold text-slate-900 mt-1 text-sm">{elections[0].title}</p>
                <p className="text-slate-600 mt-0.5">{elections[0].constituency}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-medium">{isTamil ? 'வாக்குப்பதிவு நேரம்' : 'Voting Window'}</span>
                <p className="font-semibold text-slate-900 mt-1">
                  {new Date(elections[0].startTime).toLocaleDateString()} — {new Date(elections[0].endTime).toLocaleDateString()}
                </p>
                <p className="text-slate-600 mt-0.5">Time: {new Date(elections[0].startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to {new Date(elections[0].endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-medium">{isTamil ? 'மொத்த வாக்காளர்கள்' : 'Eligible Electors'}</span>
                <p className="font-bold text-slate-900 mt-1 text-sm">
                  {elections[0].totalEligibleVoters?.toLocaleString() || '1,250,000'}
                </p>
                <p className="text-slate-600 mt-0.5">{elections[0].state}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-xs text-slate-500">Loading election status...</div>
          )}
        </section>

        {/* System Architecture: Security & Privacy */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Security Information */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isTamil ? 'பாதுகாப்பு கட்டமைப்பு' : 'Security Architecture'}
                </h3>
                <p className="text-xs text-slate-500">{isTamil ? 'அனுமதிக்கப்பட்ட பிளாக்செயின்' : 'Permissioned Ledger & Tamper Proofing'}</p>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-slate-600">
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>{isTamil ? 'மாற்ற முடியாத பதிவு' : 'Immutable Permissioned Ledger'}:</strong>{' '}
                  {isTamil
                    ? 'பதிவு செய்யப்பட்ட ஒவ்வொரு வாக்கும் பிளாக்செயின் சங்கிலியில் SHA-256 ஹாஷிங் மற்றும் மெர்கில் ரூட் மூலம் பாதுகாக்கப்படுகிறது.'
                    : 'Every cast vote is cryptographically anchored via Merkle Trees on Hyperledger Fabric nodes.'}
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>{isTamil ? 'இரட்டை வாக்கு தடுப்பு' : 'Strict One-Vote Enforcement'}:</strong>{' '}
                  {isTamil
                    ? 'ஒரே முறை பயன்படும் குறியீடு (Token) வாக்குப்பதிவின் போது உடனடியாகப் பயன்படுத்தப்பட்டதாக முடக்கப்படுகிறது.'
                    : 'Atomic consumption of single-use voting credentials guarantees duplicate vote prevention.'}
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>{isTamil ? 'மாற்ற முடியாத வாக்குகள்' : 'Tamper-Proof Ballots'}:</strong>{' '}
                  {isTamil
                    ? 'பதிவு செய்யப்பட்ட வாக்குகளை எந்தவொரு அமைப்பாலும் திருத்தவோ அல்லது நீக்கவோ முடியாது.'
                    : 'Zero external or system API exists to modify ballots, alter votes, or tamper with consensus tallies.'}
                </span>
              </li>
            </ul>
          </div>

          {/* Privacy Information */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isTamil ? 'தனியுரிமை & ரகசியத்தன்மை' : 'Privacy & Zero Linkage'}
                </h3>
                <p className="text-xs text-slate-500">{isTamil ? 'அரசியலமைப்பு ரகசிய வாக்கு' : 'Cryptographic Air-Gap'}</p>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-slate-600">
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <span>
                  <strong>{isTamil ? 'அடையாள இடைவெளி' : 'Identity Domain Segregation'}:</strong>{' '}
                  {isTamil
                    ? 'வாக்காளரின் ஆதார்/EPIC அடையாளம் வாக்குச்சீட்டில் இணைக்கப்படுவதில்லை; அநாமதேய டோக்கன் மட்டுமே வழங்கப்படுகிறது.'
                    : 'Strict boundary between Electoral Identity domain and Anonymous Ballot casting domain.'}
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <span>
                  <strong>{isTamil ? 'வாக்காளர் தேர்வு ரகசியம்' : 'No Voter-Candidate Linkage'}:</strong>{' '}
                  {isTamil
                    ? 'வாக்காளர் யாருக்கு வாக்களித்தார் என்பதை எந்தவொரு நபரோ அல்லது கணினியோ பார்க்க முடியாது.'
                    : 'Neither system operators nor database logs can reconstruct who an individual voted for.'}
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <span>
                  <strong>{isTamil ? 'வெளிப்படையான தணிக்கை' : 'Independent Auditor Verification'}:</strong>{' '}
                  {isTamil
                    ? 'CAG தணிக்கையாளர்கள் ரகசிய வாக்குப்பதிவுக்கு எந்தவித பாதிப்பும் இன்றி கணித ரீதியாக முடிவுகளை சரிபார்க்க முடியும்.'
                    : 'Independent CAG auditors verify mathematical tally proofs without decrypting individual voter ballots.'}
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* About the System */}
        <section className="bg-slate-100 rounded-2xl p-6 text-xs text-slate-600 leading-relaxed">
          <h3 className="text-sm font-bold text-slate-900 mb-2">
            {isTamil ? 'அமைப்பைப் பற்றி' : 'About the National E-Voting Architecture'}
          </h3>
          <p>
            {isTamil
              ? 'இந்த தளம் இந்திய தேர்தல் ஆணையத்தின் வழிகாட்டுதலின் கீழ், வாக்காளர்களின் அரசியலமைப்பு உரிமைகளைப் பாதுகாக்கும் நோக்குடன் உருவாக்கப்பட்டுள்ளது. வாக்காளர்கள் தங்கள் வாக்காளர் அடையாள அட்டை மற்றும் ஆதார் வழியாக பாதுகாப்பாகவும் ரகசியமாகவும் வாக்களிக்கும் வசதியை இது உறுதி செய்கிறது.'
              : 'Developed strictly under statutory constitutional guidelines of the Election Commission of India. The architecture maintains an end-to-end cryptographically secured voting workflow ensuring verified citizens exercise their franchise with total privacy and anonymity.'}
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            © 2026 {isTamil ? 'இந்திய தேர்தல் ஆணையம்' : 'Election Commission of India'}. All Rights Reserved.
          </p>
          <div className="flex items-center space-x-4 text-slate-500">
            <span>ISO/IEC 27001 Certified</span>
            <span>•</span>
            <span>UIDAI Aadhaar 2.5 Compliant</span>
            <span>•</span>
            <span>Hyperledger Fabric v2.5</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
