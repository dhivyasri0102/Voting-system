import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, Globe, RefreshCw, Vote } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useVoiceGuidance } from '../VoiceGuidance.js';

export const VoterDemoLogin: React.FC = () => {
  const navigate = useNavigate();
  const { loginVoter, accessibility, toggleLanguage } = useAuth();
  const voiceGuidance = useVoiceGuidance();
  const isTamil = accessibility.language === 'ta';
  const [voterId, setVoterId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => voiceGuidance.speak('VOTER_ID'), 600);
    return () => clearTimeout(timeout);
  }, [voiceGuidance.voiceOn, voiceGuidance.lang]);

  const handleLogin = async () => {
    const cleanVoterId = voterId.trim().toUpperCase();
    if (cleanVoterId.length < 6) {
      setErrorMessage(isTamil ? 'சரியான வாக்காளர் அடையாள எண்ணை உள்ளிடவும்.' : 'Enter a valid voter ID.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/v1/auth/voter/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_id: cleanVoterId }),
      });
      const data = await response.json();

      if (!response.ok || !data.success || !data.credential?.raw || !data.credential?.hash) {
        setErrorMessage(data.message || (isTamil ? 'உள்நுழைவு தோல்வியடைந்தது.' : 'Login failed.'));
        return;
      }

      loginVoter({
        voterId: data.voter.voterId,
        fullNameMasked: data.voter.fullNameMasked,
        constituency: data.voter.constituency,
        state: data.voter.state,
        isRegistered: true,
        hasVoted: false,
        authReference: data.authReference,
        rawCredential: data.credential.raw,
        credentialHash: data.credential.hash,
        credentialElectionId: data.electionId,
      });
      navigate('/voter/dashboard', { replace: true });
    } catch {
      setErrorMessage(isTamil
        ? 'சேவையகத்தை அணுக முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
        : 'Unable to reach the login service. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans text-stone-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-between mb-4">
          <Link to="/" className="inline-flex items-center space-x-1 text-xs text-stone-500 hover:text-stone-800 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isTamil ? 'முகப்புக்கு திரும்பு' : 'Back to Home'}</span>
          </Link>
          <button onClick={toggleLanguage} className="text-xs text-green-700 hover:text-green-900 flex items-center space-x-1 font-semibold transition-colors">
            <Globe className="w-3.5 h-3.5" />
            <span>{isTamil ? 'English' : 'தமிழ்'}</span>
          </button>
        </div>
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center text-green-600 shadow-sm">
            <Vote className="w-8 h-8" />
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl font-extrabold text-stone-900">
          {isTamil ? 'வாக்காளர் உள்நுழைவு' : 'Citizen Voter Login'}
        </h1>
        <p className="mt-1 text-center text-xs text-stone-500">
          {isTamil ? 'தேசிய மின்னணு வாக்குப்பதிவு அமைப்பு' : 'National E-Voting System • Demo Login'}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-xl border border-stone-200 sm:px-10 space-y-5 fade-in">
          {errorMessage && (
            <div role="alert" className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}
          <div>
            <label htmlFor="voter-id" className="block text-xs font-bold text-stone-700 mb-1">
              {isTamil ? 'வாக்காளர் அடையாள எண் (EPIC)' : 'Voter ID (EPIC)'}
            </label>
            <input
              id="voter-id"
              type="text"
              value={voterId}
              onChange={(event) => setVoterId(event.target.value.toUpperCase())}
              placeholder={isTamil ? 'எ.கா. TNL7316042' : 'e.g. TNL7316042'}
              maxLength={10}
              autoComplete="username"
              className="block w-full px-3 py-2.5 text-sm uppercase tracking-wider font-mono border border-stone-300 rounded-lg text-stone-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              onKeyDown={(event) => event.key === 'Enter' && handleLogin()}
            />
          </div>
          <button
            type="button"
            disabled={loading || voterId.trim().length < 6}
            onClick={handleLogin}
            className="w-full py-3 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-bold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            <span>{loading ? (isTamil ? 'உள்நுழைகிறது...' : 'Signing in...') : (isTamil ? 'வாக்காளர் அடையாளத்துடன் உள்நுழைக' : 'Continue with Voter ID')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
