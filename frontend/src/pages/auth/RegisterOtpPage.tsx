// src/pages/auth/RegisterOtpPage.tsx
// Email OTP verification view styled with Uiverse.io inset dark aesthetic
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { verifyOtp, resendEmailVerificationOtp } from '../../api/authApi';
import { LockIcon, MailIcon } from '../../components/auth/UiverseIcons';
import { RasaiBrandHeader } from '../../components/auth/RasaiBrandHeader';
import { InteractiveGridBackground } from '../../components/auth/InteractiveGridBackground';
import './auth-uiverse.css';

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
    <div className="uiverse-auth-wrapper">
      {/* Interactive cursor tracking grid animation */}
      <InteractiveGridBackground />

      {/* Top of Screen Branding: English 'rasai' left, borderless logo center, Urdu 'رسائی' right */}
      <RasaiBrandHeader />

      <div className="uiverse-container">
        {/* Uiverse Form Card */}
        <form className="form uiverse-form" onSubmit={handleSubmit}>
          <p id="heading" className="uiverse-heading">Verify OTP</p>

          {/* Dev Mode Code Auto-fill Hint */}
          {devOtp && (
            <div className="uiverse-info-pill">
              <span>Dev OTP: <strong style={{ color: '#67e8f9', letterSpacing: '2px' }}>{devOtp}</strong></span>
              <button
                type="button"
                onClick={() => setOtp(devOtp)}
                className="uiverse-demo-link"
              >
                Auto-fill Code
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="uiverse-error-box">
              {errorMessage}
            </div>
          )}

          {/* Email Field */}
          <div className="field uiverse-field">
            <MailIcon className="input-icon uiverse-input-icon" />
            <input
              autoComplete="off"
              placeholder="Email address"
              className="input-field uiverse-input-field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* OTP Code Field */}
          <div className="field uiverse-field">
            <LockIcon className="input-icon uiverse-input-icon" />
            <input
              autoComplete="off"
              maxLength={6}
              placeholder="6-Digit OTP"
              className="input-field uiverse-input-field"
              style={{ letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold', color: '#67e8f9' }}
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.toUpperCase())}
              required
              autoFocus
            />
          </div>

          {/* Button Row: Verify & Resend */}
          <div className="btn uiverse-btn-row">
            <button
              className="button1 uiverse-button1"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: '12px',
                      height: '12px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#ffffff',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <span>Verifying...</span>
                </>
              ) : (
                <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Verify&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</>
              )}
            </button>
            <button
              className="button2 uiverse-button2"
              type="button"
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
            >
              {resending ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : resendCooldown > 0 ? (
                `Wait ${resendCooldown}s`
              ) : (
                'Resend'
              )}
            </button>
          </div>

          {/* Tertiary Action: Back to Login */}
          <button
            className="button3 uiverse-button3"
            type="button"
            onClick={() => navigate('/login')}
          >
            ← Back to Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterOtpPage;
