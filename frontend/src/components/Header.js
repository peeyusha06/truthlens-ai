import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Header.css';

/**
 * Header – Top navigation bar
 *
 * Changes from original:
 *  - Removed "AI Online" badge
 *  - Added user avatar + dropdown (name, logout)
 *
 * Props:
 *  activeTab   {string}   – 'analyze' | 'history'
 *  onTabChange {function} – tab switch callback
 */
function Header({ activeTab, onTabChange }) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Derive user initials for avatar
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <header className="header" role="banner">
      <div className="container header__inner">

        {/* ── Logo & Branding ── */}
        <div className="header__brand">
          <div className="header__logo" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="18" cy="18" r="17" stroke="url(#hGrad)" strokeWidth="2"/>
              <circle cx="18" cy="18" r="8" fill="url(#hGrad)" opacity="0.85"/>
              <circle cx="18" cy="18" r="3" fill="white"/>
              <defs>
                <linearGradient id="hGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#00d4ff"/>
                  <stop offset="100%" stopColor="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="header__title-group">
            <h1 className="header__title">
              <span className="text-gradient">TruthLens</span>
              <span className="header__title-ai"> AI</span>
            </h1>
            <p className="header__tagline">Deepfake Image Detector</p>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <nav className="header__nav" role="navigation" aria-label="Main navigation">
          <button
            id="tab-analyze"
            className={`header__tab ${activeTab === 'analyze' ? 'header__tab--active' : ''}`}
            onClick={() => onTabChange('analyze')}
            aria-pressed={activeTab === 'analyze'}
          >
            <span className="header__tab-icon">🔍</span>
            Analyze
          </button>
          <button
            id="tab-history"
            className={`header__tab ${activeTab === 'history' ? 'header__tab--active' : ''}`}
            onClick={() => onTabChange('history')}
            aria-pressed={activeTab === 'history'}
          >
            <span className="header__tab-icon">📋</span>
            History
          </button>
        </nav>

        {/* ── User Menu ── */}
        <div className="header__user-wrap">
          <button
            id="btn-user-menu"
            className="header__avatar-btn"
            onClick={() => setDropdownOpen(o => !o)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            aria-label="User menu"
          >
            <span className="header__avatar">{initials}</span>
            <span className="header__user-name">{user?.name?.split(' ')[0]}</span>
            <span className={`header__chevron ${dropdownOpen ? 'header__chevron--open' : ''}`}>▾</span>
          </button>

          {dropdownOpen && (
            <div className="header__dropdown" role="menu">
              <div className="header__dropdown-info">
                <span className="header__dropdown-name">{user?.name}</span>
                <span className="header__dropdown-email">{user?.email}</span>
              </div>
              <div className="header__dropdown-divider" />
              <button
                id="btn-logout"
                className="header__dropdown-item header__dropdown-item--danger"
                onClick={() => { logout(); setDropdownOpen(false); }}
                role="menuitem"
              >
                <span>⎋</span> Sign Out
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}

export default Header;
