import React from 'react';
import { Link, useNavigate } from 'react-router';
import { Activity, ShieldCheck, Truck, Zap, LogOut, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: 'track' | 'health' | 'simulator' | 'shipments';
  setActiveTab: (tab: 'track' | 'health' | 'simulator' | 'shipments') => void;
  systemHealthy?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  systemHealthy = true,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/10 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand & System Status */}
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-linear-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  NDR Middleware
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  Carrier Suite
                </span>
              </div>
              <p className="text-xs text-slate-400">Carrier Health & Shipment Tracking</p>
            </div>
          </div>

          {/* System Pulse Indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${systemHealthy ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${systemHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span>{systemHealthy ? 'All Carriers Operational' : 'Degraded Carriers Detected'}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-white/10 shadow-inner">
          <button
            onClick={() => setActiveTab('track')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'track'
              ? 'bg-linear-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
          >
            <Truck className="w-4 h-4" />
            <span>Live Tracker</span>
          </button>

          <button
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'health'
              ? 'bg-linear-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Carrier Health</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'simulator'
              ? 'bg-linear-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
          >
            <Activity className="w-4 h-4" />
            <span>Breaker Sandbox</span>
          </button>

          <button
            onClick={() => setActiveTab('shipments')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'shipments'
              ? 'bg-linear-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
          >
            <Package className="w-4 h-4" />
            <span>Shipments Suite</span>
          </button>
        </nav>

        {/* User Profile or Sign In / Register Actions */}
        {user ? (
          <div className="flex items-center gap-3 pl-2 border-l border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs uppercase">
                {(user.username || user.email || 'M')[0]}
              </div>
              <span className="text-xs text-slate-300 font-medium hidden sm:inline">
                {user.username || user.email}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <Link
              to="/login"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-linear-to-r from-indigo-600 to-cyan-500 text-white shadow-sm hover:from-indigo-500 hover:to-cyan-400 transition-all"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
export default Navbar;
