import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getQuote, createPolicy, getActivePolicy } from '../services/api';
import { useGlassmorphism } from '../hooks/useGlassmorphism';
import { AnimatedPage, AnimatedCard, AnimatedButton, AnimatedText, AnimatedList, AnimatedListItem } from '../components/AnimatedWrapper';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem } from '../utils/animations';
import { Shield, Info, CheckCircle, AlertTriangle, FileText } from 'lucide-react';

export default function PolicyShop({ user }) {
  const { getGlassClass } = useGlassmorphism();
  const [quote, setQuote] = useState(null);
  const [activePolicy, setActivePolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState('');
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();
  const [showCompliance, setShowCompliance] = useState(false);

  useEffect(() => { loadQuote(); }, []);

  async function loadQuote() {
    if (!user) return;
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

  const tierEmoji = { basic: '🥉', standard: '🥇', pro: '🏆' };
  const tierFeatures = {
    basic: ['Up to 3 events/week', 'Auto UPI payout', 'Basic trust scoring', 'Rain & AQI triggers'],
    standard: ['Up to 3 events/week', 'Priority UPI payout', '6-signal trust engine', 'All 5 trigger types', 'Soft-hold re-check'],
    pro: ['Up to 3 events/week', 'Instant UPI payout', 'Full 6-signal trust engine', 'All 5 trigger types', 'Priority fraud review', 'Platform API integration'],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <AnimatedPage className={`px-4 py-5 max-w-lg mx-auto flex flex-col gap-4 ${getGlassClass('glass-bg')}`}>
      {/* ═══ COMPLIANCE & IRDAI OVERLAY ═══ */}
      <AnimatePresence>
        {showCompliance && (
          <motion.div 
            className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className={`w-full max-w-sm rounded-3xl p-6 overflow-y-auto max-h-[90vh] relative ${getGlassClass('glass-form')}`}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <button 
                onClick={() => setShowCompliance(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[var(--text-primary)] z-10"
              >
                ✕
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                  <Shield size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Compliance Index</h3>
                  <p className="text-xs text-[var(--text-secondary)]">IRDAI & DPDP Framework</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {/* IRDAI Section */}
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={16} className="text-blue-400" />
                    <h4 className="text-sm font-bold text-blue-400">IRDAI Guidelines</h4>
                  </div>
                  <ul className="text-xs text-[var(--text-secondary)] space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle size={12} className="mt-0.5 text-blue-400 shrink-0" />
                      <span><strong>Zero-Touch:</strong> Claims trigger automatically based on objective weather data.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={12} className="mt-0.5 text-blue-400 shrink-0" />
                      <span><strong>Fairness:</strong> Dynamic pricing based on seasonal risk and infrastructure density.</span>
                    </li>
                  </ul>
                </div>

                {/* DPDP Section */}
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={16} className="text-purple-400" />
                    <h4 className="text-sm font-bold text-purple-400">DPDP Act 2023</h4>
                  </div>
                  <ul className="text-xs text-[var(--text-secondary)] space-y-2">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                      <span><strong>Consent:</strong> Explicit opt-in for GPS and Platform activity data.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                      <span><strong>Purpose:</strong> Data used exclusively for insurance claim verification.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                      <span><strong>Rights:</strong> Right to data deletion and withdrawal of consent.</span>
                    </li>
                  </ul>
                </div>

                {/* Checklist Section */}
                <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={16} className="text-green-400" />
                    <h4 className="text-sm font-bold text-green-400">Solution Checklist</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-[10px] text-[var(--text-secondary)]">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold">1</span>
                      <span>Objective & Verifiable Triggers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold">2</span>
                      <span>Frictionless Premium Collection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold">3</span>
                      <span>Automatic Payout Execution</span>
                    </div>
                  </div>
                </div>
              </div>

              <AnimatedButton
                onClick={() => setShowCompliance(false)}
                className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
              >
                I Understand
              </AnimatedButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Title */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <AnimatedText 
          className="font-bold mb-2" 
          style={{ fontSize: '24px', color: 'var(--text-primary)' }}
          type="slideUp"
        >
          Choose Your Shield ⚡
        </AnimatedText>
        <AnimatedText 
          style={{ fontSize: '13px', color: 'var(--text-secondary)' }}
          type="fadeIn"
          delay={0.2}
        >
          AI-priced weekly plans. Cancel anytime. Claims are auto-processed.{' '}
          <button 
            onClick={() => setShowCompliance(true)}
            className="text-purple-400 underline font-medium inline-flex items-center gap-0.5"
          >
            Compliance Index <Info size={12} />
          </button>
        </AnimatedText>
      </motion.div>

      {/* Zone Info Chips */}
      {quote && (
        <motion.div 
          className="flex gap-2 overflow-x-auto scrollbar-hidden pb-1 -mx-4 px-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {/* City Tier Badge */}
          <motion.span
            className="shrink-0 flex items-center gap-1 font-semibold"
            style={{
              fontSize: '11px',
              padding: '5px 12px',
              borderRadius: '9999px',
              background: quote.city_tier === 'tier_1' ? 'rgba(245,158,11,0.15)' : quote.city_tier === 'tier_2' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
              color: quote.city_tier === 'tier_1' ? 'var(--accent-amber)' : quote.city_tier === 'tier_2' ? 'var(--accent-blue)' : 'var(--accent-green)',
              border: `1px solid ${quote.city_tier === 'tier_1' ? 'rgba(245,158,11,0.3)' : quote.city_tier === 'tier_2' ? 'rgba(59,130,246,0.3)' : 'rgba(16,185,129,0.3)'}`,
            }}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            {quote.city_tier === 'tier_1' ? 'Tier 1 City — Higher monsoon risk index' : 
             quote.city_tier === 'tier_2' ? 'Tier 2 City — Moderate risk profile' : 
             'Tier 3 City — Lower infrastructure density'} 🏙️
          </motion.span>
          
          {/* AI Scored Badge */}
          {quote.ai_scored && (
            <motion.span
              className="shrink-0 flex items-center gap-1 font-semibold"
              style={{
                fontSize: '11px',
                padding: '5px 12px',
                borderRadius: '9999px',
                background: 'rgba(124,58,237,0.15)',
                color: 'var(--accent-purple)',
                border: '1px solid rgba(124,58,237,0.3)',
              }}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              🤖 AI-Scored
            </motion.span>
          )}
          
          <motion.span
            className="shrink-0 flex items-center gap-1 font-semibold"
            style={{
              fontSize: '11px',
              padding: '5px 12px',
              borderRadius: '9999px',
              background: quote.risk_level === 'high' ? 'rgba(239,68,68,0.15)' : quote.risk_level === 'medium' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
              color: quote.risk_level === 'high' ? 'var(--accent-red)' : quote.risk_level === 'medium' ? 'var(--accent-amber)' : 'var(--accent-green)',
              border: `1px solid ${quote.risk_level === 'high' ? 'rgba(239,68,68,0.3)' : quote.risk_level === 'medium' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
            }}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            ZONE RISK: {quote.risk_score}/100 {quote.risk_level === 'high' ? '🔴' : quote.risk_level === 'medium' ? '🟡' : '🟢'}
          </motion.span>
          
          {quote.season_factor && quote.season_factor !== 1.0 && (
            <motion.span
              className="shrink-0 flex items-center gap-1 font-semibold"
              style={{
                fontSize: '11px',
                padding: '5px 12px',
                borderRadius: '9999px',
                background: 'rgba(16,185,129,0.15)',
                color: 'var(--accent-green)',
                border: '1px solid rgba(16,185,129,0.3)',
              }}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              SEASON: {quote.season_factor}x {quote.season_factor > 1.2 ? '🌧️' : '❄️'}
            </motion.span>
          )}
          
          <motion.span
            className="shrink-0 flex items-center gap-1 font-semibold"
            style={{
              fontSize: '11px', padding: '5px 12px', borderRadius: '9999px',
              background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)',
              border: '1px solid rgba(59,130,246,0.3)',
            }}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            ZONE: {quote.zone_id} 🟣
          </motion.span>
        </motion.div>
      )}

      {/* Active Plan Banner */}
      {activePolicy && (
        <AnimatedCard
          className={`rounded-2xl p-4 flex items-start gap-3 ${getGlassClass('glass-card')}`}
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.04))',
            border: '1px solid rgba(16,185,129,0.3)',
          }}
          delay={0.4}
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
              ease: "easeInOut" 
            }}
          >
            ✅
          </motion.span>
          <div className="flex-1">
            <div className="font-semibold" style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
              Active {activePolicy.tier?.toUpperCase()} plan · ₹{activePolicy.premium_inr}/week
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Coverage: ₹{activePolicy.coverage_inr} | Valid: {activePolicy.week_start} → {activePolicy.week_end}
            </div>
          </div>
          <Link
            to="/dashboard"
            className="font-medium shrink-0"
            style={{ fontSize: '12px', color: 'var(--accent-purple)', textDecoration: 'none' }}
          >
            Manage →
          </Link>
        </AnimatedCard>
      )}

      {/* Success Banner */}
      {success && (
        <AnimatedCard
          className={`rounded-2xl p-5 text-center ${getGlassClass('glass-card')}`}
          style={{
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.3)',
          }}
          delay={0.2}
        >
          <motion.div 
            style={{ fontSize: '40px', marginBottom: '8px' }}
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0]
            }}
            transition={{ 
              duration: 1, 
              repeat: 2, 
              ease: "easeInOut" 
            }}
          >
            🎉
          </motion.div>
          <AnimatedText 
            className="font-bold mb-3" 
            style={{ fontSize: '16px', color: 'var(--text-primary)' }}
            type="slideUp"
            delay={0.3}
          >
            {success.message}
          </AnimatedText>
          <AnimatedButton
            onClick={() => navigate('/dashboard')}
            className="font-bold"
            style={{
              height: '44px', padding: '0 20px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: '13px',
              boxShadow: '0 6px 20px var(--accent-purple-glow)',
            }}
          >
            Go to Dashboard →
          </AnimatedButton>
        </AnimatedCard>
      )}

      {/* ═══ PLAN CARDS ═══ */}
      <AnimatedList className="flex flex-col gap-4" stagger={0.1}>
        {quote ? Object.entries(quote.tiers).map(([tier, data], i) => {
          const isRecommended = tier === 'standard';
          const isPro = tier === 'pro';
          const isCurrent = activePolicy?.tier === tier;

          if (success) return null;

          return (
            <AnimatedListItem key={tier}>
              <AnimatedCard
                className={`rounded-2xl p-5 relative overflow-hidden ${getGlassClass('glass-card')}`}
                style={{
                  border: isCurrent
                    ? '2px solid var(--accent-green)'
                    : isRecommended
                      ? '2px solid var(--accent-purple)'
                      : isPro
                        ? '2px solid var(--border-bright)'
                        : '1px solid var(--border)',
                  boxShadow: isCurrent ? '0 0 15px rgba(16,185,129,0.2)' : isRecommended ? 'var(--shadow-glow)' : 'var(--shadow-card)',
                }}
                delay={i * 0.1}
                hover={!isCurrent}
              >
                {/* Recommended ribbon */}
                {isRecommended && (
                  <motion.div
                    className="absolute font-bold text-center"
                    style={{
                      top: '14px', right: '-30px',
                      background: 'var(--accent-purple)', color: '#fff',
                      fontSize: '8px', padding: '4px 36px',
                      transform: 'rotate(35deg)',
                      letterSpacing: '0.1em',
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
                  >
                    RECOMMENDED
                  </motion.div>
                )}

                {/* Tier badge */}
                <motion.div 
                  className="flex items-center gap-2 mb-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.3 }}
                >
                  <motion.span 
                    style={{ fontSize: '20px' }}
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
                    {tierEmoji[tier]}
                  </motion.span>
                  <span
                    className="font-bold uppercase"
                    style={{
                      fontSize: '12px',
                      letterSpacing: '0.1em',
                      color: tier === 'basic' ? 'var(--accent-blue)' : tier === 'standard' ? 'var(--accent-purple)' : 'var(--accent-amber)',
                    }}
                  >
                    {tier}
                  </span>
                </motion.div>

                {/* Price */}
                <motion.div 
                  className="flex items-baseline gap-1 mb-1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.3 }}
                >
                  <motion.span 
                    className="font-bold" 
                    style={{ fontSize: '36px', color: 'var(--text-primary)' }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    ₹{data.premium}
                  </motion.span>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/week</span>
                </motion.div>

                {/* Coverage */}
                <motion.div 
                  className="font-medium mb-1" 
                  style={{ fontSize: '13px', color: 'var(--accent-green)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.3 }}
                >
                  Coverage: ₹{data.coverage}/week
                </motion.div>
                <motion.div 
                  style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
                >
                  ₹{data.per_event} per event (max 3)
                </motion.div>

                {/* Divider */}
                <motion.div 
                  style={{ height: '1px', background: 'var(--border)', marginBottom: '12px' }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.6 + i * 0.1, duration: 0.3 }}
                />

                {/* Features */}
                <motion.div 
                  className="flex flex-col gap-2 mb-4"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.7 + i * 0.1 }}
                >
                  {tierFeatures[tier].map((f, j) => (
                    <motion.div 
                      key={j} 
                      className="flex items-center gap-2"
                      variants={staggerItem}
                      transition={{ delay: j * 0.05 }}
                    >
                      <motion.span 
                        className="font-bold" 
                        style={{ fontSize: '12px', color: 'var(--accent-green)' }}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ 
                          duration: 0.5, 
                          delay: 0.8 + i * 0.1 + j * 0.1,
                          ease: "easeInOut"
                        }}
                      >
                        ✓
                      </motion.span>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{f}</span>
                    </motion.div>
                  ))}
                </motion.div>

                {/* CTA Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + i * 0.1, duration: 0.3 }}
                >
                  {isCurrent ? (
                    <motion.button
                      disabled
                      className="w-full font-bold"
                      style={{
                        height: '48px', borderRadius: '12px',
                        background: 'var(--bg-elevated)', color: 'var(--accent-green)',
                        border: '1px solid rgba(16,185,129,0.3)',
                        cursor: 'default', fontSize: '14px',
                      }}
                      animate={{ 
                        boxShadow: [
                          '0 0 0 rgba(16,185,129,0.3)',
                          '0 0 20px rgba(16,185,129,0.3)',
                          '0 0 0 rgba(16,185,129,0.3)'
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      ✓ Your Current Plan
                    </motion.button>
                  ) : (
                    <AnimatedButton
                      id={`buy-${tier}-btn`}
                      onClick={() => handleBuy(tier)}
                      disabled={buying === tier}
                      className="w-full font-bold"
                      style={{
                        height: '48px', borderRadius: '12px',
                        border: tier === 'basic' ? '2px solid var(--accent-purple)' : 'none',
                        background: tier === 'basic'
                          ? 'transparent'
                          : isPro
                            ? 'linear-gradient(135deg, #D97706, #B45309)'
                            : 'linear-gradient(135deg, #7C3AED, #4F46E5)',
                        color: tier === 'basic' ? 'var(--accent-purple)' : '#fff',
                        cursor: buying === tier ? 'wait' : 'pointer',
                        fontSize: '14px',
                        boxShadow: tier !== 'basic' ? '0 6px 20px var(--accent-purple-glow)' : 'none',
                      }}
                    >
                      {buying === tier ? (
                        <>
                          <motion.div 
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                          Processing...
                        </>
                      ) : (
                        `Get ${tier.charAt(0).toUpperCase() + tier.slice(1)}`
                      )}
                    </AnimatedButton>
                  )}
                </motion.div>
              </AnimatedCard>
            </AnimatedListItem>
          );
        }) : (
          <div className="text-center py-20">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
            <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Failed to load plans</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Please check your internet connection and try again.</p>
            <button 
              onClick={loadQuote}
              className="mt-4 px-6 py-2 rounded-xl bg-purple-600 text-white font-bold"
            >
              Retry
            </button>
          </div>
        )}
      </AnimatedList>
    </AnimatedPage>
  );
}
