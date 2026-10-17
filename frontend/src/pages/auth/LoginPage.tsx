import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Zap,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { login } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import { setInMemoryToken } from '../../api/api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAccessToken, setUser } = useAuth();

  // Pre-fill from redirect if available
  const initialUsername = location.state?.username || location.state?.email || '';
  const [username, setUsername] = useState<string>(initialUsername);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setUnverifiedEmail(null);

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setErrorMessage('Please provide both username/email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login({ username: cleanUsername, password });

      const token =
        res?.data?.accessToken ||
        (res?.data as any)?.user?.accessToken ||
        res?.accessToken;

      const userData = res?.data?.user || res?.user;

      if (token) {
        setAccessToken(token);
        setInMemoryToken(token);
      }

      if (userData) {
        setUser(userData);
      }

      toast.success(`Welcome back${userData?.username ? ', ' + userData.username : ''}!`, {
        icon: '🚀',
      });

      // Navigate to destination or default dashboard
      const from = (location.state as any)?.from || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Authentication failed';

      if (serverMsg.toLowerCase().includes('not verified')) {
        setUnverifiedEmail(cleanUsername);
        setErrorMessage(
          'Your email has not been verified yet. Please enter the OTP sent during registration.',
        );
      } else {
        setErrorMessage(serverMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setUsername('merchant1');
    setPassword('Password123!');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Dynamic Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-[128px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link
            to="/"
            className="inline-flex items-center gap-3 group focus:outline-none"
          >
            <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform ring-1 ring-white/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <span className="font-bold text-xl tracking-tight bg-linear-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent block">
                NDR Middleware
              </span>
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-cyan-400">
                Logistics & Carrier Gateway
              </span>
            </div>
          </Link>

          <h2 className="text-2xl font-bold tracking-tight text-white pt-3">
            Sign in to your account
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Manage parcel lifecycles, monitor carrier webhooks, and trigger state engine workflows.
          </p>
        </div>

        {/* Card Container */}
        <div className="p-8 rounded-3xl bg-slate-900/70 border border-white/10 shadow-2xl backdrop-blur-2xl relative overflow-hidden space-y-6">
          {/* Top Line Accent */}
          <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-indigo-500 via-purple-500 to-cyan-500" />

          {/* Quick Demo Fill Helper */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Test merchant demo account?</span>
            </span>
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-[11px] font-mono text-cyan-300 hover:text-cyan-200 font-semibold underline underline-offset-2"
            >
              Auto-fill Demo
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
              {unverifiedEmail && (
                <div className="pt-2 border-t border-rose-500/20 flex justify-end">
                  <Link
                    to="/verify"
                    state={{ email: unverifiedEmail }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-semibold text-xs hover:bg-amber-400 transition-colors shadow-sm"
                  >
                    <span>Verify Email with OTP</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username or Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Username or Email <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. merchant1 or email@domain.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-sans"
                  required
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 block">
                  Password <span className="text-rose-400">*</span>
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-sans"
                  required
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors absolute right-2.5 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-linear-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              <span>Don't have an account? </span>
              <Link
                to="/register"
                className="font-semibold text-cyan-300 hover:text-cyan-200 transition-colors underline underline-offset-2"
              >
                Create one
              </Link>
            </div>
            <Link
              to="/dashboard"
              className="hover:text-white transition-colors"
            >
              Go to Dashboard →
            </Link>
          </div>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 text-slate-500 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Secured with JWT HTTP-only sessions & AES-256 field encryption</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
