import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Vote, CheckCircle2, AlertCircle, ShieldCheck, Clock, 
  ArrowRight, UserCheck, Lock, ExternalLink, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useVoiceGuidance } from '../VoiceGuidance.js';
import { Election } from '../../types/index.js';

export const VoterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { voterSession, accessibility } = useAuth();
  const vg = useVoiceGuidance();
  const isTamil = accessibility.language === 'ta';

  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [voterStatus, setVoterStatus] = useState<any>(null);

  const fetchVoterData = async () => {
    setLoading(true);
    try {
      const elecRes = await fetch('/api/v1/elections');
      if (elecRes.ok) {
        const elecData = await elecRes.json();
        setElections(elecData);
      }

      if (voterSession?.voterId) {
        const statusRes = await fetch(`/api/v1/voting/status?voter_id=${voterSession.voterId}`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setVoterStatus(statusData);
        }
      }
    } catch (err) {
      console.error('Failed to load voter elections', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoterData();
  }, [voterSession?.voterId]);

  const hasVoted = voterSession?.hasVoted || voterStatus?.has_voted;

  // Voice Guidance: auto-speak and register commands
  useEffect(() => {
    if (!vg.voiceOn) return;

    if (hasVoted) {
      vg.speakCustom('Ungaloda vote already record aayiduchu. Status paarka Next nu sollunga.');
    } else {
      vg.speak('DASHBOARD');
    }

    vg.registerCommandHandler((cmd) => {
      if (cmd === 'REPEAT') {
        vg.repeat();
        return;
      }
      if (cmd === 'NEXT' || cmd === 'CONFIRM') {
        if (hasVoted) {
          navigate('/voter/status');
        } else if (elections.length > 0) {
          const targetElection = elections.find((e) => e.status === 'OPEN') || elections[0];
          navigate(`/voter/election/${targetElection.id}/candidates`);
        }
      }
    });

    return () => {
      vg.unregisterCommandHandler();
    };
  }, [hasVoted, elections, vg.voiceOn, navigate]);

  return (
    <div className="space-y-6">
      {/* Voter Profile Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {isTamil ? 'அங்கீகரிக்கப்பட்ட வாக்காளர்' : 'Authenticated Citizen'}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  EPIC: {voterSession?.voterId}
                </span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 mt-0.5">
                {voterSession?.fullNameMasked}
              </h1>
              <p className="text-xs text-slate-500">
                {/* ✅ BUG FIX: Translate 'Constituency:' label */}
                {isTamil ? 'தொகுதி:' : 'Constituency:'} <strong>{voterSession?.constituency}</strong> • {voterSession?.state}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 block mb-1">
              {isTamil ? 'வாக்குப்பதிவு நிலை' : 'Suffrage Status'}
            </span>
            {hasVoted ? (
              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isTamil ? 'வாக்கு பதிவு செய்யப்பட்டது' : 'VOTE RECORDED'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>{isTamil ? 'வாக்களிக்கவில்லை' : 'NOT YET VOTED'}</span>
              </span>
            )}
          </div>
        </div>

        {/* Verification Credentials Info */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500">{isTamil ? 'தேர்தல் பட்டியல் சரிபார்ப்பு' : 'Electoral Roll'}</span>
            <div className="font-bold text-slate-900 flex items-center space-x-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isTamil ? 'சரிபார்க்கப்பட்டது' : 'Verified & Eligible'}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500">{isTamil ? 'வாக்காளர் அடையாள உள்நுழைவு' : 'Voter-ID Demo Login'}</span>
            <div className="font-bold text-slate-900 flex items-center space-x-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isTamil ? 'அடையாள எண் சரிபார்க்கப்பட்டது' : 'Voter ID Confirmed'}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500">{isTamil ? 'வாக்கு டோக்கன்' : 'Anonymous Credential'}</span>
            <div className="font-bold text-slate-900 flex items-center space-x-1 mt-0.5">
              <Lock className="w-3.5 h-3.5 text-purple-600" />
              <span>{hasVoted
                ? (isTamil ? 'பயன்படுத்தப்பட்டது' : 'CONSUMED (USED)')
                : (isTamil ? 'செயலில் உள்ளது (ஒரே முறை)' : 'ACTIVE (SINGLE-USE)')
              }</span>
            </div>
          </div>
        </div>
      </div>

      {/* Eligible Elections */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          {isTamil ? 'நீங்கள் வாக்களிக்க தகுதியான தேர்தல்கள்' : 'Eligible Elections in Your Constituency'}
        </h2>

        <div className="grid grid-cols-1 gap-4">
          {elections.map((elec) => {
            const isOpen = elec.status === 'OPEN';
            const canVote = isOpen && !hasVoted &&
              (!voterSession?.credentialElectionId || voterSession.credentialElectionId === elec.id);

            return (
              <div
                key={elec.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isOpen
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-100 text-slate-800 border border-slate-300'
                    }`}>
                      {isOpen ? (isTamil ? 'வாக்குப்பதிவு திறக்கப்பட்டுள்ளது' : 'VOTING OPEN') : elec.status}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{elec.id}</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{elec.title}</h3>
                  <p className="text-xs text-slate-600 max-w-xl">{elec.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <div>
                      {/* ✅ BUG FIX: Translate election card labels */}
                      <strong>{isTamil ? 'தொகுதி:' : 'Constituency:'}</strong> {elec.constituency}
                    </div>
                    <div>
                      <strong>{isTamil ? 'வாக்குப்பதிவு நேரம்:' : 'Voting Window:'}</strong> {new Date(elec.startTime).toLocaleDateString()} — {new Date(elec.endTime).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                  {hasVoted ? (
                    <div className="text-right">
                      <span className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold block">
                        {isTamil ? 'உங்கள் வாக்கு பதிவு செய்யப்பட்டது' : 'Vote Already Cast'}
                      </span>
                      <Link
                        to="/voter/status"
                        className="text-[11px] text-emerald-600 hover:underline mt-1 block"
                      >
                        {isTamil ? 'ரசீதை பார்க்க' : 'View Cryptographic Receipt →'}
                      </Link>
                    </div>
                  ) : canVote ? (
                    <button
                      onClick={() => navigate(`/voter/election/${elec.id}/candidates`)}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-md hover:shadow-emerald-500/20 transition-all"
                    >
                      <Vote className="w-5 h-5" />
                      <span>{isTamil ? 'வாக்களிக்க தொடங்கு' : 'Vote Now'}</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-200 text-slate-400 font-bold text-sm cursor-not-allowed"
                    >
                      {isTamil ? 'வாக்குப்பதிவு தொடங்கவில்லை' : 'Voting Not Available'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Constitutional Privacy Notice */}
      <div className="bg-purple-50 rounded-2xl border border-purple-200 p-5 text-xs text-purple-950 flex items-start space-x-3">
        <Lock className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold">
            {isTamil ? 'முழுமையான ரகசிய வாக்கு உத்தரவாதம்' : 'Statutory Absolute Secret Ballot Protection'}
          </div>
          <p className="text-purple-900/80 leading-relaxed">
            {isTamil
              ? 'உங்கள் அடையாளம் வாக்குச்சீட்டில் இணைக்கப்படாது. நீங்கள் யாருக்கு வாக்களித்தீர்கள் என்பது கணினியில் பதிவு செய்யப்படுவதில்லை. எந்த அதிகாரியாலும் உங்கள் வாக்கை பார்க்க முடியாது.'
              : 'Your voter identity is strictly isolated from your ballot selection via an anonymous cryptographic token. Once cast, the system records your participation status, but zero record exists linking your identity to your chosen candidate.'}
          </p>
        </div>
      </div>
    </div>
  );
};
