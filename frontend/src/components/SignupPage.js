import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

/**
 * SignupPage – Full-page registration form
 *
 * Props:
 *  onSwitchToLogin {function} – navigate back to login
 */
function SignupPage({ onSwitchToLogin }) {
  const { loginAction, setIsLoading } = useAuth();
  const [form,  setForm]  = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.email || !form.password) {
      setError('All fields are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    setIsLoading(true);
    try {
      const res = await axios.post('/api/auth/signup', {
        name    : form.name,
        email   : form.email,
        password: form.password,
      });
      loginAction(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setBusy(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-orb auth-orb--1" aria-hidden="true" />
      <div className="auth-orb auth-orb--2" aria-hidden="true" />

      <div className="auth-card">
        <div className="auth-logo">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="url(#bGrad)" strokeWidth="2"/>
            <circle cx="20" cy="20" r="7" fill="url(#bGrad)" opacity="0.9"/>
            <circle cx="20" cy="20" r="3" fill="white"/>
            <defs>
              <linearGradient id="bGrad" x1="0" y1="0" x2="40" y2="40">
                <stop offset="0%" stopColor="#00d4ff"/>
                <stop offset="100%" stopColor="#8b5cf6"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 className="auth-title">
          <span className="text-gradient">TruthLens</span> AI
        </h1>
        <p className="auth-subtitle">Create your account</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="auth-error" role="alert">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="signup-name" className="auth-label">Full Name</label>
            <input
              id="signup-name"
              type="text"
              name="name"
              className="auth-input"
              placeholder="Your name"
              value={form.name}
              onChange={handleChange}
              autoComplete="name"
              disabled={busy}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-email" className="auth-label">Email</label>
            <input
              id="signup-email"
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
            <label htmlFor="signup-password" className="auth-label">Password</label>
            <input
              id="signup-password"
              type="password"
              name="password"
              className="auth-input"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              disabled={busy}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-confirm" className="auth-label">Confirm Password</label>
            <input
              id="signup-confirm"
              type="password"
              name="confirm"
              className="auth-input"
              placeholder="Repeat password"
              value={form.confirm}
              onChange={handleChange}
              autoComplete="new-password"
              disabled={busy}
              required
            />
          </div>

          <button
            id="btn-signup"
            type="submit"
            className="auth-btn"
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? (
              <><span className="auth-spinner" /> Creating account…</>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <button
            id="btn-go-login"
            className="auth-switch-link"
            onClick={onSwitchToLogin}
            type="button"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;
