import React from 'react';

/**
 * PlanCard — Individual insurance plan/tier card
 * Used on PolicyShop page for displaying plan options
 */
export default function PlanCard({
  tier,
  data,
  features = [],
  isRecommended = false,
  isActive = false,
  onBuy,
  buying = false,
}) {
  const tierEmoji = { basic: '🥉', standard: '🥈', pro: '🥇' };

  return (
    <div className={`tier-card ${isRecommended ? 'recommended' : ''}`}>
      <div className="tier-name">
        {tierEmoji[tier] || '📋'} {tier}
      </div>
      <div className="tier-price">
        ₹{data.premium}<span>/week</span>
      </div>
      <div className="tier-coverage">
        Coverage: ₹{data.coverage}/week
      </div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
        ₹{data.per_event} per event (max 3)
      </div>
      <ul className="tier-features">
        {features.map((f, j) => <li key={j}>{f}</li>)}
      </ul>
      <button
        id={`buy-${tier}-btn`}
        className={`btn ${isRecommended ? 'btn-primary' : 'btn-outline'} btn-lg`}
        style={{ width: '100%' }}
        onClick={() => onBuy && onBuy(tier)}
        disabled={buying || isActive}
      >
        {buying ? 'Processing...' : isActive ? '✓ Current Plan' : `Get ${tier.charAt(0).toUpperCase() + tier.slice(1)}`}
      </button>
    </div>
  );
}
