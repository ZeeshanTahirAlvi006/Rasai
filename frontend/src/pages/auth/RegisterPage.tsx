import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import {
  User,
  Mail,
  Lock,
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
import { register } from '../../api/authApi';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim();
    const cleanEmail = email.trim();

    if (!cleanUsername || !cleanEmail || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (cleanUsername.length < 3) {
      setErrorMessage('Username must be at least 3 characters long.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        username: cleanUsername,
        email: cleanEmail,
        password,
      });

      const devOtp = (res?.data as any)?.devOtp || (res?.user as any)?.devOtp;

      toast.success('Registration successful! Please verify your email.', {
        icon: '📨',
      });

      navigate('/verify', {
        state: {
          email: cleanEmail,
          devOtp,
        },
      });
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Registration failed';
      setErrorMessage(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleFillSample = () => {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    setUsername(`merchant_${randomId}`);
    setEmail(`merchant${randomId}@example.com`);
    setPassword('Password123!');
    setConfirmPassword('Password123!');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Dynamic Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/4 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-[128px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link
            to="/"
            className="inline-flex items-center gap-3 group focus:outline-none"
          >
            <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-purple-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-purple-600/30 group-hover:scale-105 transition-transform ring-1 ring-white/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <span className="font-bold text-xl tracking-tight bg-linear-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent block">
                NDR Middleware
              </span>
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-purple-400">
                Merchant Gateway Setup
              </span>
            </div>
          </Link>

          <h2 className="text-2xl font-bold tracking-tight text-white pt-3">
            Create your merchant account
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Get instant access to automated carrier webhooks, circuit breakers, and parcel tracking.
          </p>
        </div>

        {/* Card Container */}
        <div className="p-8 rounded-3xl bg-slate-900/70 border border-white/10 shadow-2xl backdrop-blur-2xl relative overflow-hidden space-y-6">
          {/* Top Line Accent */}
          <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-purple-500 via-indigo-500 to-cyan-500" />

          {/* Quick Sample Fill Helper */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Want to test quickly?</span>
            </span>
            <button
              type="button"
              onClick={handleFillSample}
              className="text-[11px] font-mono text-purple-300 hover:text-purple-200 font-semibold underline underline-offset-2"
            >
              Generate Sample Account
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Username <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. logistics_pro"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-sans"
                  required
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Email Address <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="e.g. merchant@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-sans"
                  required
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-sans"
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

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Confirm Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-type your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-sans"
                  required
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-linear-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              <span>Already registered? </span>
              <Link
                to="/login"
                className="font-semibold text-purple-300 hover:text-purple-200 transition-colors underline underline-offset-2"
              >
                Sign in
              </Link>
            </div>
            <Link
              to="/dashboard"
              className="hover:text-white transition-colors"
            >
              Return to Dashboard →
            </Link>
          </div>
        </div>

        {/* Security Info */}
        <div className="flex items-center justify-center gap-2 text-slate-500 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          <span>Verification OTP is generated immediately upon registration</span>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
