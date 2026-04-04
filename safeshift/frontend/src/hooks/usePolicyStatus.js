import { useState, useEffect, useCallback } from 'react';
import { getActivePolicy, getQuote } from '../services/api';

/**
 * usePolicyStatus — Custom hook for tracking policy status
 * Returns current policy, risk score, loading state, and refresh function.
 * Auto-refreshes every 60 seconds.
 */
export default function usePolicyStatus(zoneId = 'KOR-4B') {
  const [policy, setPolicy] = useState(null);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [policyRes, quoteRes] = await Promise.all([
        getActivePolicy().catch(() => ({ data: { policy: null } })),
        getQuote(zoneId).catch(() => ({ data: null })),
      ]);
      setPolicy(policyRes.data.policy);
      setQuote(quoteRes.data);
    } catch (err) {
      setError(err.message || 'Failed to load policy status');
    }
    setLoading(false);
  }, [zoneId]);

  useEffect(() => {
    refresh();
    // Auto-refresh every 60 seconds
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  return {
    policy,
    quote,
    loading,
    error,
    refresh,
    isProtected: !!policy,
    riskScore: quote?.risk_score || 0,
    riskLevel: quote?.risk_level || 'unknown',
    tier: policy?.tier || null,
    coverageAmount: policy?.coverage_inr || 0,
    premiumAmount: policy?.premium_inr || 0,
  };
}
