import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import './UploadSection.css';

/**
 * UploadSection – Handles drag-and-drop image upload and analysis trigger
 *
 * Improvements:
 *  - Simulated progress bar (0-90% during request, 100% on complete)
 *  - "Analyzing image…" stage labels
 *  - Enhanced hover animations on dropzone
 *  - Re-upload (click dropzone when preview shown)
 */
function UploadSection({ onAnalysisComplete, onError, isAnalyzing, setIsAnalyzing }) {
  const [preview,    setPreview]    = useState(null);
  const [file,       setFile]       = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [stage,      setStage]      = useState('');
  const progressInterval = useRef(null);

  // ── Stage labels displayed while analyzing ──
  const STAGES = [
    'Uploading image…',
    'Running AI detection…',
    'Calculating confidence…',
    'Generating reasoning…',
    'Finalizing result…',
  ];

  // ── Simulate progress 0→90% while isAnalyzing=true ──
  useEffect(() => {
    if (isAnalyzing) {
      setProgress(0);
      setStage(STAGES[0]);
      let pct = 0;
      let stageIdx = 0;

      progressInterval.current = setInterval(() => {
        pct += Math.random() * 4 + 1.5;
        if (pct >= 90) { pct = 90; clearInterval(progressInterval.current); }

        setProgress(Math.round(pct));

        // Advance stage label every ~18% progress
        const newStageIdx = Math.min(Math.floor(pct / 18), STAGES.length - 1);
        if (newStageIdx !== stageIdx) {
          stageIdx = newStageIdx;
          setStage(STAGES[newStageIdx]);
        }
      }, 350);
    } else {
      clearInterval(progressInterval.current);
      if (progress > 0) {
        setProgress(100);
        setStage('Done!');
        setTimeout(() => { setProgress(0); setStage(''); }, 800);
      }
    }

    return () => clearInterval(progressInterval.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnalyzing]);

  /* ── Dropzone ── */
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      onError('Invalid file. Please upload a JPEG, PNG, WebP, or GIF image (max 10 MB).');
      return;
    }
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    onError(null);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(selectedFile);
  }, [onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false),
    onDropRejected: () => setIsDragging(false),
    disabled: isAnalyzing,
  });

  /* ── Analyze ── */
  const handleAnalyze = async () => {
    if (!file) { onError('Please select an image first.'); return; }

    setIsAnalyzing(true);
    onError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.post('/api/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000,
      });

      onAnalysisComplete(response.data);
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        (err.code === 'ECONNABORTED' ? 'Request timed out. The AI service may be slow.' : null) ||
        'Analysis failed. Please ensure the backend and AI service are running.';
      onError(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /* ── Reset ── */
  const handleReset = (e) => {
    e?.stopPropagation();
    setFile(null);
    setPreview(null);
    setProgress(0);
    setStage('');
    onError(null);
  };

  const isActive = isDragActive || isDragging;

  return (
    <div className="upload-section">
      <div className="upload-section__header">
        <h2 className="upload-section__title">Upload Image</h2>
        <p className="upload-section__subtitle">
          JPEG · PNG · WebP · GIF &nbsp;•&nbsp; Max 10 MB
        </p>
      </div>

      {/* ── Dropzone ── */}
      <div
        {...getRootProps()}
        id="dropzone"
        className={[
          'upload-section__dropzone',
          isActive         ? 'upload-section__dropzone--active'   : '',
          file             ? 'upload-section__dropzone--has-file'  : '',
          isAnalyzing      ? 'upload-section__dropzone--analyzing' : '',
        ].join(' ')}
        aria-label="Image upload area. Drag and drop or click to select."
      >
        <input {...getInputProps()} id="file-input" aria-label="File input" />

        {preview ? (
          /* ── Preview State ── */
          <div className="upload-section__preview">
            <img
              src={preview}
              alt="Preview of selected file"
              className="upload-section__preview-img"
            />
            <div className="upload-section__preview-overlay">
              <span className="upload-section__preview-name">{file?.name}</span>
              <span className="upload-section__preview-size">
                {(file?.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            {isAnalyzing && <div className="upload-section__scanline" aria-hidden="true" />}
            {!isAnalyzing && (
              <div className="upload-section__re-upload-hint" aria-hidden="true">
                Click to change image
              </div>
            )}
          </div>
        ) : (
          /* ── Empty State ── */
          <div className="upload-section__placeholder">
            <div className="upload-section__icon-wrapper">
              <svg className="upload-section__upload-icon" width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path d="M24 8L8 28H19V40H29V28H40L24 8Z" fill="url(#uploadGrad)" opacity="0.9"/>
                <defs>
                  <linearGradient id="uploadGrad" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#00d4ff"/>
                    <stop offset="100%" stopColor="#8b5cf6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <p className="upload-section__drop-text">
              {isDragActive ? 'Release to upload' : 'Drag & drop your image here'}
            </p>
            <p className="upload-section__or-text">— or —</p>
            <span className="upload-section__browse-btn">Browse Files</span>
          </div>
        )}
      </div>

      {/* ── Progress Bar (visible while analyzing) ── */}
      {isAnalyzing && (
        <div className="upload-section__progress-wrap" aria-live="polite">
          <div className="upload-section__progress-header">
            <span className="upload-section__progress-stage">{stage}</span>
            <span className="upload-section__progress-pct">{progress}%</span>
          </div>
          <div className="upload-section__progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="upload-section__progress-fill"
              style={{ width: `${progress}%` }}
            />
            <div className="upload-section__progress-glow" style={{ left: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div className="upload-section__actions">
        {file && !isAnalyzing && (
          <button
            id="btn-reset"
            className="upload-section__btn upload-section__btn--secondary"
            onClick={handleReset}
            aria-label="Remove selected image"
          >
            ✕ Remove
          </button>
        )}

        <button
          id="btn-analyze"
          className={`upload-section__btn upload-section__btn--primary ${!file || isAnalyzing ? 'upload-section__btn--disabled' : ''}`}
          onClick={handleAnalyze}
          disabled={!file || isAnalyzing}
          aria-busy={isAnalyzing}
          aria-label={isAnalyzing ? 'Analyzing image...' : 'Analyze image for deepfake detection'}
        >
          {isAnalyzing ? (
            <>
              <span className="upload-section__spinner" aria-hidden="true" />
              Analyzing…
            </>
          ) : (
            <>
              <span aria-hidden="true">🔬</span> Analyze Image
            </>
          )}
        </button>
      </div>

      {/* ── Tip ── */}
      {!isAnalyzing && (
        <div className="upload-section__tips">
          <p className="upload-section__tip">
            💡 <strong>Tip:</strong> Works best with facial images and portrait photos.
          </p>
        </div>
      )}
    </div>
  );
}

export default UploadSection;
