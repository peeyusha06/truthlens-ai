import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './HistoryPanel.css';

/**
 * HistoryPanel – Displays paginated list of past analysis results
 */
function HistoryPanel() {
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deletingId, setDeletingId] = useState(null);
  const LIMIT = 10;

  const fetchHistory = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/api/history?page=${pageNum}&limit=${LIMIT}`);
      setHistory(res.data.results || []);
      setTotalPages(res.data.totalPages || 1);
      setPage(pageNum);
    } catch (err) {
      setError('Failed to load history. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(1); }, [fetchHistory]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this result from history?')) return;
    setDeletingId(id);
    try {
      await axios.delete(`/api/history/${id}`);
      setHistory(prev => prev.filter(r => r._id !== id));
    } catch {
      alert('Failed to delete entry.');
    } finally {
      setDeletingId(null);
    }
  };

  const getRiskColor = (risk) => {
    if (risk === 'HIGH')   return '#ef4444';
    if (risk === 'MEDIUM') return '#f59e0b';
    return '#10b981';
  };

  const getPredictionIcon = (pred) => {
    const isFake = pred?.toUpperCase() === 'FAKE' || pred?.toUpperCase().includes('AI');
    return isFake ? '🤖' : '✅';
  };

  return (
    <div className="history-panel">
      <div className="history-panel__header">
        <div className="history-panel__title-group">
          <h2 className="history-panel__title">Analysis History</h2>
          <p className="history-panel__subtitle">
            All previous image analyses stored locally
          </p>
        </div>
        <button
          id="btn-refresh-history"
          className="history-panel__refresh-btn"
          onClick={() => fetchHistory(page)}
          disabled={loading}
          aria-label="Refresh history"
        >
          {loading ? '⏳' : '🔄'} Refresh
        </button>
      </div>

      {error && (
        <div className="history-panel__error" role="alert">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="history-panel__loading">
          <div className="history-panel__spinner" />
          <span>Loading history…</span>
        </div>
      ) : history.length === 0 ? (
        <div className="history-panel__empty">
          <span className="history-panel__empty-icon">📂</span>
          <p>No analyses yet. Upload an image to get started!</p>
        </div>
      ) : (
        <>
          <div className="history-panel__table-wrap">
            <table className="history-panel__table" role="table" aria-label="Analysis history">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Image</th>
                  <th scope="col">Prediction</th>
                  <th scope="col">Confidence</th>
                  <th scope="col">Risk</th>
                  <th scope="col">Date</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, idx) => (
                  <tr key={item._id} className="history-panel__row">
                    <td className="history-panel__col-num">
                      {(page - 1) * LIMIT + idx + 1}
                    </td>
                    <td className="history-panel__col-name" title={item.imageName}>
                      📷 {item.imageName?.length > 22 ? item.imageName.slice(0, 20) + '…' : item.imageName}
                    </td>
                    <td className="history-panel__col-pred">
                      <span className={`history-panel__badge history-panel__badge--${item.prediction?.toUpperCase() === 'FAKE' ? 'fake' : 'real'}`}>
                        {getPredictionIcon(item.prediction)} {item.prediction}
                      </span>
                    </td>
                    <td className="history-panel__col-conf">
                      <span className="history-panel__conf-value">
                        {Math.round(item.confidence ?? 0)}%
                      </span>
                      <div className="history-panel__conf-bar">
                        <div
                          className="history-panel__conf-fill"
                          style={{ width: `${Math.round(item.confidence ?? 0)}%` }}
                        />
                      </div>
                    </td>
                    <td className="history-panel__col-risk">
                      <span
                        className="history-panel__risk-tag"
                        style={{
                          color: getRiskColor(item.risk),
                          borderColor: `${getRiskColor(item.risk)}40`,
                          background: `${getRiskColor(item.risk)}10`,
                        }}
                      >
                        {item.risk}
                      </span>
                    </td>
                    <td className="history-panel__col-date">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="history-panel__col-action">
                      <button
                        id={`btn-delete-${item._id}`}
                        className="history-panel__delete-btn"
                        onClick={() => handleDelete(item._id)}
                        disabled={deletingId === item._id}
                        aria-label={`Delete result for ${item.imageName}`}
                      >
                        {deletingId === item._id ? '⏳' : '🗑️'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="history-panel__pagination">
              <button
                id="btn-prev-page"
                className="history-panel__page-btn"
                onClick={() => fetchHistory(page - 1)}
                disabled={page <= 1 || loading}
              >
                ← Prev
              </button>
              <span className="history-panel__page-info">
                Page {page} of {totalPages}
              </span>
              <button
                id="btn-next-page"
                className="history-panel__page-btn"
                onClick={() => fetchHistory(page + 1)}
                disabled={page >= totalPages || loading}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default HistoryPanel;
