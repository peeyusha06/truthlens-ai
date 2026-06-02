import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

/**
 * LoginPage – Full-page login form
 *
 * Props:
 *  onSwitchToSignup {function} – navigate to signup view
 */
function LoginPage({ onSwitchToSignup }) {
  const { loginAction, setIsLoading } = useAuth();
  const [form,   setForm]   = useState({ email: '', password: '' });
  const [error,  setError]  = useState('');
  const [busy,   setBusy]   = useState(false);

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email || !form.password) {
      setError('Please enter your email and password.');
      return;
    }

    setBusy(true);
    setIsLoading(true);
    try {
      const res = await axios.post('/api/auth/login', form);
      loginAction(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setBusy(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Ambient orbs */}
      <div className="auth-orb auth-orb--1" aria-hidden="true" />
      <div className="auth-orb auth-orb--2" aria-hidden="true" />

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="url(#aGrad)" strokeWidth="2"/>
            <circle cx="20" cy="20" r="7" fill="url(#aGrad)" opacity="0.9"/>
            <circle cx="20" cy="20" r="3" fill="white"/>
            <defs>
              <linearGradient id="aGrad" x1="0" y1="0" x2="40" y2="40">
                <stop offset="0%" stopColor="#00d4ff"/>
                <stop offset="100%" stopColor="#8b5cf6"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 className="auth-title">
          <span className="text-gradient">TruthLens</span> AI
        </h1>
        <p className="auth-subtitle">Sign in to your account</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="auth-error" role="alert">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="login-email" className="auth-label">Email</label>
            <input
              id="login-email"
              type="email"
              name="email"
              className="auth-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              disabled={busy}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password" className="auth-label">Password</label>
            <input
              id="login-password"
              type="password"
              name="password"
              className="auth-input"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              disabled={busy}
              required
            />
          </div>

          <button
            id="btn-login"
            type="submit"
            className="auth-btn"
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? (
              <><span className="auth-spinner" /> Signing in…</>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{' '}
          <button
            id="btn-go-signup"
            className="auth-switch-link"
            onClick={onSwitchToSignup}
            type="button"
          >
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
