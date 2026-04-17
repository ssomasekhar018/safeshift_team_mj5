import React, { useState, useEffect } from 'react';
import { getMyClaims } from '../services/api';
import { useGlassmorphism } from '../hooks/useGlassmorphism';
import { AnimatedPage, AnimatedCard, AnimatedButton, AnimatedText, AnimatedList, AnimatedListItem } from '../components/AnimatedWrapper';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '../utils/animations';

export default function ClaimHistory({ user }) {
  const { getGlassClass } = useGlassmorphism();
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
  const approvedCount = claims.filter(c => c.status === 'approved').length;
  const heldFlaggedCount = claims.filter(c => c.status === 'soft_hold' || c.status === 'flagged').length;

  const filters = [
    { key: 'all', label: 'All', icon: '' },
    { key: 'approved', label: 'Approved', icon: '✅' },
    { key: 'soft_hold', label: 'Soft Hold', icon: '⏸' },
    { key: 'flagged', label: 'Flagged', icon: '🚩' },
    { key: 'rejected', label: 'Rejected', icon: '❌' },
  ];

  const trustSignals = [
    { signal: 'GPS Jitter', desc: 'Is the GPS stable within the zone boundary?', icon: '📍', color: 'var(--accent-blue)' },
    { signal: 'Network Match', desc: 'Consistent cell tower / WiFi connection?', icon: '📶', color: 'var(--accent-green)' },
    { signal: 'Signal Strength', desc: 'Realistic outdoor signal levels?', icon: '📡', color: 'var(--accent-purple)' },
    { signal: 'Accelerometer', desc: 'Is the device in motion (delivery)?', icon: '🏃', color: 'var(--accent-amber)' },
    { signal: 'Zone History', desc: 'Previous check-ins in this zone?', icon: '🗺️', color: 'var(--accent-red)' },
    { signal: 'Platform Active', desc: 'Currently online on delivery app?', icon: '📱', color: 'var(--accent-blue)' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <AnimatedPage className={`px-4 py-5 max-w-lg mx-auto flex flex-col gap-4 ${getGlassClass('glass-bg')}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <AnimatedText 
          className="font-bold mb-1" 
          style={{ fontSize: '24px', color: 'var(--text-primary)' }}
          type="slideUp"
        >
          Claim History
        </AnimatedText>
        <AnimatedText 
          style={{ fontSize: '13px', color: 'var(--text-secondary)' }}
          type="fadeIn"
          delay={0.2}
        >
          All parametric claims automatically filed by the SafeShift engine.
        </AnimatedText>
      </motion.div>

      {/* Stats Row */}
      <motion.div 
        className="flex gap-3 overflow-x-auto scrollbar-hidden pb-1 -mx-4 px-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.3 }}
      >
        {[
          { icon: '📋', label: 'Total Claims', value: claims.length },
          { icon: '✅', label: 'Approved', value: approvedCount, color: 'var(--accent-green)' },
          { icon: '⏸', label: 'Held/Flagged', value: heldFlaggedCount, color: 'var(--accent-amber)' },
          { icon: '💰', label: 'Total Received', value: `₹${totalPaid}`, color: 'var(--accent-green)' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            className={`shrink-0 rounded-2xl p-4 flex flex-col items-start gap-1 ${getGlassClass('glass-stat-card')}`}
            style={{ minWidth: '120px' }}
            variants={staggerItem}
            whileHover={{ y: -2, scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <motion.span 
              style={{ fontSize: '24px' }}
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: i * 0.5
              }}
            >
              {stat.icon}
            </motion.span>
            <motion.span 
              className="font-bold" 
              style={{ fontSize: '22px', color: stat.color || 'var(--text-primary)' }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
            >
              {stat.value}
            </motion.span>
            <span className="font-medium" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {stat.label}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* Filter Tabs — sticky */}
      <motion.div
        className="flex gap-2 overflow-x-auto scrollbar-hidden pb-1 -mx-4 px-4 sticky z-40"
        style={{ top: '48px', paddingTop: '8px', paddingBottom: '8px', background: 'var(--bg-base)' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        {filters.map((f, i) => (
          <AnimatedButton
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="shrink-0 flex items-center gap-1 font-semibold"
            style={{
              height: '36px',
              padding: '0 16px',
              borderRadius: '9999px',
              border: filter === f.key ? 'none' : '1px solid var(--border)',
              background: filter === f.key ? 'var(--accent-purple)' : 'var(--bg-elevated)',
              color: filter === f.key ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 200ms ease',
            }}
          >
            {f.icon && <motion.span
              animate={filter === f.key ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {f.icon}
            </motion.span>}
            {f.label}
          </AnimatedButton>
        ))}
      </motion.div>

      {/* Claim Cards */}
      {filtered.length === 0 ? (
        <AnimatedCard
          className={`rounded-2xl py-12 text-center ${getGlassClass('glass-card')}`}
          delay={0.5}
        >
          <motion.div 
            style={{ fontSize: '40px', marginBottom: '8px' }}
            animate={{ 
              rotate: [0, -10, 10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          >
            📭
          </motion.div>
          <AnimatedText 
            style={{ fontSize: '13px', color: 'var(--text-muted)' }}
            type="fadeIn"
            delay={0.2}
          >
            No claims found{filter !== 'all' ? ` with status "${filter.replace('_', ' ')}"` : ''}.
          </AnimatedText>
        </AnimatedCard>
      ) : (
        <AnimatedList className="flex flex-col gap-3" stagger={0.05}>
          {filtered.map((claim, i) => {
            const statusColor = claim.status === 'approved' ? 'var(--accent-green)'
              : claim.status === 'soft_hold' ? 'var(--accent-amber)'
              : claim.status === 'flagged' ? 'var(--accent-red)'
              : 'var(--accent-blue)';
            const iconBg = claim.trigger_type === 'rain' ? 'rgba(59,130,246,0.15)'
              : claim.trigger_type === 'heat' ? 'rgba(239,68,68,0.15)'
              : 'rgba(245,158,11,0.15)';

            return (
              <AnimatedListItem key={claim.id}>
                <AnimatedCard
                  className={`rounded-2xl p-4 relative overflow-hidden ${getGlassClass('glass-list-item')}`}
                  delay={Math.min(i, 6) * 0.05}
                  hover={true}
                >
                  {/* Left accent bar */}
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 rounded-l-2xl"
                    style={{ width: '4px', background: statusColor }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 0.2 + i * 0.05, duration: 0.3 }}
                  />

                  {/* Row 1: Event + Payout */}
                  <motion.div 
                    className="flex items-center gap-3 mb-3 pl-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
                  >
                    <motion.div
                      className="flex items-center justify-center shrink-0 rounded-full"
                      style={{ width: '40px', height: '40px', background: iconBg, fontSize: '18px' }}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      {triggerIcons[claim.trigger_type] || '⚡'}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold" style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                        {claim.trigger_type?.toUpperCase() || 'Unknown'}
                      </span>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                        {claim.triggered_at ? new Date(claim.triggered_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </div>
                    </div>
                    <motion.span 
                      className="font-bold shrink-0" 
                      style={{ fontSize: '17px', color: claim.status === 'approved' ? 'var(--accent-green)' : 'var(--text-muted)' }}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.05, duration: 0.3 }}
                    >
                      {claim.status === 'approved' ? `₹${claim.payout_inr}` : '—'}
                    </motion.span>
                  </motion.div>

                  {/* Row 2: Trust score bar */}
                  <motion.div 
                    className="flex items-center gap-2 mb-2 pl-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 + i * 0.05, duration: 0.3 }}
                  >
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Trust</span>
                    <div className="trust-bar-track flex-1">
                      <motion.div
                        className="trust-bar-fill"
                        style={{
                          background: claim.trust_score >= 80 ? 'var(--accent-green)' : claim.trust_score >= 60 ? 'var(--accent-amber)' : 'var(--accent-red)',
                        }}
                        initial={{ width: '0%' }}
                        animate={{ width: `${claim.trust_score}%` }}
                        transition={{ delay: 0.5 + i * 0.05, duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                    <motion.span 
                      className="font-bold" 
                      style={{
                        fontSize: '12px',
                        color: claim.trust_score >= 80 ? 'var(--accent-green)' : claim.trust_score >= 60 ? 'var(--accent-amber)' : 'var(--accent-red)',
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 + i * 0.05, duration: 0.3 }}
                    >
                      {claim.trust_score}
                    </motion.span>
                  </motion.div>

                  {/* Row 3: Trust signal pills */}
                  {claim.trust_signals && typeof claim.trust_signals === 'object' && (
                    <motion.div 
                      className="flex gap-1.5 overflow-x-auto scrollbar-hidden pb-1 pl-2 mb-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + i * 0.05, duration: 0.3 }}
                    >
                      {Object.entries(claim.trust_signals).slice(0, 4).map(([key, val], idx) => (
                        <motion.span
                          key={key}
                          className="shrink-0 font-medium"
                          style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            background: 'var(--bg-elevated)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border)',
                            whiteSpace: 'nowrap',
                          }}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.8 + i * 0.05 + idx * 0.1, duration: 0.2 }}
                          whileHover={{ scale: 1.05 }}
                        >
                          {key.replace(/_/g, ' ').toUpperCase()}: {typeof val === 'number' ? (val * 100).toFixed(0) + '%' : val}
                        </motion.span>
                      ))}
                    </motion.div>
                  )}

                  {/* Row 4: Status pill */}
                  <motion.div 
                    className="flex justify-end pl-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + i * 0.05, duration: 0.3 }}
                  >
                    <motion.span
                      className="font-semibold uppercase"
                      style={{
                        fontSize: '10px',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        background: `${statusColor}20`,
                        color: statusColor,
                      }}
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                    >
                      {claim.status?.replace('_', ' ')}
                    </motion.span>
                  </motion.div>
                </AnimatedCard>
              </AnimatedListItem>
            );
          })}
        </AnimatedList>
      )}

      {/* ═══ Trust Score Engine Section ═══ */}
      <motion.div 
        style={{ marginTop: '8px' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <AnimatedText 
          className="font-bold mb-3" 
          style={{ fontSize: '16px', color: 'var(--text-primary)' }}
          type="slideUp"
          delay={0.9}
        >
          🤖 6-Signal Trust Engine
        </AnimatedText>
        <motion.div 
          className="grid grid-cols-2 gap-3"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          transition={{ delay: 1.0 }}
        >
          {trustSignals.map((s, i) => (
            <motion.div
              key={i}
              className={`rounded-xl p-3 ${getGlassClass('glass-widget-header')}`}
              variants={staggerItem}
              whileHover={{ y: -2, scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <motion.span 
                style={{ fontSize: '24px' }}
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: i * 0.3
                }}
              >
                {s.icon}
              </motion.span>
              <div className="font-bold mt-1" style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                {s.signal}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {s.desc}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </AnimatedPage>
  );
}
