import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, KeyRound, AlertCircle, ArrowLeft, CheckCircle2, User, Key } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();

  const [username, setUsername] = useState<string>('admin@eci.gov.in');
  const [password, setPassword] = useState<string>('AdminPassword@2026');
  const [mfaOtp, setMfaOtp] = useState<string>('123456');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          mfa_otp: mfaOtp,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Administrative authentication failed.');
      } else {
        loginAdmin(data.session);
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setErrorMessage('Network error connecting to Election Authority authentication gateway.');
    } finally {
      setLoading(false);
    }
  };

  const fillDevAccount = (type: 'authority' | 'auditor') => {
    if (type === 'authority') {
      setUsername('admin@eci.gov.in');
      setPassword('AdminPassword@2026');
      setMfaOtp('123456');
    } else {
      setUsername('auditor@cag.gov.in');
      setPassword('AuditorPassword@2026');
      setMfaOtp('123456');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to National E-Voting Landing</span>
        </Link>

        {/* National Emblem / Authority Badge */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
            <Shield className="w-8 h-8" />
          </div>
        </div>

        <h2 className="mt-4 text-center text-2xl font-extrabold text-white tracking-tight">
          Election Authority Portal
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Election Commission of India • Returning Officers & Administrative Staff
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/90 py-8 px-6 shadow-2xl rounded-2xl border border-slate-700 sm:px-10">
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Authentication Error</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300">
                Admin Username or Official Email
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin@eci.gov.in"
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300">
                Administrative Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* MFA / OTP */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300">
                  Multi-Factor Authentication (MFA / OTP)
                </label>
                <span className="text-[10px] text-blue-400 font-mono">Required</span>
              </div>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={mfaOtp}
                  onChange={(e) => setMfaOtp(e.target.value)}
                  placeholder="123456"
                  className="block w-full pl-9 pr-3 py-2 text-sm font-mono tracking-widest bg-slate-900 border border-slate-700 rounded-lg text-amber-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Authorize & Open Dashboard</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Development Testing Accounts notice */}
          <div className="mt-6 pt-5 border-t border-slate-700/80">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Pre-Configured Development Accounts
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Click to autofill authorized local development credentials:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDevAccount('authority')}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-700/60 border border-slate-700 text-left transition-colors"
              >
                <div className="text-xs font-bold text-blue-400">Election Authority</div>
                <div className="text-[10px] text-slate-400 truncate">admin@eci.gov.in</div>
                <div className="text-[10px] text-slate-500">MFA: 123456</div>
              </button>

              <button
                type="button"
                onClick={() => fillDevAccount('auditor')}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-700/60 border border-slate-700 text-left transition-colors"
              >
                <div className="text-xs font-bold text-purple-400">CAG Auditor</div>
                <div className="text-[10px] text-slate-400 truncate">auditor@cag.gov.in</div>
                <div className="text-[10px] text-slate-500">MFA: 123456</div>
              </button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Link
              to="/voter/login"
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Are you a citizen voter? Go to Voter Login →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
