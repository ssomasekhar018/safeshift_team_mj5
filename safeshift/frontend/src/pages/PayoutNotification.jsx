import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getMyClaims } from '../services/api';
import { useGlassmorphism } from '../hooks/useGlassmorphism';
import { AnimatedPage, AnimatedCard, AnimatedText, AnimatedButton } from '../components/AnimatedWrapper';
import { motion } from 'framer-motion';

/**
 * CountUpValue — Animates a number counting up from 0
 */
function CountUpValue({ value, prefix = '', duration = 800 }) {
  const [display, setDisplay] = useState(0);
  const numValue = typeof value === 'number' ? value : parseInt(value) || 0;
  const startTime = useRef(null);

  useEffect(() => {
    if (numValue === 0) { setDisplay(0); return; }
    startTime.current = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOut cubic
      setDisplay(Math.floor(eased * numValue));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [numValue, duration]);

  return <>{prefix}{display}</>;
}

export default function PayoutNotification({ user }) {
  const { getGlassClass } = useGlassmorphism();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPayout, setNewPayout] = useState(null);

  useEffect(() => {
    loadClaims();
    const interval = setInterval(loadClaims, 15000);
    return () => clearInterval(interval);
  }, []);

  async function loadClaims() {
    try {
      const res = await getMyClaims();
      const allClaims = res.data.claims || [];
      const approvedClaims = allClaims.filter(c => c.status === 'approved');

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

  const triggerIcons = { rain: '🌧️', aqi: '💨', heat: '🔥', closure: '🚧', shutdown: '⚠️' };
  const triggerColors = {
    rain: 'rgba(59,130,246,0.15)',
    aqi: 'rgba(245,158,11,0.15)',
    heat: 'rgba(239,68,68,0.15)',
    closure: 'rgba(139,92,246,0.15)',
    shutdown: 'rgba(245,158,11,0.15)',
  };

  const approvedClaims = claims.filter(c => c.status === 'approved');
  const totalPaid = approvedClaims.reduce((s, c) => s + (c.payout_inr || 0), 0);
  const avgPayout = approvedClaims.length > 0 ? Math.round(totalPaid / approvedClaims.length) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <AnimatedPage className={`px-4 py-5 max-w-lg mx-auto flex flex-col gap-4 ${getGlassClass('glass-bg')}`}>
      {/* New Payout Toast */}
      {newPayout && (
        <AnimatedCard
          className={`rounded-2xl p-5 text-center ${getGlassClass('glass-card')}`}
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.08))',
            border: '1px solid rgba(16,185,129,0.4)',
          }}
          delay={0.1}
        >
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>💸</div>
          <h2 className="font-bold mb-1" style={{ fontSize: '20px', color: 'var(--accent-green)' }}>
            Payout Received!
          </h2>
          <div className="font-extrabold" style={{ fontSize: '28px', color: 'var(--text-primary)' }}>
            ₹{newPayout.payout_inr}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {newPayout.trigger_type?.toUpperCase()} trigger • Sent via UPI
          </p>
        </AnimatedCard>
      )}

      {/* ═══ HERO STAT ═══ */}
      <AnimatedCard
        className={`rounded-2xl p-6 text-center ${getGlassClass('glass-widget')}`}
        style={{
          background: 'var(--gradient-hero)',
          boxShadow: 'var(--shadow-glow)',
        }}
        delay={0.2}
      >
        <div
          className="font-extrabold"
          style={{
            fontSize: '40px',
            color: 'var(--text-primary)',
          }}
        >
          <CountUpValue value={totalPaid} prefix="₹" />
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Lifetime earnings protected by SafeShift
        </p>
      </AnimatedCard>

      {/* ═══ STATS ROW — 2 cards ═══ */}
      <div className="grid grid-cols-2 gap-3">
        <AnimatedCard
          className={`rounded-2xl p-4 tap-card ${getGlassClass('glass-stat-card')}`}
          delay={0.3}
        >
          <span style={{ fontSize: '24px' }}>💰</span>
          <div className="font-bold mt-1" style={{ fontSize: '22px', color: 'var(--text-primary)' }}>
            {approvedClaims.length}
          </div>
          <div className="font-medium" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Payouts · Approved claims
          </div>
        </AnimatedCard>
        <AnimatedCard
          className={`rounded-2xl p-4 tap-card ${getGlassClass('glass-stat-card')}`}
          delay={0.4}
        >
          <span style={{ fontSize: '24px' }}>📊</span>
          <div className="font-bold mt-1" style={{ fontSize: '22px', color: 'var(--text-primary)' }}>
            ₹{avgPayout}
          </div>
          <div className="font-medium" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Avg · Per event
          </div>
        </AnimatedCard>
      </div>

      {/* ═══ RECENT PAYOUTS ═══ */}
      <div>
        <h3 className="font-semibold mb-3" style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
          Recent Payouts
        </h3>

        {approvedClaims.length === 0 ? (
          <AnimatedCard
            className={`rounded-2xl py-12 text-center ${getGlassClass('glass-card')}`}
            delay={0.5}
          >
            {/* CSS-only shield */}
            <div className="mx-auto mb-4" style={{ width: '80px', height: '80px' }}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
                <path
                  d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
                  fill="var(--text-muted)"
                />
              </svg>
            </div>
            <h3 className="font-bold mb-2" style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
              No payouts yet
            </h3>
            <p className="mb-4" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Buy a plan to get protected
            </p>
            <Link
              to="/policies"
              className="inline-flex items-center justify-center font-bold"
              style={{
                height: '44px', padding: '0 20px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', color: '#fff',
                textDecoration: 'none', fontSize: '13px',
                boxShadow: '0 6px 20px var(--accent-purple-glow)',
              }}
            >
              Get Protected →
            </Link>
          </AnimatedCard>
        ) : (
          <div className="flex flex-col gap-3">
            {approvedClaims.map((claim, i) => (
              <AnimatedCard
                key={claim._id || claim.id || i}
                className={`rounded-2xl p-4 flex items-center gap-3 tap-card ${getGlassClass('glass-list-item')}`}
                delay={0.5 + i * 0.05}
              >
                {/* Icon circle */}
                <div
                  className="flex items-center justify-center shrink-0 rounded-full"
                  style={{
                    width: '48px', height: '48px',
                    background: triggerColors[claim.trigger_type] || 'rgba(124,58,237,0.15)',
                    fontSize: '22px',
                  }}
                >
                  {triggerIcons[claim.trigger_type] || '⚡'}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold" style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                    {claim.trigger_type?.toUpperCase() || 'Unknown'} Trigger
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Trust Score: {claim.trust_score}/100
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                    {claim.triggered_at ? new Date(claim.triggered_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'}
                  </div>
                </div>

                {/* Amount + Status */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="font-bold" style={{ fontSize: '20px', color: 'var(--accent-green)' }}>
                    ₹{claim.payout_inr}
                  </span>
                  <span
                    className="font-semibold uppercase"
                    style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: 'rgba(16,185,129,0.15)',
                      color: 'var(--accent-green)',
                    }}
                  >
                    Approved
                  </span>
                </div>
              </AnimatedCard>
            ))}
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
