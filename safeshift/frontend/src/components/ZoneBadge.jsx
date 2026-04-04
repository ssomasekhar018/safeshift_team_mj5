import React from 'react';

/**
 * ZoneBadge — Displays zone risk information as a visual badge
 * Used across dashboards to show zone status
 */
export default function ZoneBadge({ zoneId, zoneName, riskScore, riskLevel, showScore = true }) {
  const riskColors = {
    high: { bg: 'rgba(239,68,68,0.15)', color: 'var(--accent-danger)', dot: '#ef4444' },
    medium: { bg: 'rgba(245,158,11,0.15)', color: 'var(--accent-warning)', dot: '#f59e0b' },
    low: { bg: 'rgba(16,185,129,0.15)', color: 'var(--accent-success)', dot: '#10b981' },
  };

  const level = riskLevel || (riskScore > 65 ? 'high' : riskScore > 35 ? 'medium' : 'low');
  const colors = riskColors[level] || riskColors.medium;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 14px',
      background: colors.bg,
      borderRadius: '20px',
      fontSize: '0.82rem',
      fontWeight: '600',
    }}>
      <span style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: colors.dot,
        boxShadow: `0 0 6px ${colors.dot}40`,
        display: 'inline-block',
      }} />
      <span style={{ color: 'var(--text-primary)' }}>
        {zoneId}{zoneName ? ` — ${zoneName}` : ''}
      </span>
      {showScore && riskScore !== undefined && (
        <span style={{ color: colors.color }}>
          {riskScore}/100
        </span>
      )}
    </div>
  );
}
