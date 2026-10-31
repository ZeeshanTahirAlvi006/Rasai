// src/components/auth/UiverseAuthForms.tsx
// Reusable React components for Uiverse.io Praashoo7 Login & Register forms
import React, { useState } from 'react';
import { AtIcon, LockIcon, MailIcon } from './UiverseIcons';
import '../../pages/auth/auth-uiverse.css';

export interface LoginFormProps {
  onSubmit?: (credentials: { username: string; password: string }) => void;
  onSignUpClick?: () => void;
  onForgotPasswordClick?: () => void;
  loading?: boolean;
  errorMessage?: string | null;
  className?: string;
}

export const UiverseLoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onSignUpClick,
  onForgotPasswordClick,
  loading = false,
  errorMessage = null,
  className = '',
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({ username: username.trim(), password });
    }
  };

  return (
    <form className={`form uiverse-form ${className}`} onSubmit={handleSubmit}>
      <p id="heading" className="uiverse-heading">Login</p>

      {errorMessage && (
        <div className="uiverse-error-box">{errorMessage}</div>
      )}

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

      <div className="field uiverse-field">
        <LockIcon className="input-icon uiverse-input-icon" />
        <input
          placeholder="Password"
          className="input-field uiverse-input-field"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <div className="btn uiverse-btn-row">
        <button className="button1 uiverse-button1" type="submit" disabled={loading}>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Login&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        </button>
        <button
          className="button2 uiverse-button2"
          type="button"
          onClick={onSignUpClick}
        >
          Sign Up
        </button>
      </div>

      <button
        className="button3 uiverse-button3"
        type="button"
        onClick={onForgotPasswordClick}
      >
        Forgot Password
      </button>
    </form>
  );
};

export interface RegisterFormProps {
  onSubmit?: (data: { username: string; email: string; password: string }) => void;
  onLoginClick?: () => void;
  onHelpClick?: () => void;
  loading?: boolean;
  errorMessage?: string | null;
  className?: string;
}

export const UiverseRegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  onLoginClick,
  onHelpClick,
  loading = false,
  errorMessage = null,
  className = '',
}) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (onSubmit) {
      onSubmit({ username: username.trim(), email: email.trim(), password });
    }
  };

  const displayError = errorMessage || validationError;

  return (
    <form className={`form uiverse-form ${className}`} onSubmit={handleSubmit}>
      <p id="heading" className="uiverse-heading">Sign Up</p>

      {displayError && (
        <div className="uiverse-error-box">{displayError}</div>
      )}

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

      <div className="field uiverse-field">
        <MailIcon className="input-icon uiverse-input-icon" />
        <input
          autoComplete="off"
          placeholder="Email"
          className="input-field uiverse-input-field"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="field uiverse-field">
        <LockIcon className="input-icon uiverse-input-icon" />
        <input
          placeholder="Password"
          className="input-field uiverse-input-field"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <div className="field uiverse-field">
        <LockIcon className="input-icon uiverse-input-icon" />
        <input
          placeholder="Confirm Password"
          className="input-field uiverse-input-field"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>

      <div className="btn uiverse-btn-row">
        <button className="button1 uiverse-button1" type="submit" disabled={loading}>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Sign Up&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        </button>
        <button
          className="button2 uiverse-button2"
          type="button"
          onClick={onLoginClick}
        >
          Login
        </button>
      </div>

      <button
        className="button3 uiverse-button3"
        type="button"
        onClick={onHelpClick}
      >
        Already have an account?
      </button>
    </form>
  );
};
