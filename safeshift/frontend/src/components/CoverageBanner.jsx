import React from 'react';
import { useGlassmorphism } from '../hooks/useGlassmorphism';

/**
 * CoverageBanner — Shows current coverage status prominently
 * Used on Worker Dashboard and Policy Shop pages
 */
export default function CoverageBanner({ policy, riskLevel, zone }) {
  const { getGlassClass } = useGlassmorphism();

  if (policy) {
    return (
      <div className={`${getGlassClass('glass-card')} animate-fade-up`} style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.08))',
        border: '1px solid rgba(16,185,129,0.2)',
        textAlign: 'center',
        padding: '28px',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🛡️</div>
        <h2 style={{ marginBottom: '6px', color: 'var(--accent-success)' }}>You're Protected!</h2>
        <p style={{ marginBottom: '16px', fontSize: '0.9rem' }}>
          <strong>{policy.tier?.toUpperCase()}</strong> plan active •
          Coverage: <strong>₹{policy.coverage_inr}</strong>/week •
          Premium: ₹{policy.premium_inr}/week
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span className="badge badge-success">✓ Active</span>
          <span className="badge badge-info">{zone || policy.zone_id || 'Zone'}</span>
          <span className={`badge ${riskLevel === 'high' ? 'badge-danger' : riskLevel === 'medium' ? 'badge-warning' : 'badge-success'}`}>
            Risk: {riskLevel || 'medium'}
          </span>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '12px' }}>
          Valid: {policy.week_start} to {policy.week_end}
        </p>
      </div>
    );
  }

  return (
    <div className={`${getGlassClass('glass-card')} animate-fade-up`} style={{
      background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,68,68,0.05))',
      border: '1px solid rgba(245,158,11,0.2)',
      textAlign: 'center',
      padding: '36px',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '12px' }}>⚡</div>
      <h2 style={{ marginBottom: '8px' }}>You're Not Protected Yet!</h2>
      <p style={{ marginBottom: '20px', fontSize: '0.9rem' }}>
        Get instant UPI payouts when weather disrupts your shift. Plans start at just ₹29/week.
      </p>
      <span className="badge badge-warning">⚠️ Unprotected</span>
    </div>
  );
}
