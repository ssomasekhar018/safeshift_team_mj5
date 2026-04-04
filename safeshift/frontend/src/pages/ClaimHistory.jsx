import React, { useState, useEffect } from 'react';
import { getMyClaims } from '../services/api';

export default function ClaimHistory({ user }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const res = await getMyClaims();
        setClaims(res.data.claims || []);
      } catch (err) {
        console.error('Claims load error:', err);
      }
      setLoading(false);
    }
    load();
  }, []);

  const triggerIcons = { rain: '🌧️', aqi: '💨', heat: '🔥', closure: '🚧', shutdown: '⚠️' };
  const filtered = filter === 'all' ? claims : claims.filter(c => c.status === filter);
  const totalPaid = claims.filter(c => c.status === 'approved').reduce((s, c) => s + (c.payout_inr || 0), 0);

  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container">
      <div className="animate-fade-up" style={{ marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '8px' }}>Claim History</h1>
        <p>All parametric claims automatically filed by the SafeShift engine.</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <div className="kpi-card animate-fade-up stagger-1">
          <span className="kpi-label">Total Claims</span>
          <span className="kpi-value">{claims.length}</span>
        </div>
        <div className="kpi-card animate-fade-up stagger-2">
          <span className="kpi-label">Approved</span>
          <span className="kpi-value" style={{ color: 'var(--accent-success)' }}>{claims.filter(c => c.status === 'approved').length}</span>
        </div>
        <div className="kpi-card animate-fade-up stagger-3">
          <span className="kpi-label">Held / Flagged</span>
          <span className="kpi-value" style={{ color: 'var(--accent-warning)' }}>{claims.filter(c => c.status === 'soft_hold' || c.status === 'flagged').length}</span>
        </div>
        <div className="kpi-card animate-fade-up stagger-4">
          <span className="kpi-label">Total Received</span>
          <span className="kpi-value" style={{ color: 'var(--accent-success)' }}>₹{totalPaid}</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }} className="animate-fade-up">
        {['all', 'approved', 'soft_hold', 'flagged', 'rejected'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Claims List */}
      {filtered.length === 0 ? (
        <div className="glass-card empty-state animate-fade-up">
          <div className="empty-state-icon">📭</div>
          <p>No claims found{filter !== 'all' ? ` with status "${filter}"` : ''}.</p>
        </div>
      ) : (
        <div className="glass-card animate-fade-up" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Event Type</th>
                <th>Trust Score</th>
                <th>Trust Signals</th>
                <th>Status</th>
                <th>Payout</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((claim, i) => (
                <tr key={claim.id} className={`animate-slide-in stagger-${Math.min(i + 1, 6)}`}>
                  <td>
                    <span style={{ marginRight: '6px', fontSize: '1.1rem' }}>{triggerIcons[claim.trigger_type] || '⚡'}</span>
                    <strong>{claim.trigger_type?.toUpperCase() || 'Unknown'}</strong>
                  </td>
                  <td>
                    <div className="trust-meter">
                      <div className="trust-bar" style={{ width: '60px' }}>
                        <div className="trust-fill" style={{
                          width: `${claim.trust_score}%`,
                          background: claim.trust_score >= 70 ? 'var(--accent-success)' : claim.trust_score >= 40 ? 'var(--accent-warning)' : 'var(--accent-danger)',
                        }}></div>
                      </div>
                      <span className="trust-value" style={{
                        color: claim.trust_score >= 70 ? 'var(--accent-success)' : claim.trust_score >= 40 ? 'var(--accent-warning)' : 'var(--accent-danger)',
                      }}>{claim.trust_score}</span>
                    </div>
                  </td>
                  <td>
                    {claim.trust_signals && typeof claim.trust_signals === 'object' ? (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {Object.entries(claim.trust_signals).slice(0, 3).map(([key, val]) => (
                          <span key={key} className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                            {key.replace(/_/g, ' ')}: {typeof val === 'number' ? (val * 100).toFixed(0) + '%' : val}
                          </span>
                        ))}
                      </div>
                    ) : '-'}
                  </td>
                  <td>
                    <span className={`badge ${claim.status === 'approved' ? 'badge-success' : claim.status === 'soft_hold' ? 'badge-warning' : claim.status === 'flagged' ? 'badge-danger' : 'badge-info'}`}>
                      {claim.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ fontWeight: '700', color: claim.status === 'approved' ? 'var(--accent-success)' : 'var(--text-muted)' }}>
                    {claim.status === 'approved' ? `₹${claim.payout_inr}` : '—'}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {claim.triggered_at ? new Date(claim.triggered_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Trust Score Legend */}
      <div className="glass-card animate-fade-up" style={{ marginTop: '24px' }}>
        <h3 className="section-title" style={{ marginBottom: '16px' }}>🤖 Trust Score — 6-Signal Engine</h3>
        <div className="grid-3">
          {[
            { signal: 'GPS Jitter', desc: 'Is the GPS stable within the zone boundary?', icon: '📍' },
            { signal: 'Network Match', desc: 'Consistent cell tower / WiFi connection?', icon: '📶' },
            { signal: 'Signal Strength', desc: 'Realistic outdoor signal levels?', icon: '📡' },
            { signal: 'Accelerometer', desc: 'Is the device in motion (delivery)?', icon: '🏃' },
            { signal: 'Zone History', desc: 'Previous check-ins in this zone?', icon: '🗺️' },
            { signal: 'Platform Active', desc: 'Currently online on delivery app?', icon: '📱' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 0' }}>
              <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{s.signal}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
