/**
 * AuthContext.js – Global authentication state
 *
 * Provides: user, token, login(), logout(), isLoading
 * Token is persisted to localStorage under 'truthlens_token'.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const TOKEN_KEY = 'truthlens_token';
const USER_KEY  = 'truthlens_user';

export function AuthProvider({ children }) {
  const [token,     setToken]     = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user,      setUser]      = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); }
    catch { return null; }
  });
  const [isLoading, setIsLoading] = useState(false);

  // ── Set axios default auth header whenever token changes ──
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  /**
   * loginAction – stores token + user after a successful auth API call
   */
  const loginAction = useCallback((tokenValue, userData) => {
    setToken(tokenValue);
    setUser(userData);
    localStorage.setItem(TOKEN_KEY, tokenValue);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${tokenValue}`;
  }, []);

  /**
   * logout – clears all auth state
   */
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  const value = {
    user,
    token,
    isLoading,
    setIsLoading,
    loginAction,
    logout,
    isLoggedIn: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth – convenience hook
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export default AuthContext;
