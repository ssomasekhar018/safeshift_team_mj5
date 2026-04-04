import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuote, createPolicy, getActivePolicy } from '../services/api';

export default function PolicyShop({ user }) {
  const [quote, setQuote] = useState(null);
  const [activePolicy, setActivePolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState('');
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { loadQuote(); }, []);

  async function loadQuote() {
    setLoading(true);
    try {
      const [quoteRes, policyRes] = await Promise.all([
        getQuote(user.zone_id || 'KOR-4B'),
        getActivePolicy().catch(() => ({ data: { policy: null } })),
      ]);
      setQuote(quoteRes.data);
      setActivePolicy(policyRes.data.policy);
    } catch (err) {
      console.error('Quote load error:', err);
    }
    setLoading(false);
  }

  async function handleBuy(tier) {
    setBuying(tier);
    setSuccess(null);
    try {
      const res = await createPolicy(tier);
      setSuccess(res.data);
      setActivePolicy(res.data.policy);
    } catch (err) {
      console.error('Buy error:', err);
    }
    setBuying('');
  }

  const tierEmoji = { basic: '🥉', standard: '🥈', pro: '🥇' };
  const tierFeatures = {
    basic: ['Up to 3 events/week', 'Auto UPI payout', 'Basic trust scoring', 'Rain & AQI triggers'],
    standard: ['Up to 3 events/week', 'Priority UPI payout', '6-signal trust engine', 'All 5 trigger types', 'Soft-hold re-check'],
    pro: ['Up to 3 events/week', 'Instant UPI payout', 'Full 6-signal trust engine', 'All 5 trigger types', 'Priority fraud review', 'Platform API integration'],
  };

  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container">
      <div style={{ textAlign: 'center', marginBottom: '32px' }} className="animate-fade-up">
        <h1 style={{ marginBottom: '8px' }}>Choose Your Shield ⚡</h1>
        <p>AI-priced weekly plans. Cancel anytime. Claims are auto-processed.</p>
        {quote && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
            <span className={`badge ${quote.risk_level === 'high' ? 'badge-danger' : quote.risk_level === 'medium' ? 'badge-warning' : 'badge-success'}`}>
              Zone Risk: {quote.risk_score}/100
            </span>
            <span className="badge badge-info">Model: {quote.model_version}</span>
            <span className="badge badge-primary">Zone: {quote.zone_id}</span>
          </div>
        )}
      </div>

      {activePolicy && (
        <div className="glass-card animate-fade-up" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.05))', textAlign: 'center' }}>
          <p style={{ marginBottom: '8px' }}>✅ You already have an active <strong>{activePolicy.tier?.toUpperCase()}</strong> plan (₹{activePolicy.premium_inr}/week)</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Coverage: ₹{activePolicy.coverage_inr} | Valid: {activePolicy.week_start} to {activePolicy.week_end}
          </p>
        </div>
      )}

      {success && (
        <div className="glass-card animate-fade-up" style={{ marginBottom: '24px', background: 'rgba(16,185,129,0.1)', textAlign: 'center', border: '1px solid rgba(16,185,129,0.3)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>
          <h3>{success.message}</h3>
          <button className="btn btn-primary btn-sm" style={{ marginTop: '12px' }} onClick={() => navigate('/dashboard')}>
            Go to Dashboard →
          </button>
        </div>
      )}

      <div className="grid-3" style={{ marginBottom: '32px' }}>
        {quote && Object.entries(quote.tiers).map(([tier, data], i) => (
          <div key={tier} className={`tier-card animate-fade-up stagger-${i + 1} ${tier === 'standard' ? 'recommended' : ''}`}>
            <div className="tier-name">{tierEmoji[tier]} {tier}</div>
            <div className="tier-price">
              ₹{data.premium}<span>/week</span>
            </div>
            <div className="tier-coverage">Coverage: ₹{data.coverage}/week</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              ₹{data.per_event} per event (max 3)
            </div>
            <ul className="tier-features">
              {tierFeatures[tier].map((f, j) => <li key={j}>{f}</li>)}
            </ul>
            <button
              id={`buy-${tier}-btn`}
              className={`btn ${tier === 'standard' ? 'btn-primary' : 'btn-outline'} btn-lg`}
              style={{ width: '100%' }}
              onClick={() => handleBuy(tier)}
              disabled={buying === tier || (activePolicy && activePolicy.tier === tier)}
            >
              {buying === tier ? 'Processing...' : activePolicy?.tier === tier ? '✓ Current Plan' : `Get ${tier.charAt(0).toUpperCase() + tier.slice(1)}`}
            </button>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="glass-card animate-fade-up" style={{ textAlign: 'center' }}>
        <h2 style={{ marginBottom: '24px' }}>How SafeShift Works</h2>
        <div className="grid-4">
          {[
            { icon: '📱', title: 'Buy a Plan', desc: 'Choose weekly coverage starting ₹29' },
            { icon: '🌧️', title: 'Trigger Fires', desc: 'Rain > 15mm/hr, AQI > 400, Heat > 45°C...' },
            { icon: '🤖', title: 'AI Verifies', desc: '6-signal trust engine scores your claim' },
            { icon: '💸', title: 'Instant Payout', desc: 'UPI deposit in < 90 seconds' },
          ].map((step, i) => (
            <div key={i} className={`animate-fade-up stagger-${i + 1}`} style={{ padding: '16px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{step.icon}</div>
              <h3 style={{ marginBottom: '4px', fontSize: '0.95rem' }}>{step.title}</h3>
              <p style={{ fontSize: '0.8rem' }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
