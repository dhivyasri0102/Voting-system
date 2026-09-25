import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { LandingPage } from './components/LandingPage.js';
import { SeniorModeAssistant } from './components/SeniorModeAssistant.js';
import { VoiceGuidanceProvider, VoiceGuidanceBar } from './components/VoiceGuidance.js';

// Admin Portal Components
import { AdminLogin } from './components/admin/AdminLogin.js';
import { AdminLayout } from './components/admin/AdminLayout.js';
import { AdminDashboard } from './components/admin/AdminDashboard.js';
import { AdminElectionCreate } from './components/admin/AdminElectionCreate.js';
import { AdminCandidateManagement } from './components/admin/AdminCandidateManagement.js';
import { AdminResultsDashboard } from './components/admin/AdminResultsDashboard.js';
import { AdminAuditDashboard } from './components/admin/AdminAuditDashboard.js';
import { AdminSystemHealth } from './components/admin/AdminSystemHealth.js';

// Voter Portal Components
import { VoterLogin } from './components/voter/VoterLogin.js';
import { VoterLayout } from './components/voter/VoterLayout.js';
import { VoterDashboard } from './components/voter/VoterDashboard.js';
import { VoterCandidateSelect } from './components/voter/VoterCandidateSelect.js';
import { VoterBallotReview } from './components/voter/VoterBallotReview.js';
import { VoterConfirmation } from './components/voter/VoterConfirmation.js';
import { VoterStatus } from './components/voter/VoterStatus.js';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <VoiceGuidanceProvider>
          <SeniorModeAssistant />
          <VoiceGuidanceBar />
          <Routes>
          {/* 1. Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* 2. Hidden Admin Entry Point */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/login" element={<Navigate to="/admin" replace />} />

          {/* 3. Admin Protected Portal */}
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/elections" element={<AdminDashboard />} />
            <Route path="/admin/elections/create" element={<AdminElectionCreate />} />
            <Route path="/admin/candidates" element={<AdminCandidateManagement />} />
            <Route path="/admin/elections/:electionId/candidates" element={<AdminCandidateManagement />} />
            <Route path="/admin/results/:electionId" element={<AdminResultsDashboard />} />
            <Route path="/admin/audit" element={<AdminAuditDashboard />} />
            <Route path="/admin/security" element={<AdminSystemHealth />} />
            <Route path="/admin/system" element={<AdminSystemHealth />} />
          </Route>

          {/* 4. Voter Authentication */}
          <Route path="/login" element={<Navigate to="/voter/login" replace />} />
          <Route path="/voter/login" element={<VoterLogin />} />

          {/* 5. Voter Protected Portal */}
          <Route path="/voter" element={<VoterLayout />}>
            <Route index element={<Navigate to="/voter/dashboard" replace />} />
            <Route path="dashboard" element={<VoterDashboard />} />
            <Route path="elections" element={<VoterDashboard />} />
            <Route path="election/:electionId/candidates" element={<VoterCandidateSelect />} />
            <Route path="election/:electionId/ballot" element={<VoterBallotReview />} />
            <Route path="election/:electionId/review" element={<VoterBallotReview />} />
            <Route path="vote-confirmation" element={<VoterConfirmation />} />
            <Route path="status" element={<VoterStatus />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </VoiceGuidanceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
