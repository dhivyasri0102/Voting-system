import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, AdminProfile, AccessibilityPreferences } from '../types/index.js';

interface AdminSessionData {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    fullName: string;
    role: UserRole;
    profile?: AdminProfile;
  };
  expiresAt: string;
}

export interface VoterSessionData {
  voterId: string;
  fullNameMasked: string;
  constituency: string;
  state: string;
  isRegistered: boolean;
  hasVoted: boolean;
  authReference?: string;
  rawCredential?: string;
  credentialHash?: string;
  lastVoteReceipt?: {
    transactionReference: string;
    blockIndex: number;
    blockHash: string;
    timestamp: string;
    electionId: string;
  };
}

interface AuthContextType {
  // Admin State
  adminSession: AdminSessionData | null;
  isAdminAuthenticated: boolean;
  loginAdmin: (session: AdminSessionData) => void;
  logoutAdmin: () => void;

  // Voter State
  voterSession: VoterSessionData | null;
  isVoterAuthenticated: boolean;
  loginVoter: (voter: VoterSessionData) => void;
  updateVoterSession: (updates: Partial<VoterSessionData>) => void;
  logoutVoter: () => void;

  // Accessibility & Language State
  accessibility: AccessibilityPreferences;
  setAccessibility: React.Dispatch<React.SetStateAction<AccessibilityPreferences>>;
  toggleLanguage: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Admin Session State (persisted in sessionStorage and localStorage adminAuthenticated flag)
  const [adminSession, setAdminSession] = useState<AdminSessionData | null>(() => {
    try {
      const stored = sessionStorage.getItem('evoting_admin_session');
      const isAuthFlag = localStorage.getItem('adminAuthenticated') === 'true';
      if (stored && isAuthFlag) {
        const parsed = JSON.parse(stored);
        if (new Date(parsed.expiresAt).getTime() > Date.now()) {
          return parsed;
        }
        sessionStorage.removeItem('evoting_admin_session');
        localStorage.removeItem('adminAuthenticated');
      }
    } catch (e) {
      console.error('Failed to parse admin session', e);
    }
    return null;
  });

  // 2. Voter Session State (isolated in sessionStorage)
  const [voterSession, setVoterSession] = useState<VoterSessionData | null>(() => {
    try {
      const stored = sessionStorage.getItem('evoting_voter_session');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse voter session', e);
    }
    return null;
  });

  // 3. Accessibility & Language State
  const [accessibility, setAccessibility] = useState<AccessibilityPreferences>(() => {
    try {
      const stored = localStorage.getItem('evoting_accessibility');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {
      seniorCitizenMode: false,
      highContrast: false,
      fontSize: 'normal',
      language: 'en',
      speechAssistance: false,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('evoting_accessibility', JSON.stringify(accessibility));
    } catch (e) {}
  }, [accessibility]);

  const loginAdmin = (session: AdminSessionData) => {
    setAdminSession(session);
    sessionStorage.setItem('evoting_admin_session', JSON.stringify(session));
    localStorage.setItem('adminAuthenticated', 'true');
  };

  const logoutAdmin = () => {
    setAdminSession(null);
    sessionStorage.removeItem('evoting_admin_session');
    localStorage.removeItem('adminAuthenticated');
    localStorage.setItem('adminAuthenticated', 'false');
    // Call server logout
    if (adminSession?.token) {
      fetch('/api/v1/auth/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminSession.token}` },
      }).catch(() => {});
    }
  };

  const loginVoter = (voter: VoterSessionData) => {
    setVoterSession(voter);
    sessionStorage.setItem('evoting_voter_session', JSON.stringify(voter));
  };

  const updateVoterSession = (updates: Partial<VoterSessionData>) => {
    setVoterSession((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      sessionStorage.setItem('evoting_voter_session', JSON.stringify(updated));
      return updated;
    });
  };

  const logoutVoter = () => {
    setVoterSession(null);
    sessionStorage.removeItem('evoting_voter_session');
  };

  const toggleLanguage = () => {
    setAccessibility((prev) => ({
      ...prev,
      language: prev.language === 'en' ? 'ta' : 'en',
    }));
  };

  return (
    <AuthContext.Provider
      value={{
        adminSession,
        isAdminAuthenticated: !!adminSession && adminSession.user.role === 'ELECTION_AUTHORITY' && localStorage.getItem('adminAuthenticated') === 'true',
        loginAdmin,
        logoutAdmin,
        voterSession,
        isVoterAuthenticated: !!voterSession && voterSession.isRegistered,
        loginVoter,
        updateVoterSession,
        logoutVoter,
        accessibility,
        setAccessibility,
        toggleLanguage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
