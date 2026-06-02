import React from 'react';
import './Footer.css';

/**
 * Footer – Minimal footer
 * Shows only "TruthLens AI" — no tech stack labels
 */
function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="container footer__inner">
        <span className="footer__brand">
          <span className="text-gradient">TruthLens</span> AI
        </span>
      </div>
    </footer>
  );
}

export default Footer;
