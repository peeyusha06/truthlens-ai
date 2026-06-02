import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Header from './components/Header';
import UploadSection from './components/UploadSection';
import ResultCard from './components/ResultCard';
import HistoryPanel from './components/HistoryPanel';
import Footer from './components/Footer';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import './App.css';

/**
 * App – Root component for TruthLens AI
 *
 * Auth routing:
 *  isLoggedIn=false → show LoginPage or SignupPage
 *  isLoggedIn=true  → show main analyze/history UI
 *
 * Preserves existing analyze/history logic exactly as-is.
 */
function App() {
  const { isLoggedIn, user } = useAuth();

  // ── Auth view toggle ──
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup'

  // ── Main app state (ensuring it's initialized as null, not from localStorage) ──
  const [result,      setResult]      = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab,   setActiveTab]   = useState('analyze');
  const [error,       setError]       = useState(null);

  // ── Clear analysis result when user logs out/changes ──
  useEffect(() => {
    setResult(null);
    setError(null);
    setIsAnalyzing(false);
    // Remove any persisted result from localStorage just in case
    localStorage.removeItem('truthlens_result');
  }, [user]);

  const handleAnalysisComplete = (data) => { setResult(data); setError(null); };
  const handleError = (message) => { setError(message); setResult(null); };

  // ── Show auth pages if not logged in ──────────────────────
  if (!isLoggedIn) {
    return authView === 'login' ? (
      <LoginPage  onSwitchToSignup={() => setAuthView('signup')} />
    ) : (
      <SignupPage onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  // ── Main application (requires login) ─────────────────────
  return (
    <div className="app">
      {/* Ambient Background Orbs */}
      <div className="ambient-orb ambient-orb--1" aria-hidden="true" />
      <div className="ambient-orb ambient-orb--2" aria-hidden="true" />
      <div className="ambient-orb ambient-orb--3" aria-hidden="true" />

      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="app__main">
        <div className="container">
          {activeTab === 'analyze' ? (
            <div className="app__analyze-layout">
              {/* Left: Upload */}
              <section className="app__upload-section">
                <UploadSection
                  onAnalysisComplete={handleAnalysisComplete}
                  onError={handleError}
                  isAnalyzing={isAnalyzing}
                  setIsAnalyzing={setIsAnalyzing}
                />
              </section>

              {/* Right: Result */}
              <section className="app__result-section">
                {error && (
                  <div className="app__error-banner" role="alert">
                    <span className="app__error-icon">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}
                {(result || isAnalyzing) && (
                  <ResultCard result={result} isLoading={isAnalyzing} />
                )}
                {!result && !isAnalyzing && !error && (
                  <div className="app__empty-state">
                    <div className="app__empty-icon">🔍</div>
                    <h3 className="app__empty-title">Ready to Analyze</h3>
                    <p className="app__empty-desc">
                      Upload an image on the left to detect deepfakes and AI-generated content.
                    </p>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <HistoryPanel />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
