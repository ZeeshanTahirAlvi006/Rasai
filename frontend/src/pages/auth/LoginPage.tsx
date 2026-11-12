// src/pages/auth/LoginPage.tsx
// Authentication login view styled with Uiverse.io inset dark aesthetic
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { login } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import { setInMemoryToken } from '../../api/api';
import { AtIcon, LockIcon } from '../../components/auth/UiverseIcons';
import { RasaiBrandHeader } from '../../components/auth/RasaiBrandHeader';
import { InteractiveGridBackground } from '../../components/auth/InteractiveGridBackground';
import './auth-uiverse.css';

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

      const from = (location.state as any)?.from || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      const rawMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;

      const serverMsg =
        typeof rawMsg === 'string'
          ? rawMsg
          : typeof rawMsg === 'object' && rawMsg?.message
          ? String(rawMsg.message)
          : 'Authentication failed';

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

  const handleForgotPassword = () => {
    toast('Password reset instructions will be sent to your registered email.', {
      icon: '🔑',
    });
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
          <p id="heading" className="uiverse-heading">Login</p>

          {/* Quick Demo Autofill Hint */}
          <div className="uiverse-info-pill">
            <span>Demo merchant account?</span>
            <button
              type="button"
              onClick={handleFillDemo}
              className="uiverse-demo-link"
            >
              Auto-fill Demo
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="uiverse-error-box">
              <div>{errorMessage}</div>
              {unverifiedEmail && (
                <div style={{ marginTop: '6px', textAlign: 'right' }}>
                  <Link
                    to="/verify"
                    state={{ email: unverifiedEmail }}
                    style={{
                      color: '#fbbf24',
                      fontWeight: 600,
                      textDecoration: 'underline',
                      fontSize: '0.85em',
                    }}
                  >
                    Verify Email with OTP →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Username / Email Field */}
          <div className="field uiverse-field">
            <AtIcon className="input-icon uiverse-input-icon" />
            <input
              autoComplete="username"
              placeholder="Username or Email"
              className="input-field uiverse-input-field"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {/* Password Field */}
          <div className="field uiverse-field">
            <LockIcon className="input-icon uiverse-input-icon" />
            <input
              autoComplete="current-password"
              placeholder="Password"
              className="input-field uiverse-input-field"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="uiverse-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Button Row: Login & Sign Up */}
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
                  <span>Logging in...</span>
                </>
              ) : (
                <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Login&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</>
              )}
            </button>
            <button
              className="button2 uiverse-button2"
              type="button"
              onClick={() => navigate('/register')}
            >
              Sign Up
            </button>
          </div>

          {/* Tertiary Action: Forgot Password */}
          <button
            className="button3 uiverse-button3"
            type="button"
            onClick={handleForgotPassword}
          >
            Forgot Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
