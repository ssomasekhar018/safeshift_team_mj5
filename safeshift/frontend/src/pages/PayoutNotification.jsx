import React, { useState, useEffect } from 'react';
import { getMyClaims } from '../services/api';
import PayoutRow from '../components/PayoutRow';

/**
 * PayoutNotification — Real-time payout notification view
 * Shows recent payouts with animated notifications
 */
export default function PayoutNotification({ user }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPayout, setNewPayout] = useState(null);

  useEffect(() => {
    loadClaims();
    // Poll for new payouts every 15 seconds
    const interval = setInterval(loadClaims, 15000);
    return () => clearInterval(interval);
  }, []);

  async function loadClaims() {
    try {
      const res = await getMyClaims();
      const allClaims = res.data.claims || [];
      const approvedClaims = allClaims.filter(c => c.status === 'approved');

      // Check for new payouts
      if (claims.length > 0 && approvedClaims.length > claims.filter(c => c.status === 'approved').length) {
        const latest = approvedClaims[0];
        setNewPayout(latest);
        setTimeout(() => setNewPayout(null), 5000);
      }

      setClaims(allClaims);
    } catch (err) {
      console.error('Load claims error:', err);
    }
    setLoading(false);
  }

  const approvedClaims = claims.filter(c => c.status === 'approved');
  const totalPaid = approvedClaims.reduce((s, c) => s + (c.payout_inr || 0), 0);

  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container">
      {/* New Payout Toast */}
      {newPayout && (
        <div className="glass-card animate-fade-up" style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.1))',
          border: '1px solid rgba(16,185,129,0.4)',
          textAlign: 'center',
          marginBottom: '20px',
          animation: 'fadeUp 0.5s ease-out',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>💸</div>
          <h2 style={{ color: 'var(--accent-success)', marginBottom: '6px' }}>Payout Received!</h2>
          <p style={{ fontSize: '1.5rem', fontWeight: '800' }}>₹{newPayout.payout_inr}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {newPayout.trigger_type?.toUpperCase()} trigger • Sent via UPI
          </p>
        </div>
      )}

      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '8px' }}>💰 Payouts</h1>
        <p>Instant UPI disbursements from SafeShift</p>
      </div>

      {/* Summary */}
      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <div className="kpi-card animate-fade-up stagger-1">
          <span className="kpi-label">Total Received</span>
          <span className="kpi-value" style={{ color: 'var(--accent-success)' }}>₹{totalPaid}</span>
          <span className="kpi-sub">Lifetime payouts</span>
        </div>
        <div className="kpi-card animate-fade-up stagger-2">
          <span className="kpi-label">Payouts</span>
          <span className="kpi-value">{approvedClaims.length}</span>
          <span className="kpi-sub">Approved claims</span>
        </div>
        <div className="kpi-card animate-fade-up stagger-3">
          <span className="kpi-label">Avg Payout</span>
          <span className="kpi-value">₹{approvedClaims.length > 0 ? Math.round(totalPaid / approvedClaims.length) : 0}</span>
          <span className="kpi-sub">Per event</span>
        </div>
      </div>

      {/* Payout List */}
      <div className="glass-card animate-fade-up" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px' }}>
          <h3 className="section-title">Recent Payouts</h3>
        </div>
        {approvedClaims.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <p>No payouts yet. Get a plan and wait for a trigger event!</p>
          </div>
        ) : (
          <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {approvedClaims.map((claim, i) => (
              <PayoutRow key={claim.id} claim={claim} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
