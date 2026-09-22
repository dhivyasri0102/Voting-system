import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, LayoutDashboard, Vote, Users, PlusCircle, Award, 
  BarChart3, FileText, ShieldAlert, Cpu, LogOut, CheckCircle2, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminSession, isAdminAuthenticated, logoutAdmin } = useAuth();

  // Route protection
  if (!isAdminAuthenticated || !adminSession) {
    navigate('/admin/login', { replace: true });
    return null;
  }

  const handleLogout = () => {
    logoutAdmin();
    navigate('/admin/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'All Elections', path: '/admin/elections', icon: Vote },
    { label: 'Create Election', path: '/admin/elections/create', icon: PlusCircle },
    { label: 'Candidate Management', path: '/admin/elections/ELEC-2026-CHENN-01/candidates', icon: Users },
    { label: 'Election Results', path: '/admin/results/ELEC-2026-CHENN-01', icon: BarChart3 },
    { label: 'Audit Logs', path: '/admin/audit', icon: FileText },
    { label: 'Security Events', path: '/admin/security', icon: ShieldAlert },
    { label: 'System & Health', path: '/admin/system', icon: Cpu },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-900 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col shrink-0">
        {/* Authority Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">Election Authority</h1>
            <p className="text-[10px] text-slate-400 font-mono">ECI National Portal</p>
          </div>
        </div>

        {/* Admin Session Identity Card */}
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-400 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800">
              {adminSession.user.role}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">MFA ACTIVE</span>
          </div>
          <p className="text-xs font-semibold text-slate-200 mt-1 truncate">
            {adminSession.user.fullName}
          </p>
          <p className="text-[10px] text-slate-400 truncate">
            {adminSession.user.profile?.badgeNumber || adminSession.user.email}
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5" />}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer / Logout */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Authority</span>
          </button>
        </div>
      </aside>

      {/* Main Content View */}
      <main className="flex-1 overflow-y-auto min-h-screen">
        <Outlet />
      </main>
    </div>
  );
};
