import React from 'react';

/**
 * FraudQueue — Fraud review queue component for Admin Dashboard
 * Shows flagged/soft-held claims with trust signal breakdown
 */
export default function FraudQueue({ queue = [], onReview, loading = false }) {
  const triggerIcons = { rain: '🌧️', aqi: '💨', heat: '🔥', closure: '🚧', shutdown: '⚠️' };

  if (queue.length === 0) {
    return (
      <div className="glass-card">
        <div className="section-header">
          <h3 className="section-title">🚩 Fraud Review Queue</h3>
          <span className="badge badge-success">0 pending</span>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <p>No claims pending review. All clear!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div className="section-header">
        <h3 className="section-title">🚩 Fraud Review Queue</h3>
        <span className="badge badge-danger">{queue.length} pending</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {queue.map((item, i) => (
          <div
            key={item.id}
            className={`trigger-card animate-slide-in stagger-${Math.min(i + 1, 6)}`}
            style={{ flexDirection: 'column', alignItems: 'stretch' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  {item.name || 'Worker'} • {item.zone_id}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {triggerIcons[item.trigger_type]} {item.trigger_type?.toUpperCase()} • Trust: {item.trust_score}/100
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className={`badge ${item.status === 'flagged' ? 'badge-danger' : 'badge-warning'}`}>
                  {item.status}
                </span>
                <span style={{ fontWeight: '700' }}>₹{item.payout_inr}</span>
              </div>
            </div>

            {/* Trust Signal Breakdown */}
            {item.trust_signals && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0' }}>
                {Object.entries(item.trust_signals).map(([key, val]) => (
                  <span
                    key={key}
                    className={`badge ${val >= 0.7 ? 'badge-success' : val >= 0.4 ? 'badge-warning' : 'badge-danger'}`}
                    style={{ fontSize: '0.7rem' }}
                  >
                    {key.replace(/_/g, ' ')}: {(val * 100).toFixed(0)}%
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-success btn-sm"
                onClick={() => onReview && onReview(item.id, 'approve')}
                disabled={loading}
              >
                ✅ Approve
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => onReview && onReview(item.id, 'reject')}
                disabled={loading}
              >
                ❌ Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
