import React from 'react';

/**
 * PayoutRow — Displays a single payout entry
 * Used in claim history and payout notification views
 */
export default function PayoutRow({ claim, index = 0 }) {
  const triggerIcons = { rain: '🌧️', aqi: '💨', heat: '🔥', closure: '🚧', shutdown: '⚠️' };
  const isApproved = claim.status === 'approved';

  return (
    <div
      className={`trigger-card animate-slide-in stagger-${Math.min(index + 1, 6)}`}
      style={{
        borderLeft: `3px solid ${isApproved ? 'var(--accent-success)' : claim.status === 'flagged' ? 'var(--accent-danger)' : 'var(--accent-warning)'}`,
      }}
    >
      <div className="trigger-icon" style={{
        background: isApproved ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
      }}>
        {triggerIcons[claim.trigger_type] || '⚡'}
      </div>
      <div className="trigger-details" style={{ flex: 1 }}>
        <div className="trigger-type">
          {claim.trigger_type?.toUpperCase() || 'Unknown'} Trigger
        </div>
        <div className="trigger-meta">
          Trust Score: {claim.trust_score}/100 •
          {claim.triggered_at ? ` ${new Date(claim.triggered_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
        </div>
      </div>
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
        <span style={{
          fontSize: '1.1rem',
          fontWeight: '800',
          color: isApproved ? 'var(--accent-success)' : 'var(--text-muted)',
        }}>
          {isApproved ? `₹${claim.payout_inr}` : '—'}
        </span>
        <span className={`badge ${isApproved ? 'badge-success' : claim.status === 'flagged' ? 'badge-danger' : 'badge-warning'}`}>
          {claim.status?.replace('_', ' ')}
        </span>
      </div>
    </div>
  );
}
