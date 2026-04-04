import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getActivePolicy, getMyClaims, getZoneStatus, simulateTrigger } from '../services/api';

export default function WorkerDashboard({ user }) {
  const [policy, setPolicy] = useState(null);
  const [claims, setClaims] = useState([]);
  const [zone, setZone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [policyRes, claimsRes, zoneRes] = await Promise.all([
        getActivePolicy().catch(() => ({ data: { policy: null } })),
        getMyClaims().catch(() => ({ data: { claims: [] } })),
        getZoneStatus(user.zone_id || 'KOR-4B').catch(() => ({ data: { zone: null, current_conditions: {} } })),
      ]);
      setPolicy(policyRes.data.policy);
      setClaims(claimsRes.data.claims || []);
      setZone(zoneRes.data);
    } catch (err) {
      console.error('Load error:', err);
    }
    setLoading(false);
  }

  async function handleSimulate(type) {
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await simulateTrigger({ zone_id: user.zone_id || 'KOR-4B', trigger_type: type });
      setSimResult(res.data);
      await loadData();
    } catch (err) {
      setSimResult({ error: 'Simulation failed' });
    }
    setSimLoading(false);
  }

  const triggerIcons = { rain: '🌧️', aqi: '💨', heat: '🔥', closure: '🚧', shutdown: '⚠️' };
  const totalPaid = claims.filter(c => c.status === 'approved').reduce((s, c) => s + (c.payout_inr || 0), 0);

  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container">
      {/* Hero Welcome */}
      <div className="glass-card animate-fade-up" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ marginBottom: '6px' }}>Welcome back, {user.name || 'Worker'} 👋</h1>
            <p style={{ fontSize: '0.9rem' }}>
              Zone: <strong style={{ color: 'var(--accent-info)' }}>{user.zone_id || 'KOR-4B'}</strong> • 
              Platform: <strong style={{ color: 'var(--accent-primary)' }}>{user.platform || 'Zepto'}</strong>
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className={`badge ${policy ? 'badge-success' : 'badge-warning'}`}>
              {policy ? '🛡️ Protected' : '⚠️ Unprotected'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <div className="kpi-card animate-fade-up stagger-1">
          <span className="kpi-label">Active Plan</span>
          <span className="kpi-value">{policy ? policy.tier?.toUpperCase() : 'None'}</span>
          <span className="kpi-sub">{policy ? `₹${policy.premium_inr}/week` : 'No plan active'}</span>
        </div>
        <div className="kpi-card animate-fade-up stagger-2">
          <span className="kpi-label">Coverage</span>
          <span className="kpi-value">₹{policy?.coverage_inr || 0}</span>
          <span className="kpi-sub">Max weekly coverage</span>
        </div>
        <div className="kpi-card animate-fade-up stagger-3">
          <span className="kpi-label">Claims Filed</span>
          <span className="kpi-value">{claims.length}</span>
          <span className="kpi-sub">{claims.filter(c => c.status === 'approved').length} approved</span>
        </div>
        <div className="kpi-card animate-fade-up stagger-4">
          <span className="kpi-label">Total Received</span>
          <span className="kpi-value" style={{ color: 'var(--accent-success)' }}>₹{totalPaid}</span>
          <span className="kpi-sub">Instant UPI payouts</span>
        </div>
      </div>

      {/* No Policy CTA */}
      {!policy && (
        <div className="glass-card animate-fade-up" style={{ textAlign: 'center', padding: '40px', marginBottom: '24px', background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,68,68,0.05))' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>⚡</div>
          <h2 style={{ marginBottom: '8px' }}>You're not covered yet!</h2>
          <p style={{ marginBottom: '20px' }}>Get instant UPI payouts when weather disrupts your shift. Plans start at just ₹29/week.</p>
          <Link to="/policies" className="btn btn-primary btn-lg">Browse Plans →</Link>
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: '24px' }}>
        {/* Current Conditions */}
        <div className="glass-card animate-fade-up stagger-3">
          <div className="section-header">
            <h3 className="section-title">
              <span className="status-dot live"></span>
              Live Conditions — {zone?.zone?.name || 'Zone'}
            </h3>
          </div>
          {zone?.current_conditions && (
            <div className="grid-2" style={{ gap: '12px' }}>
              <div style={{ padding: '12px', background: 'rgba(59,130,246,0.08)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>🌧️ Rainfall</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>{zone.current_conditions.rainfall_mm} mm/hr</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(245,158,11,0.08)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>💨 Air Quality</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>AQI {zone.current_conditions.aqi}</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>🌡️ Temperature</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>{zone.current_conditions.temperature_c}°C</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(139,92,246,0.08)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>🤒 Feels Like</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>{zone.current_conditions.feels_like_c}°C</div>
              </div>
            </div>
          )}
        </div>

        {/* Simulate Trigger */}
        <div className="glass-card animate-fade-up stagger-4">
          <div className="section-header">
            <h3 className="section-title">⚡ Simulate Trigger</h3>
          </div>
          <p style={{ marginBottom: '16px', fontSize: '0.85rem' }}>Test the parametric pipeline — triggers auto-process claims.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {['rain', 'aqi', 'heat', 'closure', 'shutdown'].map(type => (
              <button key={type} className="btn btn-outline btn-sm" onClick={() => handleSimulate(type)} disabled={simLoading}>
                {triggerIcons[type]} {type.toUpperCase()}
              </button>
            ))}
          </div>
          {simResult && (
            <div style={{ padding: '12px', background: simResult.error ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
              {simResult.error ? simResult.error : (
                <>
                  <strong>{simResult.trigger?.trigger_type?.toUpperCase()}</strong> trigger fired!<br />
                  ✅ {simResult.claim_results?.approved || 0} approved, ⏸️ {simResult.claim_results?.soft_hold || 0} held, 🚩 {simResult.claim_results?.flagged || 0} flagged
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Claims */}
      <div className="glass-card animate-fade-up stagger-5">
        <div className="section-header">
          <h3 className="section-title">📋 Recent Claims</h3>
          <Link to="/claims" className="btn btn-outline btn-sm">View All →</Link>
        </div>
        {claims.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <p>No claims yet. Claims are auto-filed when triggers fire in your zone.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Trust Score</th>
                  <th>Status</th>
                  <th>Payout</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {claims.slice(0, 5).map((claim, i) => (
                  <tr key={claim.id} className={`animate-slide-in stagger-${i + 1}`}>
                    <td>
                      <span style={{ marginRight: '6px' }}>{triggerIcons[claim.trigger_type] || '⚡'}</span>
                      {claim.trigger_type?.toUpperCase() || 'Unknown'}
                    </td>
                    <td>
                      <div className="trust-meter">
                        <div className="trust-bar">
                          <div className="trust-fill" style={{
                            width: `${claim.trust_score}%`,
                            background: claim.trust_score >= 70 ? 'var(--accent-success)' : claim.trust_score >= 40 ? 'var(--accent-warning)' : 'var(--accent-danger)',
                          }}></div>
                        </div>
                        <span className="trust-value">{claim.trust_score}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${claim.status === 'approved' ? 'badge-success' : claim.status === 'soft_hold' ? 'badge-warning' : claim.status === 'flagged' ? 'badge-danger' : 'badge-info'}`}>
                        {claim.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600', color: claim.status === 'approved' ? 'var(--accent-success)' : 'var(--text-muted)' }}>
                      ₹{claim.payout_inr || 0}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {claim.triggered_at ? new Date(claim.triggered_at).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
