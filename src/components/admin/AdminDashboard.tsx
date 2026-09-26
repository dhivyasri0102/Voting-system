import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import {
  BarChart3,
  Users,
  ShieldCheck,
  RefreshCw,
  Play,
  Square,
  Clock,
  PlusCircle,
  ArrowRight,
  Server,
  LogOut,
  Wallet,
  CheckCircle2
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext.js';
import { Election } from '../../types/index.js';

/*
|--------------------------------------------------------------------------
| MetaMask browser wallet
|--------------------------------------------------------------------------
*/

declare global {
  interface Window {
    ethereum?: any;
  }
}

/*
|--------------------------------------------------------------------------
| Admin Dashboard
|--------------------------------------------------------------------------
*/

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const {
    adminSession,
    logoutAdmin
  } = useAuth();

  /*
  |--------------------------------------------------------------------------
  | Dashboard state
  |--------------------------------------------------------------------------
  */

  const [stats, setStats] = useState<any>(null);

  const [elections, setElections] =
    useState<Election[]>([]);

  const [loading, setLoading] =
    useState<boolean>(true);

  const [actionLoading, setActionLoading] =
    useState<boolean>(false);

  const [statusMessage, setStatusMessage] =
    useState<string | null>(null);

  /*
  |--------------------------------------------------------------------------
  | Selected election
  |--------------------------------------------------------------------------
  */

  const [selectedElectionId, setSelectedElectionId] =
    useState<string>('');

  /*
  |--------------------------------------------------------------------------
  | Confirmation modal
  |--------------------------------------------------------------------------
  */

  const [modalType, setModalType] =
    useState<'OPEN' | 'CLOSE' | null>(null);

  /*
  |--------------------------------------------------------------------------
  | MetaMask wallet
  |--------------------------------------------------------------------------
  */

  const [walletAddress, setWalletAddress] =
    useState<string>('');

  const [walletConnected, setWalletConnected] =
    useState<boolean>(false);

  /*
  |--------------------------------------------------------------------------
  | Current election
  |--------------------------------------------------------------------------
  */

  const currentElection =
    elections.find(
      (e) => e.id === selectedElectionId
    ) || elections[0];

  /*
  |--------------------------------------------------------------------------
  | Allowed lifecycle actions
  |--------------------------------------------------------------------------
  |
  | DRAFT
  |   ↓
  | SCHEDULED
  |   ↓
  | OPEN
  |   ↓
  | CLOSED
  |   ↓
  | TALLYING
  |   ↓
  | AUDITING
  |   ↓
  | RESULT_PUBLISHED
  |
  |--------------------------------------------------------------------------
  */

  const canOpenElection =
    currentElection?.status === 'DRAFT' ||
    currentElection?.status === 'SCHEDULED';

  const canCloseElection =
    currentElection?.status === 'OPEN';

  /*
  |--------------------------------------------------------------------------
  | Connect MetaMask
  |--------------------------------------------------------------------------
  */

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert(
        'MetaMask is not installed.\n\nPlease install MetaMask and try again.'
      );

      return;
    }

    try {
      const accounts =
        await window.ethereum.request({
          method: 'eth_requestAccounts'
        });

      if (
        accounts &&
        accounts.length > 0
      ) {
        setWalletAddress(accounts[0]);
        setWalletConnected(true);

        setStatusMessage(
          `Wallet connected: ${accounts[0]}`
        );
      }
    } catch (error: any) {
      console.error(
        'MetaMask connection failed:',
        error
      );

      setStatusMessage(
        'MetaMask connection was rejected.'
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Check existing MetaMask connection
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const checkWallet = async () => {
      if (!window.ethereum) {
        return;
      }

      try {
        const accounts =
          await window.ethereum.request({
            method: 'eth_accounts'
          });

        if (
          accounts &&
          accounts.length > 0
        ) {
          setWalletAddress(accounts[0]);
          setWalletConnected(true);
        }
      } catch (error) {
        console.error(
          'Wallet check failed:',
          error
        );
      }
    };

    checkWallet();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | MetaMask account changed
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!window.ethereum) {
      return;
    }

    const handleAccountsChanged = (
      accounts: string[]
    ) => {
      if (
        !accounts ||
        accounts.length === 0
      ) {
        setWalletAddress('');
        setWalletConnected(false);

        setStatusMessage(
          'MetaMask wallet disconnected.'
        );
      } else {
        setWalletAddress(accounts[0]);
        setWalletConnected(true);
      }
    };

    window.ethereum.on(
      'accountsChanged',
      handleAccountsChanged
    );

    return () => {
      window.ethereum.removeListener(
        'accountsChanged',
        handleAccountsChanged
      );
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Load dashboard data
  |--------------------------------------------------------------------------
  */

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      /*
      |--------------------------------------------------------------------------
      | Statistics
      |--------------------------------------------------------------------------
      */

      const statsRes =
        await fetch('/api/v1/admin/stats');

      if (!statsRes.ok) {
        if (statsRes.status === 401) {
          logoutAdmin();
          navigate('/admin', { replace: true });
          return;
        }

        throw new Error(
          'Failed to load statistics'
        );
      }

      const statsData =
        await statsRes.json();

      setStats(statsData);

      /*
      |--------------------------------------------------------------------------
      | Elections
      |--------------------------------------------------------------------------
      */

      const elecRes =
        await fetch('/api/v1/elections');

      if (!elecRes.ok) {
        throw new Error(
          'Failed to load elections'
        );
      }

      const elecData =
        await elecRes.json();

      setElections(
        Array.isArray(elecData)
          ? elecData
          : []
      );

      /*
      |--------------------------------------------------------------------------
      | Select first election only if
      | there is no current selection
      |--------------------------------------------------------------------------
      */

      if (
        Array.isArray(elecData) &&
        elecData.length > 0
      ) {
        const preferredElection =
          elecData.find((e: Election) =>
            ['DRAFT', 'SCHEDULED', 'OPEN'].includes(e.status)
          ) || elecData[0];

        const exists =
          elecData.some(
            (e: Election) =>
              e.id === selectedElectionId
          );

        if (!exists && preferredElection) {
          setSelectedElectionId(
            preferredElection.id
          );
        }
      }
    } catch (error) {
      console.error(
        'Dashboard loading error:',
        error
      );

      setStatusMessage(
        'Unable to load dashboard data.'
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Initial load
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    fetchDashboardData();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | OPEN ELECTION
  |--------------------------------------------------------------------------
  */

  const handleOpenElection = async () => {
    if (!currentElection) {
      setStatusMessage(
        'No election selected.'
      );

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent invalid state transition
    |--------------------------------------------------------------------------
    */

    if (!canOpenElection) {
      setStatusMessage(
        `Cannot open this election because its current status is ${currentElection.status}.`
      );

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Require wallet
    |--------------------------------------------------------------------------
    */

    if (!walletConnected) {
      setStatusMessage(
        'Please connect MetaMask before opening the election.'
      );

      return;
    }

    setActionLoading(true);
    setStatusMessage(null);

    try {
      const res =
        await fetch(
          `/api/v1/admin/elections/${selectedElectionId}/open`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${adminSession?.token}`
            },

            body: JSON.stringify({
              confirm_open: true,

              wallet_address:
                walletAddress
            })
          }
        );

      const data =
        await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          logoutAdmin();
          navigate('/admin', { replace: true });
          return;
        }

        setStatusMessage(
          `Error: ${
            data.message ||
            'Unable to open election.'
          }`
        );

        return;
      }

      setStatusMessage(
        `Success: Election ${selectedElectionId} is now OPEN.`
      );

      setModalType(null);

      await fetchDashboardData();

    } catch (error) {
      console.error(
        'Open election error:',
        error
      );

      setStatusMessage(
        'Network error attempting to open election.'
      );

    } finally {
      setActionLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | CLOSE ELECTION
  |--------------------------------------------------------------------------
  */

  const handleCloseElection = async () => {
    if (!currentElection) {
      setStatusMessage(
        'No election selected.'
      );

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent invalid state transition
    |--------------------------------------------------------------------------
    */

    if (!canCloseElection) {
      setStatusMessage(
        `Cannot close this election because its current status is ${currentElection.status}.`
      );

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Require wallet
    |--------------------------------------------------------------------------
    */

    if (!walletConnected) {
      setStatusMessage(
        'Please connect MetaMask before closing the election.'
      );

      return;
    }

    setActionLoading(true);
    setStatusMessage(null);

    try {
      const res =
        await fetch(
          `/api/v1/admin/elections/${selectedElectionId}/close`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${adminSession?.token}`
            },

            body: JSON.stringify({
              confirm_close: true,

              wallet_address:
                walletAddress
            })
          }
        );

      const data =
        await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          logoutAdmin();
          navigate('/admin', { replace: true });
          return;
        }

        setStatusMessage(
          `Error: ${
            data.message ||
            'Unable to close election.'
          }`
        );

        return;
      }

      setStatusMessage(
        `Success: Election ${selectedElectionId} is now CLOSED.`
      );

      setModalType(null);

      await fetchDashboardData();

    } catch (error) {
      console.error(
        'Close election error:',
        error
      );

      setStatusMessage(
        'Network error attempting to close election.'
      );

    } finally {
      setActionLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Logout
  |--------------------------------------------------------------------------
  */

  const handleLogout = () => {
    logoutAdmin();

    navigate(
      '/admin',
      {
        replace: true
      }
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Statistics
  |--------------------------------------------------------------------------
  */

  const electionStats =
    stats?.electionStats || {};

  const systemStatus =
    stats?.systemStatus || {};

  /*
  |--------------------------------------------------------------------------
  | System status badge
  |--------------------------------------------------------------------------
  */

  const getStatusBadge = (
    status: string
  ) => {
    switch (status) {

      case 'HEALTHY':

        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            HEALTHY
          </span>
        );

      case 'DEGRADED':

        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
            DEGRADED
          </span>
        );

      case 'NOT CONFIGURED':

        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-700 border border-slate-300">
            NOT CONFIGURED
          </span>
        );

      default:

        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300">
            UNAVAILABLE
          </span>
        );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Short wallet address
  |--------------------------------------------------------------------------
  */

  const shortWalletAddress =
    walletAddress
      ? `${walletAddress.slice(
          0,
          6
        )}...${walletAddress.slice(-4)}`
      : '';

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ================================================================
          HEADER
      ================================================================= */}

      <div className="flex flex-col xl:flex-row xl:items-center justify-between pb-4 border-b border-slate-200 gap-4">

        <div>

          <div className="flex items-center space-x-2">

            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-xs font-bold uppercase">
              Role: ELECTION_AUTHORITY
            </span>

            <span className="text-xs text-slate-500 font-mono">
              Badge:{' '}
              {adminSession?.user.profile?.badgeNumber ||
                'ECI-AUTH'}
            </span>

          </div>

          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Election Authority Administrative Dashboard
          </h1>

          <p className="text-xs text-slate-500">
            System overview, election lifecycle management,
            and verified ledger statistics.
          </p>

        </div>


        {/* ==============================================================
            TOP RIGHT BUTTONS
        ============================================================== */}

        <div className="flex flex-wrap items-center gap-2">

          {/* WALLET */}

          {walletConnected ? (

            <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center gap-2">

              <Wallet className="w-4 h-4 text-orange-600" />

              <div>

                <div className="text-[10px] font-bold text-emerald-700">
                  WALLET CONNECTED
                </div>

                <div className="text-[11px] font-mono text-emerald-800">
                  {shortWalletAddress}
                </div>

              </div>

            </div>

          ) : (

            <button
              type="button"
              onClick={connectWallet}
              className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >

              <Wallet className="w-4 h-4" />

              <span>
                Connect Wallet
              </span>

            </button>

          )}


          {/* CREATE */}

          <Link
            to="/admin/elections/create"
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >

            <PlusCircle className="w-3.5 h-3.5" />

            <span>
              Create Election
            </span>

          </Link>


          {/* REFRESH */}

          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
          >

            <RefreshCw
              className={`w-3.5 h-3.5 ${
                loading
                  ? 'animate-spin'
                  : ''
              }`}
            />

            <span>
              Refresh
            </span>

          </button>


          {/* LOGOUT */}

          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5"
          >

            <LogOut className="w-3.5 h-3.5" />

            <span>
              Admin Logout
            </span>

          </button>

        </div>

      </div>


      {/* ================================================================
          STATUS MESSAGE
      ================================================================= */}

      {statusMessage && (

        <div className="p-3.5 rounded-xl bg-slate-900 text-white text-xs font-mono flex items-center justify-between">

          <span>
            {statusMessage}
          </span>

          <button
            type="button"
            onClick={() =>
              setStatusMessage(null)
            }
            className="text-slate-400 hover:text-white ml-3"
          >
            ×
          </button>

        </div>

      )}


      {/* ================================================================
          ELECTION SELECTOR
      ================================================================= */}

      {elections.length > 0 && (

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">

            <div>

              <div className="text-xs font-bold text-slate-500 uppercase">
                Select Election
              </div>

              <div className="text-[11px] text-slate-400 mt-1">
                Choose an election to manage its lifecycle.
              </div>

            </div>

            <select
              value={selectedElectionId}
              onChange={(e) =>
                setSelectedElectionId(
                  e.target.value
                )
              }
              className="w-full md:w-96 px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
            >

              {elections.map(
                (election) => (

                  <option
                    key={election.id}
                    value={election.id}
                  >
                    {election.title} —{' '}
                    {election.status}
                  </option>

                )
              )}

            </select>

          </div>

        </div>

      )}


      {/* ================================================================
          STATISTICS
      ================================================================= */}

      <section className="space-y-3">

        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Election Participation & Tally Telemetry
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">

            <span className="text-[11px] font-semibold text-slate-500">
              Active Elections
            </span>

            <div className="text-xl font-extrabold text-emerald-600 mt-1">
              {electionStats.activeElections ?? 0}
            </div>

            <span className="text-[10px] text-slate-400">
              Currently OPEN
            </span>

          </div>


          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">

            <span className="text-[11px] font-semibold text-slate-500">
              Scheduled
            </span>

            <div className="text-xl font-extrabold text-blue-600 mt-1">
              {electionStats.scheduledElections ?? 0}
            </div>

            <span className="text-[10px] text-slate-400">
              Awaiting start time
            </span>

          </div>


          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">

            <span className="text-[11px] font-semibold text-slate-500">
              Closed / Tallying
            </span>

            <div className="text-xl font-extrabold text-purple-600 mt-1">
              {electionStats.closedElections ?? 0}
            </div>

            <span className="text-[10px] text-slate-400">
              Voting ended
            </span>

          </div>


          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">

            <span className="text-[11px] font-semibold text-slate-500">
              Eligible Electors
            </span>

            <div className="text-xl font-extrabold text-slate-900 mt-1">
              {electionStats.totalEligibleVoters?.toLocaleString() ||
                '2,735,000'}
            </div>

            <span className="text-[10px] text-slate-400">
              In Electoral Roll
            </span>

          </div>


          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">

            <span className="text-[11px] font-semibold text-slate-500">
              Credentials Issued
            </span>

            <div className="text-xl font-extrabold text-indigo-600 mt-1">
              {electionStats.votingCredentialsIssued ?? 0}
            </div>

            <span className="text-[10px] text-slate-400">
              Anonymous tokens
            </span>

          </div>


          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">

            <span className="text-[11px] font-semibold text-slate-500">
              Votes Recorded
            </span>

            <div className="text-xl font-extrabold text-emerald-700 mt-1">
              {electionStats.votesRecorded ?? 0}
            </div>

            <span className="text-[10px] text-slate-400">
              Committed to ledger
            </span>

          </div>


          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">

            <span className="text-[11px] font-semibold text-slate-500">
              Rejected Votes
            </span>

            <div className="text-xl font-extrabold text-rose-600 mt-1">
              {electionStats.rejectedVotes ?? 0}
            </div>

            <span className="text-[10px] text-slate-400">
              Blocked duplicate/invalid
            </span>

          </div>


          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm col-span-2 sm:col-span-3 lg:col-span-3 flex items-center justify-between">

            <div>

              <span className="text-[11px] font-semibold text-slate-500">
                Selected Election Status
              </span>

              <p className="text-sm font-bold text-slate-900 mt-1">
                {currentElection?.title ||
                  'No Election Selected'}
              </p>

              <span className="text-[11px] text-slate-500">
                {currentElection?.constituency}
              </span>

            </div>


            <div className="text-right">

              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${
                currentElection?.status === 'OPEN'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : currentElection?.status === 'SCHEDULED'
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : currentElection?.status === 'CLOSED'
                  ? 'bg-purple-100 text-purple-800 border border-purple-300'
                  : 'bg-slate-100 text-slate-800 border border-slate-300'
              }`}>

                {currentElection?.status ||
                  'NONE'}

              </span>

              <div className="mt-1 text-[10px] text-slate-400">
                Lifecycle State
              </div>

            </div>

          </div>

        </div>

      </section>


      {/* ================================================================
          SYSTEM HEALTH
      ================================================================= */}

      <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">

        <div className="flex items-center justify-between pb-3 border-b border-slate-100">

          <div>

            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">

              <Server className="w-4 h-4 text-blue-600" />

              <span>
                System Health & Integrations
              </span>

            </h2>

            <p className="text-xs text-slate-500">
              Government integration status displays:
              HEALTHY, DEGRADED, NOT CONFIGURED, or
              UNAVAILABLE.
            </p>

          </div>

          <Link
            to="/admin/system"
            className="text-xs font-semibold text-blue-600 flex items-center gap-1"
          >

            View Diagnostics

            <ArrowRight className="w-3.5 h-3.5" />

          </Link>

        </div>


        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">

            <div className="text-slate-500 text-[11px]">
              Backend API
            </div>

            <div className="mt-1">
              {getStatusBadge(
                systemStatus.backend ||
                  'HEALTHY'
              )}
            </div>

            <span className="text-[10px] text-slate-400">
              Express Gateway
            </span>

          </div>


          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">

            <div className="text-slate-500 text-[11px]">
              PostgreSQL DB
            </div>

            <div className="mt-1">
              {getStatusBadge(
                systemStatus.database ||
                  'HEALTHY'
              )}
            </div>

            <span className="text-[10px] text-slate-400">
              State Persistence
            </span>

          </div>


          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">

            <div className="text-slate-500 text-[11px]">
              Redis Cache
            </div>

            <div className="mt-1">
              {getStatusBadge(
                systemStatus.redis ||
                  'HEALTHY'
              )}
            </div>

            <span className="text-[10px] text-slate-400">
              Distributed Lock
            </span>

          </div>


          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">

            <div className="text-slate-500 text-[11px]">
              Hyperledger Fabric
            </div>

            <div className="mt-1">
              {getStatusBadge(
                systemStatus.blockchain ||
                  'HEALTHY'
              )}
            </div>

            <span className="text-[10px] text-slate-400">
              Permissioned Ledger
            </span>

          </div>


          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">

            <div className="text-slate-500 text-[11px]">
              UIDAI Gateway
            </div>

            <div className="mt-1">
              {getStatusBadge(
                systemStatus.uidai ||
                  'NOT CONFIGURED'
              )}
            </div>

            <span className="text-[10px] text-slate-400">
              Aadhaar Auth
            </span>

          </div>


          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">

            <div className="text-slate-500 text-[11px]">
              Electoral Roll
            </div>

            <div className="mt-1">
              {getStatusBadge(
                systemStatus.electoralRoll ||
                  'NOT CONFIGURED'
              )}
            </div>

            <span className="text-[10px] text-slate-400">
              Voter ID Register
            </span>

          </div>

        </div>

      </section>


      {/* ================================================================
          ELECTION LIFECYCLE
      ================================================================= */}

      <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">

        <div className="flex flex-col xl:flex-row xl:items-center justify-between pb-3 border-b border-slate-100 gap-3">

          <div>

            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">

              <Clock className="w-4 h-4 text-purple-600" />

              <span>
                Election Lifecycle Actions
              </span>

            </h2>

            <p className="text-xs text-slate-500 mt-1">

              Current election:{' '}

              <strong>
                {currentElection?.title ||
                  'None'}
              </strong>

            </p>

          </div>


          {/* ==========================================================
              OPEN / CLOSE BUTTONS
          ========================================================== */}

          <div className="flex flex-wrap items-center gap-2">


            {/* OPEN ELECTION */}

            <button
              type="button"
              onClick={() => {

                if (!canOpenElection) {

                  setStatusMessage(
                    `Open Election is not available because the current status is ${currentElection?.status}.`
                  );

                  return;
                }

                setModalType('OPEN');

              }}
              disabled={
                actionLoading ||
                !canOpenElection
              }
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors ${
                canOpenElection
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >

              <Play className="w-3.5 h-3.5 fill-current" />

              <span>
                Open Election
              </span>

            </button>


            {/* CLOSE ELECTION */}

            <button
              type="button"
              onClick={() => {

                if (!canCloseElection) {

                  setStatusMessage(
                    `Close Election is not available because the current status is ${currentElection?.status}.`
                  );

                  return;
                }

                setModalType('CLOSE');

              }}
              disabled={
                actionLoading ||
                !canCloseElection
              }
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors ${
                canCloseElection
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >

              <Square className="w-3.5 h-3.5 fill-current" />

              <span>
                Close Election
              </span>

            </button>


            {/* MANAGE CANDIDATES */}

            {currentElection && (

              <Link
                to={`/admin/elections/${currentElection.id}/candidates`}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5"
              >

                <Users className="w-3.5 h-3.5" />

                <span>
                  Manage Candidates
                </span>

              </Link>

            )}


            {/* RESULTS */}

            {currentElection && (

              <Link
                to={`/admin/results/${currentElection.id}`}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5"
              >

                <BarChart3 className="w-3.5 h-3.5" />

                <span>
                  Results & Tally
                </span>

              </Link>

            )}

          </div>

        </div>


        {/* ==============================================================
            LIFECYCLE DISPLAY
        ============================================================== */}

        <div className="p-4 bg-slate-50 rounded-xl">

          <div className="text-xs font-bold text-slate-700 mb-3">
            Election Lifecycle
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">

            <span className={`px-2 py-1 rounded-lg ${
              currentElection?.status === 'DRAFT'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}>
              DRAFT
            </span>

            <span>
              →
            </span>

            <span className={`px-2 py-1 rounded-lg ${
              currentElection?.status === 'SCHEDULED'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}>
              SCHEDULED
            </span>

            <span>
              →
            </span>

            <span className={`px-2 py-1 rounded-lg ${
              currentElection?.status === 'OPEN'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}>
              OPEN
            </span>

            <span>
              →
            </span>

            <span className={`px-2 py-1 rounded-lg ${
              currentElection?.status === 'CLOSED'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}>
              CLOSED
            </span>

            <span>
              →
            </span>

            <span className={`px-2 py-1 rounded-lg ${
              currentElection?.status === 'TALLYING'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}>
              TALLYING
            </span>

            <span>
              →
            </span>

            <span className={`px-2 py-1 rounded-lg ${
              currentElection?.status === 'AUDITING'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}>
              AUDITING
            </span>

            <span>
              →
            </span>

            <span className={`px-2 py-1 rounded-lg ${
              currentElection?.status === 'RESULT_PUBLISHED'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}>
              RESULT_PUBLISHED
            </span>

          </div>

        </div>


        {/* ==============================================================
            STATUS INFORMATION
        ============================================================== */}

        <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-600 flex items-start gap-2">

          <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5" />

          <div>

            <strong>
              Strict RBAC & Audit Enforcement:
            </strong>

            <span className="ml-1">
              Administrators cannot cast ballots or view
              individual voter choices. Election lifecycle
              actions are recorded in the audit trail.
            </span>

          </div>

        </div>

      </section>


      {/* ================================================================
          CONFIRMATION MODAL
      ================================================================= */}

      {modalType && currentElection && (

        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">

          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">

            {/* TITLE */}

            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">

              {modalType === 'OPEN' ? (

                <>
                  <Play className="w-5 h-5 text-emerald-600 fill-current" />

                  <span>
                    Confirm Opening Election
                  </span>
                </>

              ) : (

                <>
                  <Square className="w-5 h-5 text-red-600 fill-current" />

                  <span>
                    Confirm Closing Election
                  </span>
                </>

              )}

            </h3>


            {/* DESCRIPTION */}

            <p className="text-xs text-slate-600 leading-relaxed mt-4">

              {modalType === 'OPEN'

                ? `You are about to OPEN "${currentElection.title}". Eligible voters will be able to cast ballots after the election is opened.`

                : `You are about to CLOSE "${currentElection.title}". New voting should stop after the election is closed.`

              }

            </p>


            {/* DETAILS */}

            <div className="p-3 bg-slate-100 rounded-xl text-xs space-y-2 text-slate-700 mt-4">

              <div>
                <strong>
                  Election:
                </strong>{' '}

                {currentElection.title}

              </div>

              <div>
                <strong>
                  Constituency:
                </strong>{' '}

                {currentElection.constituency}

              </div>

              <div>
                <strong>
                  Current Status:
                </strong>{' '}

                {currentElection.status}

              </div>

              <div>
                <strong>
                  Admin:
                </strong>{' '}

                {adminSession?.user.fullName}

              </div>

              <div>
                <strong>
                  Wallet:
                </strong>{' '}

                {walletConnected
                  ? shortWalletAddress
                  : 'Not connected'}

              </div>

            </div>


            {/* WALLET WARNING */}

            {!walletConnected && (

              <div className="mt-4 p-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs">

                Connect MetaMask before confirming
                this lifecycle action.

              </div>

            )}


            {/* MODAL BUTTONS */}

            <div className="flex justify-end gap-2 mt-5">

              <button
                type="button"
                onClick={() =>
                  setModalType(null)
                }
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>


              {modalType === 'OPEN' && (

                <button
                  type="button"
                  onClick={handleOpenElection}
                  disabled={
                    actionLoading ||
                    !walletConnected ||
                    !canOpenElection
                  }
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white text-xs font-bold"
                >

                  {actionLoading
                    ? 'Opening...'
                    : 'Confirm Open Election'}

                </button>

              )}


              {modalType === 'CLOSE' && (

                <button
                  type="button"
                  onClick={handleCloseElection}
                  disabled={
                    actionLoading ||
                    !walletConnected ||
                    !canCloseElection
                  }
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-slate-400 text-white text-xs font-bold"
                >

                  {actionLoading
                    ? 'Closing...'
                    : 'Confirm Close Election'}

                </button>

              )}

            </div>

          </div>

        </div>

      )}

    </div>
  );
};