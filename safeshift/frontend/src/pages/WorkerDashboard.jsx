import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getActivePolicy, getMyClaims, getZoneStatus, simulateTrigger } from '../services/api';
import { useGlassmorphism } from '../hooks/useGlassmorphism';
import { AnimatedPage, AnimatedCard, AnimatedButton, AnimatedText, AnimatedList, AnimatedListItem } from '../components/AnimatedWrapper';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem } from '../utils/animations';
import { Shield, MapPin, Zap, Info, CheckCircle } from 'lucide-react';

export default function WorkerDashboard({ user }) {
  const { getGlassClass } = useGlassmorphism();
  const [policy, setPolicy] = useState(null);
  const [claims, setClaims] = useState([]);
  const [zone, setZone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [activeTrigger, setActiveTrigger] = useState(null);
  const [conditions, setConditions] = useState(null);
  const [conditionsLoading, setConditionsLoading] = useState(false);
  const [showStory, setShowStory] = useState(false);

  useEffect(() => { loadData(); }, []);
  
  useEffect(() => {
    // Fetch live conditions on mount
    fetchLiveConditions();
    
    // Set up 5-minute refresh interval
    const interval = setInterval(() => {
      fetchLiveConditions();
    }, 300000); // 5 minutes
    
    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [user.zone_id]);
  
  async function fetchLiveConditions() {
    setConditionsLoading(true);
    try {
      const response = await fetch(`/api/triggers/live-conditions/${user.zone_id || 'KOR-4B'}`);
      const data = await response.json();
      if (data.success && data.conditions) {
        setConditions(data.conditions);
      }
    } catch (err) {
      console.error('Failed to fetch live conditions:', err);
    }
    setConditionsLoading(false);
  }

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
    setActiveTrigger(type);
    try {
      const res = await simulateTrigger({ zone_id: user.zone_id || 'KOR-4B', trigger_type: type });
      setSimResult(res.data);
      await loadData();
    } catch (err) {
      setSimResult({ error: 'Simulation failed' });
    }
    setSimLoading(false);
    setTimeout(() => { setSimResult(null); setActiveTrigger(null); }, 3000);
  }

  const triggerIcons = { rain: '🌧️', aqi: '💨', heat: '🔥', closure: '🚧', shutdown: '⚠️' };
  const triggerDescriptions = {
    rain: 'Heavy rainfall protocol',
    aqi: 'Air quality alert',
    heat: 'Heat stress trigger',
    closure: 'Area closure event',
    shutdown: 'Platform shutdown',
  };
  const totalPaid = claims.filter(c => c.status === 'approved').reduce((s, c) => s + (c.payout_inr || 0), 0);
  
  // Use live conditions if available, otherwise fallback to zone conditions
  const currentConditions = conditions || zone?.current_conditions || {};
  const source = currentConditions.source || '';
  const isLive = source.includes('live');
  const isOpenWeather = source.includes('openweathermap');
  const isAQICN = source.includes('aqicn');
  
  const weatherPills = [
    { icon: '🌧', label: 'Rain', value: `${currentConditions.rainfall_mm || 0} mm/hr`, tint: (currentConditions.rainfall_mm || 0) > 15 ? 'var(--accent-red)' : null },
    { icon: '😷', label: 'AQI', value: currentConditions.aqi || '—', tint: (currentConditions.aqi || 0) > 200 ? 'var(--accent-amber)' : null },
    { icon: '🌡️', label: 'Temp', value: `${currentConditions.temperature_c || '—'}°C` },
    { icon: '🥵', label: 'Feels', value: `${currentConditions.feels_like_c || '—'}°C` },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className={`px-4 py-5 max-w-lg mx-auto flex flex-col gap-4 ${getGlassClass('glass-bg')}`}>
      {/* ═══ STORYTELLING OVERLAY ═══ */}
      <AnimatePresence>
        {showStory && (
          <motion.div 
            className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className={`w-full max-w-sm rounded-3xl p-6 overflow-hidden relative ${getGlassClass('glass-form')}`}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <button 
                onClick={() => setShowStory(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[var(--text-primary)]"
              >
                ✕
              </button>
              
              <div className="text-center mb-6">
                <h3 className="font-bold text-lg">How SafeShift Works</h3>
                <p className="text-xs text-[var(--text-secondary)] italic">Your Protection Story</p>
              </div>

              <div className="flex flex-col gap-4 mb-6">
                {[
                  { num: 1, title: 'The Person', desc: `You: ${user.name || 'Worker'}, ${user.platform || 'delivery'} partner.`, icon: '👤' },
                  { num: 2, title: 'The Disruption', desc: 'A heavy rain or AQI alert stops you from riding.', icon: '🌧️' },
                  { num: 3, title: 'The Loss', desc: 'Real income is lost for the shift hours.', icon: '📉' },
                  { num: 4, title: 'The Protection', desc: 'SafeShift trigger fires automatically.', icon: '🛡️' },
                  { num: 5, title: 'The Relief', desc: 'UPI payout arrives. Your family is okay.', icon: '💸' },
                ].map((step) => (
                  <div key={step.num} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {step.num}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold flex items-center gap-1.5">
                        {step.icon} {step.title}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] leading-tight">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <AnimatedButton
                onClick={() => setShowStory(false)}
                className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
              >
                Got it!
              </AnimatedButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ HERO CARD ═══ */}
      <div className={`rounded-2xl p-5 ${getGlassClass('glass-widget')}`} style={{ border: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-[20px] text-[var(--text-primary)]">
              Welcome back, {user.name || 'Worker'} 👋
            </h2>
            <button 
              onClick={() => setShowStory(true)}
              className="text-purple-400 inline-flex items-center align-middle"
              title="How it works"
            >
              <Info size={16} />
            </button>
          </div>
          {policy ? (
            <span
              className="flex items-center gap-1.5 shrink-0 font-semibold"
              style={{
                fontSize: '11px',
                padding: '5px 12px',
                borderRadius: '9999px',
                background: 'rgba(16,185,129,0.15)',
                color: 'var(--accent-green)',
                border: '1px solid rgba(16,185,129,0.3)',
              }}
            >
              <span className="status-dot-live" />
              PROTECTED
            </span>
          ) : (
            <span
              className="flex items-center gap-1.5 shrink-0 font-semibold"
              style={{
                fontSize: '11px',
                padding: '5px 12px',
                borderRadius: '9999px',
                background: 'rgba(245,158,11,0.15)',
                color: 'var(--accent-amber)',
                border: '1px solid rgba(245,158,11,0.3)',
              }}
            >
              ⚠️ UNPROTECTED
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className="font-semibold"
            style={{
              fontSize: '12px',
              padding: '3px 10px',
              borderRadius: '9999px',
              background: 'rgba(124,58,237,0.2)',
              color: 'var(--accent-purple-bright)',
            }}
          >
            📍 {user.zone_id || 'KOR-4B'}
          </span>
          <span
            className="font-semibold"
            style={{
              fontSize: '12px',
              padding: '3px 10px',
              borderRadius: '9999px',
              background: 'rgba(59,130,246,0.2)',
              color: 'var(--accent-blue)',
            }}
          >
            {user.platform || 'Zepto'}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span>📅 This Week</span>
          <span>🕐 Shift Active</span>
          <span>⚡ {policy?.tier?.toUpperCase() || 'No Plan'}</span>
        </div>
      </div>

      {/* ═══ STATS ROW — horizontal scroll ═══ */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hidden pb-1 -mx-4 px-4">
        {[
          { icon: '🛡️', label: 'Active Plan', value: policy ? policy.tier?.toUpperCase() : 'None', sub: policy ? `₹${policy.premium_inr}/week` : 'No plan' },
          { icon: '💰', label: 'Coverage', value: `₹${policy?.coverage_inr || 0}`, sub: 'Max weekly' },
          { icon: '📋', label: 'Claims Filed', value: claims.length, sub: `${claims.filter(c => c.status === 'approved').length} approved` },
          { icon: '💸', label: 'Total Received', value: `₹${totalPaid}`, sub: 'Instant UPI' },
        ].map((stat, i) => (
          <div
            key={i}
            className={`shrink-0 rounded-2xl p-4 flex flex-col items-start gap-1 ${getGlassClass('glass-stat-card')}`}
            style={{ minWidth: '120px', border: '1px solid var(--border)' }}
          >
            <span style={{ fontSize: '24px' }}>{stat.icon}</span>
            <span className="font-bold text-[22px] text-[var(--text-primary)]">
              {stat.value}
            </span>
            <span className="font-medium text-[11px] text-[var(--text-muted)]">{stat.sub}</span>
          </div>
        ))}
      </div>

      {/* ═══ NO POLICY CTA ═══ */}
      {!policy && (
        <div className={`rounded-2xl p-6 text-center ${getGlassClass('glass-card')}`} style={{ border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>⚡</div>
          <h3 className="font-bold mb-2 text-[18px] text-[var(--text-primary)]">
            You're not covered yet!
          </h3>
          <p className="mb-4 text-[13px] text-[var(--text-secondary)]">
            Get instant UPI payouts when weather disrupts your shift. Plans start at just ₹29/week.
          </p>
          <Link
            to="/policies"
            className="inline-flex items-center justify-center font-bold"
            style={{
              height: '48px', padding: '0 24px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', color: '#fff',
              textDecoration: 'none', fontSize: '14px',
              boxShadow: '0 8px 25px var(--accent-purple-glow)',
            }}
          >
            Browse Plans →
          </Link>
        </div>
      )}

      {/* ═══ LIVE CONDITIONS ═══ */}
      <div className={`rounded-2xl p-4 ${getGlassClass('glass-widget')}`} style={{ border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isLive ? (
              <span className="status-dot-live" />
            ) : (
              <span className="status-dot" style={{ background: 'var(--accent-amber)' }} />
            )}
            <span className="font-semibold text-[14px] text-[var(--text-primary)]">
              {isLive && isOpenWeather && 'Live — Weather'}
              {isLive && isAQICN && 'Live — Air Quality'}
              {!isLive && 'Demo Mode'}
            </span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">
            {currentConditions.timestamp ? new Date(currentConditions.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Updated 2m ago'}
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto scrollbar-hidden pb-1">
          {weatherPills.map((pill) => (
            <div
              key={pill.label}
              className="shrink-0 rounded-xl px-4 py-3 flex items-center gap-2"
              style={{
                background: pill.tint ? `${pill.tint}15` : 'var(--bg-elevated)',
                border: pill.tint ? `1px solid ${pill.tint}30` : '1px solid var(--border)',
                minWidth: 'fit-content',
              }}
            >
              <span style={{ fontSize: '16px' }}>{pill.icon}</span>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{pill.label}</div>
                <div className="font-bold text-[14px]" style={{ color: pill.tint || 'var(--text-primary)' }}>
                  {pill.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ SIMULATE TRIGGERS ═══ */}
      <div className={`rounded-2xl p-4 ${getGlassClass('glass-widget')}`} style={{ border: '1px solid var(--border)' }}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2 text-[15px] text-[var(--text-primary)]">
              ⚡ Test the Pipeline
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-[2px]">
              Triggers auto-process live claims
            </p>
          </div>
          <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
            <span className="text-[9px] font-bold text-amber-500 uppercase tracking-tighter">Zero-Touch</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {['rain', 'aqi', 'heat', 'closure', 'shutdown'].map((type) => {
            const isActive = activeTrigger === type;
            const isSuccess = simResult && !simResult.error && activeTrigger === type;
            return (
              <button
                key={type}
                onClick={() => handleSimulate(type)}
                disabled={simLoading}
                className="flex items-center gap-3 w-full tap-card"
                style={{
                  height: '56px', padding: '0 16px', borderRadius: '12px',
                  background: 'var(--bg-elevated)',
                  border: `1px solid ${isActive ? 'var(--accent-purple)' : 'var(--border)'}`,
                  cursor: simLoading ? 'wait' : 'pointer',
                }}
              >
                <span style={{ fontSize: '24px', flexShrink: 0 }}>{triggerIcons[type]}</span>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-[14px] text-[var(--text-primary)]">
                    {type.charAt(0).toUpperCase() + type.slice(1)} Trigger
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {triggerDescriptions[type]}
                  </div>
                </div>
                {isActive && simLoading ? (
                  <div className="spinner spinner-sm" />
                ) : isSuccess ? (
                  <span style={{ fontSize: '18px' }}>✅</span>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M9 18l6-6-6-6" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ RECENT CLAIMS ═══ */}
      <div className={`rounded-2xl ${getGlassClass('glass-widget')}`} style={{ border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between p-4 pb-2">
          <h3 className="font-semibold text-[15px] text-[var(--text-primary)]">
            📋 Recent Claims
          </h3>
          <Link
            to="/claims"
            className="font-medium text-[12px] text-[var(--accent-purple)]"
            style={{ textDecoration: 'none' }}
          >
            View All →
          </Link>
        </div>

        {claims.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>📭</div>
            <p className="text-[13px] text-[var(--text-muted)]">
              No claims yet. Claims are auto-filed when triggers fire in your zone.
            </p>
          </div>
        ) : (
          <div className="px-3 pb-3 flex flex-col gap-2">
            {claims.slice(0, 5).map((claim, i) => {
              const statusColor = claim.status === 'approved' ? 'var(--accent-green)'
                : claim.status === 'soft_hold' ? 'var(--accent-amber)'
                : claim.status === 'flagged' ? 'var(--accent-red)'
                : 'var(--accent-blue)';
              const iconBg = claim.trigger_type === 'rain' ? 'rgba(59,130,246,0.15)'
                : claim.trigger_type === 'heat' ? 'rgba(239,68,68,0.15)'
                : 'rgba(245,158,11,0.15)';

              return (
                <div
                  key={claim._id || claim.id || i}
                  className="flex items-center gap-3 rounded-xl p-3 tap-card"
                  style={{ background: 'var(--bg-elevated)' }}
                >
                  <div
                    className="flex items-center justify-center shrink-0 rounded-full"
                    style={{ width: '40px', height: '40px', background: iconBg, fontSize: '18px' }}
                  >
                    {triggerIcons[claim.trigger_type] || '⚡'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold truncate text-[13px] text-[var(--text-primary)]">
                        {claim.trigger_type?.toUpperCase() || 'Unknown'}
                      </span>
                      <span className="font-bold shrink-0 text-[16px] text-[var(--accent-green)]">
                        ₹{claim.payout_inr || 0}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-[2px]">
                      {claim.triggered_at ? new Date(claim.triggered_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'}
                    </div>
                  </div>

                  <span
                    className="font-semibold shrink-0 text-[10px]"
                    style={{
                      padding: '3px 8px', borderRadius: '9999px',
                      background: `${statusColor}20`, color: statusColor,
                      textTransform: 'uppercase',
                    }}
                  >
                    {claim.status?.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
