// src/components/shipments/QuickAuthModal.tsx
import React, { useState } from 'react';
import {
  X,
  Key,
  LogIn,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { login } from '../../api/authApi';
import { setInMemoryToken } from '../../api/api';

interface QuickAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickAuthModal: React.FC<QuickAuthModalProps> = ({ isOpen, onClose }) => {
  const { accessToken, setAccessToken, user, setUser, logout } = useAuth();
  const [username, setUsername] = useState('merchant1');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const [manualToken, setManualToken] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    try {
      const res: any = await login({ username, password }, controller.signal);
      const token = res?.data?.accessToken || res?.data?.user?.accessToken || res?.accessToken;
      if (token) {
        setAccessToken(token);
        setInMemoryToken(token);
      }
      const userData = res?.data?.user || res?.user;
      if (userData) {
        setUser(userData);
      }
      toast.success('Logged in successfully!');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyManualToken = () => {
    if (!manualToken.trim()) {
      toast.error('Token cannot be empty');
      return;
    }
    const clean = manualToken.trim().replace(/^Bearer\s+/i, '');
    setAccessToken(clean);
    setInMemoryToken(clean);
    toast.success('Bearer token applied!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Glow Top Accent */}
        <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-indigo-500 via-purple-500 to-cyan-500" />

        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Merchant Authentication</h3>
              <p className="text-xs text-slate-400">Configure credentials for shipment endpoints</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Current Auth Status */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Current Session Status
            </span>
            <div className="flex items-center justify-between gap-3">
              {accessToken ? (
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 font-medium">
                    Authenticated {user ? `as ${user.username || user.email}` : 'via Bearer Token'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-300 font-medium">No active session (401 Unauthorized)</span>
                </div>
              )}

              {accessToken && (
                <button
                  onClick={() => {
                    logout();
                    setAccessToken(null);
                    setInMemoryToken(null);
                    toast.success('Logged out');
                  }}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition-colors"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>

          {/* Option 1: Quick Merchant Login */}
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <LogIn className="w-3.5 h-3.5 text-indigo-400" />
              <span>Login with Merchant Account</span>
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Username / Email</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-linear-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Authenticating...' : 'Sign In as Merchant'}</span>
            </button>
          </form>

          {/* Divider */}
          <div className="relative text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <span className="relative px-3 bg-slate-900 text-[11px] text-slate-500 font-mono">
              OR ATTACH MANUAL TOKEN
            </span>
          </div>

          {/* Option 2: Manual Bearer Token */}
          <div className="space-y-2">
            <label className="block text-xs text-slate-300 font-medium">
              Paste JWT Bearer Token:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleApplyManualToken}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors shrink-0"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickAuthModal;
