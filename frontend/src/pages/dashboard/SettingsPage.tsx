// src/pages/dashboard/SettingsPage.tsx
import React, { useState } from 'react';
import {
  User,
  Shield,
  Key,
  Truck,
  Sliders,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Globe,
  Clock,
  FileSpreadsheet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import CarrierBadge from '../../components/shipments/CarrierBadge';

export const SettingsPage: React.FC = () => {
  const { user, accessToken, logout, logoutAll } = useAuth();
  const { theme, setTheme } = useTheme();

  const [loggingOut, setLoggingOut] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (err: any) {
      toast.error('Logout error: ' + (err.message || 'Unknown'));
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('Are you sure you want to revoke ALL active sessions across all devices?')) return;
    setLoggingOutAll(true);
    try {
      await logoutAll();
      toast.success('All active sessions revoked');
    } catch (err: any) {
      toast.error('Error revoking sessions: ' + (err.message || 'Unknown'));
    } finally {
      setLoggingOutAll(false);
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Page Header Bar */}
      <div className="p-4 border border-zinc-800 bg-zinc-950/80 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white uppercase tracking-wider">
              Configuration
            </h1>
            <span className="text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 border border-zinc-800">
              OPERATIONAL SETTINGS
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Merchant profile, session security controls, carrier integration matrix, and system preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Section 1: Account */}
        <div className="border border-zinc-800 bg-zinc-950 space-y-3 p-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2.5">
            <User className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              1. Account
            </h2>
          </div>

          <div className="space-y-2.5 text-[11px]">
            <div className="p-2.5 border border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
              <span className="text-zinc-400">Username</span>
              <span className="font-bold text-white">{user?.username || 'GUEST'}</span>
            </div>

            <div className="p-2.5 border border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
              <span className="text-zinc-400">Email Address</span>
              <span className="text-zinc-200">{user?.email || 'N/A'}</span>
            </div>

            <div className="p-2.5 border border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
              <span className="text-zinc-400">Verification Status</span>
              <span className={`px-1.5 py-0.2 uppercase text-[9px] font-bold border ${
                user?.verified
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                {user?.verified ? 'VERIFIED' : 'PENDING OTP'}
              </span>
            </div>

            <div className="p-2.5 border border-zinc-800/80 bg-zinc-900/40">
              <span className="text-zinc-400 block mb-1">Active Bearer Token Fingerprint</span>
              <div className="font-mono text-[10px] text-zinc-500 truncate bg-black p-1.5 border border-zinc-800">
                {accessToken ? `${accessToken.slice(0, 16)}...${accessToken.slice(-8)}` : 'DISCONNECTED (401)'}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Security & Sessions */}
        <div className="border border-zinc-800 bg-zinc-950 space-y-3 p-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2.5">
            <Lock className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              2. Security & Sessions
            </h2>
          </div>

          <div className="space-y-3 text-[11px]">
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              Session management enforces single-flight token rotation and SHA-256 HMAC refresh tokens.
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 uppercase font-bold text-xs transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{loggingOut ? 'Logging out...' : 'Logout Current Session'}</span>
              </button>

              <button
                onClick={handleLogoutAll}
                disabled={loggingOutAll}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-rose-900/60 bg-rose-950/40 hover:bg-rose-950 text-rose-300 uppercase font-bold text-xs transition-colors"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{loggingOutAll ? 'Revoking...' : 'Revoke All Active Sessions (Logout All)'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Couriers */}
        <div className="border border-zinc-800 bg-zinc-950 space-y-3 p-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2.5">
            <Truck className="w-4 h-4 text-purple-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              3. Couriers
            </h2>
          </div>

          <div className="space-y-2 text-[11px]">
            {[
              { carrier: 'POSTEX', mode: 'POLLING (Active)', timeout: '8,000ms', webhook: 'DISABLED (Off by default)' },
              { carrier: 'TRAX', mode: 'POLLING (Active)', timeout: '8,000ms', webhook: 'DISABLED (Off by default)' },
              { carrier: 'LEOPARDS', mode: 'POLLING (Active)', timeout: '12,000ms', webhook: 'N/A' },
              { carrier: 'TCS', mode: 'POLLING (Active)', timeout: '15,000ms', webhook: 'N/A' },
            ].map((c) => (
              <div key={c.carrier} className="p-2.5 border border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">{c.carrier}</span>
                  <span className="text-[10px] text-zinc-500">Timeout: {c.timeout}</span>
                </div>
                <div className="text-right">
                  <span className="px-1.5 py-0.2 uppercase text-[9px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 block mb-0.5">
                    {c.mode}
                  </span>
                  <span className="text-[9px] text-zinc-500">Webhooks: {c.webhook}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Preferences */}
        <div className="border border-zinc-800 bg-zinc-950 space-y-3 p-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2.5">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              4. Preferences
            </h2>
          </div>

          <div className="space-y-2.5 text-[11px]">
            <div className="p-2.5 border border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Theme Aesthetic</span>
                <span className="text-[10px] text-zinc-500">High-Density Monochrome Terminal</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setTheme('dark')}
                  className={`px-2 py-1 text-[10px] font-bold uppercase border ${
                    theme === 'dark' ? 'bg-zinc-100 text-zinc-950 border-white' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                  }`}
                >
                  Dark
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`px-2 py-1 text-[10px] font-bold uppercase border ${
                    theme === 'light' ? 'bg-zinc-100 text-zinc-950 border-white' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                  }`}
                >
                  Light
                </button>
              </div>
            </div>

            <div className="p-2.5 border border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">07:30 PKT Manifest Schedule</span>
                <span className="text-[10px] text-zinc-500">Automated BullMQ single-fire runner</span>
              </div>
              <span className="px-1.5 py-0.2 uppercase text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>

            <div className="p-2.5 border border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">CSV Formula Neutralization</span>
                <span className="text-[10px] text-zinc-500">Sanitizes =, +, -, @ RFC-4180 chars</span>
              </div>
              <span className="px-1.5 py-0.2 uppercase text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ENFORCED
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
