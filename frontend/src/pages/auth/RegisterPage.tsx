// src/pages/auth/RegisterPage.tsx
// Merchant registration view styled with Uiverse.io inset dark aesthetic
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { register } from '../../api/authApi';
import { AtIcon, LockIcon, MailIcon } from '../../components/auth/UiverseIcons';
import { RasaiBrandHeader } from '../../components/auth/RasaiBrandHeader';
import { InteractiveGridBackground } from '../../components/auth/InteractiveGridBackground';
import './auth-uiverse.css';

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
    <div className="uiverse-auth-wrapper">
      {/* Interactive cursor tracking grid animation */}
      <InteractiveGridBackground />

      {/* Top of Screen Branding: English 'rasai' left, borderless logo center, Urdu 'رسائی' right */}
      <RasaiBrandHeader />

      <div className="uiverse-container">
        {/* Uiverse Form Card */}
        <form className="form uiverse-form" onSubmit={handleSubmit}>
          <p id="heading" className="uiverse-heading">Sign Up</p>

          {/* Quick Demo Autofill Hint */}
          <div className="uiverse-info-pill">
            <span>Want to test quickly?</span>
            <button
              type="button"
              onClick={handleFillSample}
              className="uiverse-demo-link"
              style={{ color: '#c084fc' }}
            >
              Fill Sample Merchant
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="uiverse-error-box">
              {errorMessage}
            </div>
          )}

          {/* Username Field */}
          <div className="field uiverse-field">
            <AtIcon className="input-icon uiverse-input-icon" />
            <input
              autoComplete="off"
              placeholder="Username"
              className="input-field uiverse-input-field"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

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

          {/* Password Field */}
          <div className="field uiverse-field">
            <LockIcon className="input-icon uiverse-input-icon" />
            <input
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

          {/* Confirm Password Field */}
          <div className="field uiverse-field">
            <LockIcon className="input-icon uiverse-input-icon" />
            <input
              placeholder="Confirm password"
              className="input-field uiverse-input-field"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {/* Button Row: Sign Up & Login */}
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
                  <span>Creating...</span>
                </>
              ) : (
                <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Sign Up&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</>
              )}
            </button>
            <button
              className="button2 uiverse-button2"
              type="button"
              onClick={() => navigate('/login')}
            >
              Login
            </button>
          </div>

          {/* Tertiary Action: Verify Existing OTP */}
          <button
            className="button3 uiverse-button3"
            type="button"
            onClick={() => navigate('/verify')}
          >
            Already have an OTP? Verify
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
