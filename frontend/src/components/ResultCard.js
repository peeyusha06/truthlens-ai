import React from 'react';
import './ResultCard.css';

/** getRiskConfig – maps risk level to visual config */
function getRiskConfig(risk) {
  switch (risk?.toUpperCase()) {
    case 'HIGH':
      return {
        color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)',
        icon: '🔴', label: 'HIGH RISK', gradient: 'linear-gradient(135deg, #ef4444, #ec4899)',
      };
    case 'MEDIUM':
      return {
        color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)',
        icon: '🟡', label: 'MEDIUM RISK', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
      };
    default:
      return {
        color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)',
        icon: '🟢', label: 'LOW RISK', gradient: 'linear-gradient(135deg, #10b981, #3b82f6)',
      };
  }
}

/** getPredictionConfig – maps prediction string to visual config */
function getPredictionConfig(prediction) {
  const isFake = prediction?.toUpperCase() === 'FAKE' ||
                 prediction?.toUpperCase().includes('AI') ||
                 prediction?.toUpperCase().includes('GENERATED');
  return {
    isFake,
    label   : isFake ? 'AI-GENERATED / FAKE' : 'AUTHENTIC / REAL',
    icon    : isFake ? '🤖' : '✅',
    color   : isFake ? '#ef4444' : '#10b981',
    gradient: isFake
      ? 'linear-gradient(135deg,#ef4444,#ec4899)'
      : 'linear-gradient(135deg,#10b981,#3b82f6)',
  };
}

/** SkeletonBlock – animated loading placeholder */
function SkeletonBlock({ width = '100%', height = '20px', radius = '8px' }) {
  return (
    <div
      className="result-card__skeleton"
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

/**
 * ResultCard – Displays the AI analysis result
 *
 * NEW: "Download Report" button opens the PDF in a new tab via /api/pdf/:id
 *
 * Props:
 *  result    {object|null} – API response from backend
 *  isLoading {boolean}     – show skeleton while analyzing
 */
function ResultCard({ result, isLoading }) {

  /** Opens PDF report in a new browser tab */
  const handleDownloadPDF = () => {
    if (!result?._id) return;
    const pdfUrl = `http://localhost:5000/api/pdf/${result._id}`;
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };

  // ── Loading Skeleton ────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="result-card result-card--loading" aria-live="polite" aria-busy="true">
        <div className="result-card__header">
          <SkeletonBlock width="60%" height="28px" radius="8px" />
          <SkeletonBlock width="80px" height="28px" radius="99px" />
        </div>
        <div className="result-card__divider" />
        <SkeletonBlock width="100%" height="80px" radius="12px" />
        <div className="result-card__metrics-grid">
          <SkeletonBlock width="100%" height="110px" radius="12px" />
          <SkeletonBlock width="100%" height="110px" radius="12px" />
        </div>
        <SkeletonBlock width="100%" height="120px" radius="12px" />
        <div className="result-card__loading-msg">
          <span className="result-card__loading-spinner" />
          Analyzing with AI…
        </div>
      </div>
    );
  }

  if (!result) return null;

  const risk       = getRiskConfig(result.risk);
  const prediction = getPredictionConfig(result.prediction);
  const confidence = Math.round(result.confidence ?? 0);

  return (
    <div className="result-card" role="region" aria-label="Analysis Result" style={{ animation: 'fadeInUp 0.4s ease' }}>

      {/* ── Header ── */}
      <div className="result-card__header">
        <div className="result-card__title-group">
          <span className="result-card__label">Analysis Result</span>
          <h2 className="result-card__title">
            {result.imageName
              ? result.imageName.length > 28
                ? result.imageName.slice(0, 25) + '…'
                : result.imageName
              : 'Uploaded Image'}
          </h2>
        </div>
        <span
          className="result-card__timestamp"
          title={result.createdAt ? new Date(result.createdAt).toLocaleString() : 'Just now'}
        >
          {result.createdAt
            ? new Date(result.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Just now'}
        </span>
      </div>

      <div className="result-card__divider" />

      {/* ── Prediction Banner ── */}
      <div
        className="result-card__prediction-banner"
        style={{
          background : prediction.gradient,
          boxShadow  : `0 8px 32px ${prediction.isFake ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
        }}
      >
        <span className="result-card__prediction-icon">{prediction.icon}</span>
        <div className="result-card__prediction-text">
          <span className="result-card__prediction-tag">PREDICTION</span>
          <span className="result-card__prediction-label">{prediction.label}</span>
        </div>
      </div>

      {/* ── Metrics Grid ── */}
      <div className="result-card__metrics-grid">

        {/* Confidence Ring */}
        <div className="result-card__metric-box">
          <span className="result-card__metric-label">Confidence Score</span>
          <div className="result-card__confidence-ring-wrap">
            <svg className="result-card__confidence-svg" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"/>
              <circle
                cx="40" cy="40" r="34"
                fill="none"
                stroke={prediction.isFake ? '#ef4444' : '#10b981'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - confidence / 100)}`}
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <div className="result-card__confidence-value">
              <span className="result-card__confidence-number">{confidence}</span>
              <span className="result-card__confidence-pct">%</span>
            </div>
          </div>
        </div>

        {/* Risk Level */}
        <div
          className="result-card__metric-box"
          style={{ background: risk.bg, borderColor: risk.border }}
        >
          <span className="result-card__metric-label">Risk Level</span>
          <div className="result-card__risk-content">
            <span className="result-card__risk-icon">{risk.icon}</span>
            <span
              className="result-card__risk-label"
              style={{ color: risk.color, textShadow: `0 0 20px ${risk.color}40` }}
            >
              {risk.label}
            </span>
            <div className="result-card__risk-bar-bg">
              <div
                className="result-card__risk-bar-fill"
                style={{
                  background: risk.gradient,
                  width: result.risk === 'HIGH' ? '90%' : result.risk === 'MEDIUM' ? '55%' : '25%',
                  boxShadow: `0 0 10px ${risk.color}60`,
                }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* ── Reasoning ── */}
      <div className="result-card__reasoning">
        <div className="result-card__reasoning-header">
          <span className="result-card__reasoning-icon">🧠</span>
          <span className="result-card__reasoning-title">AI Reasoning</span>
        </div>
        <p className="result-card__reasoning-text">
          {result.reasoning || 'No reasoning provided.'}
        </p>
      </div>

      {/* ── Footer: Source + PDF Button ── */}
      <div className="result-card__footer">
        <div className="result-card__footer-meta">
          <span className="result-card__source">
            Analyzed by: <strong>{result.modelUsed || 'TruthLens AI Engine'}</strong>
          </span>
          <span className="result-card__id">ID: {result._id?.slice(-8) || 'N/A'}</span>
        </div>

        {/* Download Report → opens PDF in new tab */}
        {result._id && (
          <button
            id="btn-download-pdf"
            className="result-card__pdf-btn"
            onClick={handleDownloadPDF}
            aria-label="Open analysis PDF report in new tab"
            title="Open full PDF report in a new tab"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="12" x2="12" y2="18"/>
              <polyline points="9 15 12 18 15 15"/>
            </svg>
            Download Report
          </button>
        )}
      </div>

    </div>
  );
}

export default ResultCard;
