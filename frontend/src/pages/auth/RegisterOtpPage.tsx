import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import {
  Mail,
  KeyRound,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Zap,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { verifyOtp, resendEmailVerificationOtp } from '../../api/authApi';

export const RegisterOtpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const stateEmail = location.state?.email || '';
  const devOtp = location.state?.devOtp || '';

  const [email, setEmail] = useState<string>(stateEmail);
  const [otp, setOtp] = useState<string>(devOtp || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    const cleanOtp = otp.trim();

    if (!cleanEmail || !cleanOtp) {
      setErrorMessage('Please provide both your email address and 6-digit OTP code.');
      return;
    }

    if (cleanOtp.length !== 6) {
      setErrorMessage('Verification code must be exactly 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp({
        email: cleanEmail,
        otp: cleanOtp,
      });

      toast.success('Email verified successfully! You can now sign in.', {
        icon: '🎉',
        duration: 3000,
      });

      navigate('/login', {
        state: { email: cleanEmail },
      });
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Verification failed';
      setErrorMessage(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email to resend OTP.');
      return;
    }

    setResending(true);
    setErrorMessage(null);
    try {
      await resendEmailVerificationOtp(cleanEmail);
      toast.success('New verification code sent! Check your inbox or console.', {
        icon: '📨',
      });
      setResendCooldown(30);
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to resend code';
      setErrorMessage(serverMsg);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Dynamic Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-[128px]" />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link
            to="/"
            className="inline-flex items-center gap-3 group focus:outline-none"
          >
            <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-cyan-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-600/30 group-hover:scale-105 transition-transform ring-1 ring-white/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <span className="font-bold text-xl tracking-tight bg-linear-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent block">
                NDR Middleware
              </span>
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-cyan-400">
                Security Verification
              </span>
            </div>
          </Link>

          <h2 className="text-2xl font-bold tracking-tight text-white pt-3">
            Verify your email address
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Enter the 6-digit verification code sent to your email to activate your account.
          </p>
        </div>

        {/* Card Container */}
        <div className="p-8 rounded-3xl bg-slate-900/70 border border-white/10 shadow-2xl backdrop-blur-2xl relative overflow-hidden space-y-6">
          {/* Top Line Accent */}
          <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-cyan-500 via-indigo-500 to-purple-500" />

          {/* Dev Mode Code Helper (if detected) */}
          {devOtp && (
            <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-xs space-y-2 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-cyan-300 flex items-center gap-1.5 font-bold">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Dev Mode OTP Detected:</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-400/20 text-cyan-200 font-mono font-bold tracking-widest text-sm">
                  {devOtp}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOtp(devOtp)}
                className="w-full text-center py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-[11px] font-semibold transition-colors"
              >
                Click to Auto-fill Code ({devOtp})
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Address */}
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-sans"
                  required
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* OTP Code */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                6-Digit Verification Code <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-white/10 text-base text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono tracking-widest text-center"
                  required
                  autoFocus
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-linear-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 shadow-lg shadow-cyan-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Verify Email & Activate</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Resend Action */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 text-xs">
            <span className="text-slate-400">Didn't receive the code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              className="inline-flex items-center gap-1.5 font-semibold text-cyan-300 hover:text-cyan-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              <span>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </span>
            </button>
          </div>

          {/* Footer Navigation */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <Link
              to="/login"
              className="hover:text-white transition-colors"
            >
              ← Back to Sign In
            </Link>
            <Link
              to="/register"
              className="hover:text-white transition-colors"
            >
              Change Email
            </Link>
          </div>
        </div>

        {/* Security Notice */}
        <div className="flex items-center justify-center gap-2 text-slate-500 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>OTPs are cryptographically hashed and expire in 10 minutes</span>
        </div>
      </div>
    </div>
  );
};

export default RegisterOtpPage;
