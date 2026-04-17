import React from 'react';
import { useGlassmorphism } from '../hooks/useGlassmorphism';

/**
 * PlanCard — Individual insurance plan/tier card with enhanced glassmorphism
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
  const { getGlassClass } = useGlassmorphism();
  const tierEmoji = { basic: '🥉', standard: '🥈', pro: '🥇' };

  const cardClass = getGlassClass(
    isActive ? 'glass-strong' : isRecommended ? 'glass-card glass-animated' : 'glass-card',
    {
      fallbackClass: 'glass-fallback',
      performanceClass: 'glass-performance'
    }
  );

  return (
    <div className={`${cardClass} ${isRecommended ? 'glass-mesh-bg' : ''} relative overflow-hidden`}>
      {isRecommended && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-green-500"></div>
      )}
      
      <div className="tier-name text-lg font-semibold mb-2 flex items-center gap-2">
        <span className="text-2xl">{tierEmoji[tier] || '📋'}</span>
        <span className="capitalize">{tier}</span>
        {isRecommended && (
          <span className="glass-subtle px-2 py-1 text-xs rounded-full text-purple-400 border border-purple-400/30">
            Recommended
          </span>
        )}
      </div>
      
      <div className="tier-price text-3xl font-bold mb-1">
        ₹{data.premium}<span className="text-lg font-normal text-gray-400">/week</span>
      </div>
      
      <div className="tier-coverage glass-widget-header p-3 rounded-lg mb-4">
        <div className="text-sm text-gray-400 mb-1">Coverage</div>
        <div className="text-xl font-semibold">₹{data.coverage}/week</div>
        <div className="text-xs text-gray-500 mt-1">
          ₹{data.per_event} per event (max 3)
        </div>
      </div>
      
      <ul className="tier-features space-y-2 mb-6">
        {features.map((f, j) => (
          <li key={j} className="flex items-center gap-2 text-sm">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></span>
            {f}
          </li>
        ))}
      </ul>
      
      <button
        id={`buy-${tier}-btn`}
        className={`glass-button w-full py-3 px-4 font-semibold rounded-lg transition-all duration-300 ${
          isRecommended 
            ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0' 
            : 'glass-hover'
        } ${isActive ? 'glass-strong cursor-not-allowed' : ''}`}
        onClick={() => onBuy && onBuy(tier)}
        disabled={buying || isActive}
      >
        {buying ? (
          <div className="flex items-center justify-center gap-2">
            <div className="spinner-sm"></div>
            Processing...
          </div>
        ) : isActive ? (
          <div className="flex items-center justify-center gap-2">
            <span className="text-green-400">✓</span>
            Current Plan
          </div>
        ) : (
          `Get ${tier.charAt(0).toUpperCase() + tier.slice(1)}`
        )}
      </button>
    </div>
  );
}
