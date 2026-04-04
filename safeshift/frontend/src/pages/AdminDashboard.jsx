import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getDashboard, getLossRatio, getFraudQueue, getZoneAnalytics, getPayoutTrend, getTriggerHistory, reviewClaim, simulateTrigger } from '../services/api';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

export default function AdminDashboard({ user }) {
  const [kpis, setKpis] = useState(null);
  const [lossData, setLossData] = useState([]);
  const [fraudQueue, setFraudQueue] = useState([]);
  const [zoneAnalytics, setZoneAnalytics] = useState([]);
  const [payoutTrend, setPayoutTrend] = useState([]);
  const [triggerHistory, setTriggerHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [dashRes, lossRes, fraudRes, zoneRes, payoutRes, trigRes] = await Promise.all([
        getDashboard().catch(() => ({ data: { kpis: null } })),
        getLossRatio().catch(() => ({ data: { data: [] } })),
        getFraudQueue().catch(() => ({ data: { queue: [] } })),
        getZoneAnalytics().catch(() => ({ data: { zones: [] } })),
        getPayoutTrend().catch(() => ({ data: { data: [] } })),
        getTriggerHistory().catch(() => ({ data: { triggers: [] } })),
      ]);
      setKpis(dashRes.data.kpis);
      setLossData(lossRes.data.data || []);
      setFraudQueue(fraudRes.data.queue || []);
      setZoneAnalytics(zoneRes.data.zones || []);
      setPayoutTrend(payoutRes.data.data || []);
      setTriggerHistory(trigRes.data.triggers || []);
    } catch (err) {
      console.error('Admin load error:', err);
    }
    setLoading(false);
  }

  async function handleReview(claimId, action) {
    try {
      await reviewClaim(claimId, action, `${action}d by admin via dashboard`);
      setFraudQueue(prev => prev.filter(c => c.id !== claimId));
    } catch (err) {
      console.error('Review error:', err);
    }
  }

  async function handleSimulate(zoneId, type) {
    setSimLoading(true);
    try {
      const res = await simulateTrigger({ zone_id: zoneId, trigger_type: type });
      setSimResult(res.data);
      await loadAll();
    } catch (err) {
      console.error('Sim error:', err);
    }
    setSimLoading(false);
    setTimeout(() => setSimResult(null), 5000);
  }

  const triggerIcons = { rain: '🌧️', aqi: '💨', heat: '🔥', closure: '🚧', shutdown: '⚠️' };

  if (loading) {
    return <div className="loading-spinner" style={{ minHeight: '60vh' }}><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1>Insurer Dashboard 🏢</h1>
          <p style={{ fontSize: '0.85rem' }}>SafeShift Admin Panel — Real-time underwriting analytics</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['overview', 'fraud', 'triggers'].map(tab => (
            <button key={tab} className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {simResult && (
        <div className="glass-card animate-fade-up" style={{ marginBottom: '16px', background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.3)' }}>
          <strong>⚡ Trigger Fired:</strong> {simResult.message}
        </div>
      )}

      {/* ─── OVERVIEW TAB ─── */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards */}
          {kpis && (
            <div className="grid-4" style={{ marginBottom: '24px' }}>
              <div className="kpi-card animate-fade-up stagger-1">
                <span className="kpi-label">Total Workers</span>
                <span className="kpi-value">{kpis.total_workers?.toLocaleString()}</span>
                <span className="kpi-sub">Registered on platform</span>
              </div>
              <div className="kpi-card animate-fade-up stagger-2">
                <span className="kpi-label">Active Policies</span>
                <span className="kpi-value">{kpis.active_policies?.toLocaleString()}</span>
                <span className="kpi-sub">₹{kpis.total_premium_collected?.toLocaleString()} collected</span>
              </div>
              <div className="kpi-card animate-fade-up stagger-3">
                <span className="kpi-label">Loss Ratio</span>
                <span className="kpi-value" style={{ color: parseFloat(kpis.loss_ratio) > 80 ? 'var(--accent-danger)' : parseFloat(kpis.loss_ratio) > 60 ? 'var(--accent-warning)' : 'var(--accent-success)' }}>
                  {kpis.loss_ratio}%
                </span>
                <span className="kpi-sub">Payouts / Premiums</span>
              </div>
              <div className="kpi-card animate-fade-up stagger-4">
                <span className="kpi-label">Triggers This Week</span>
                <span className="kpi-value">{kpis.triggers_this_week}</span>
                <span className="kpi-sub">Weather events detected</span>
              </div>
            </div>
          )}

          <div className="grid-2" style={{ marginBottom: '24px' }}>
            {/* Loss Ratio Chart */}
            <div className="glass-card animate-fade-up stagger-3">
              <h3 className="section-title" style={{ marginBottom: '16px' }}>📊 Weekly Loss Ratio</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={lossData.map(d => ({ ...d, lossRatio: d.premiums > 0 ? ((d.payouts / d.premiums) * 100).toFixed(1) : 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => v?.slice(5)} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9' }} />
                  <Bar dataKey="premiums" fill="#6366f1" name="Premiums ₹" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="payouts" fill="#10b981" name="Payouts ₹" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Payout Trend */}
            <div className="glass-card animate-fade-up stagger-4">
              <h3 className="section-title" style={{ marginBottom: '16px' }}>💸 Daily Payout Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={payoutTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => v?.slice(5)} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9' }} />
                  <Line type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} name="Payout ₹" />
                  <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4', r: 3 }} name="Claims" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Zone Analytics */}
          <div className="glass-card animate-fade-up stagger-5">
            <h3 className="section-title" style={{ marginBottom: '16px' }}>🗺️ Zone Analytics</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Zone</th>
                    <th>Workers</th>
                    <th>Policies</th>
                    <th>Claims</th>
                    <th>Payouts</th>
                    <th>Avg Trust</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {zoneAnalytics.map((zone, i) => (
                    <tr key={zone.zone_id}>
                      <td><strong>{zone.zone_id}</strong></td>
                      <td>{zone.workers}</td>
                      <td>{zone.policies}</td>
                      <td>{zone.claims}</td>
                      <td style={{ color: 'var(--accent-success)', fontWeight: '600' }}>₹{zone.total_payouts?.toLocaleString()}</td>
                      <td>
                        <div className="trust-meter">
                          <div className="trust-bar" style={{ width: '50px' }}>
                            <div className="trust-fill" style={{
                              width: `${zone.avg_trust}%`,
                              background: zone.avg_trust >= 70 ? 'var(--accent-success)' : 'var(--accent-warning)',
                            }}></div>
                          </div>
                          <span className="trust-value" style={{ fontSize: '0.8rem' }}>{Math.round(zone.avg_trust)}</span>
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={() => handleSimulate(zone.zone_id, 'rain')} disabled={simLoading} style={{ fontSize: '0.7rem' }}>
                          ⚡ Simulate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Claims by Status Pie */}
          {kpis?.claims_by_status && (
            <div className="glass-card animate-fade-up" style={{ marginTop: '24px' }}>
              <h3 className="section-title" style={{ marginBottom: '16px' }}>📋 Claims Distribution</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
                <ResponsiveContainer width={250} height={250}>
                  <PieChart>
                    <Pie
                      data={Object.entries(kpis.claims_by_status).map(([name, value]) => ({ name, value }))}
                      cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                      dataKey="value" nameKey="name" paddingAngle={3}
                    >
                      {Object.keys(kpis.claims_by_status).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(kpis.claims_by_status).map(([status, count], i) => (
                    <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: COLORS[i % COLORS.length] }}></div>
                      <span style={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>{status.replace('_', ' ')}: <strong>{count}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── FRAUD TAB ─── */}
      {activeTab === 'fraud' && (
        <div className="glass-card animate-fade-up">
          <div className="section-header">
            <h3 className="section-title">🚩 Fraud Review Queue</h3>
            <span className="badge badge-danger">{fraudQueue.length} pending</span>
          </div>
          {fraudQueue.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <p>No claims pending review. All clear!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {fraudQueue.map((item, i) => (
                <div key={item.id} className={`trigger-card animate-slide-in stagger-${Math.min(i + 1, 6)}`} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {item.name || 'Worker'} • {item.zone_id}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {triggerIcons[item.trigger_type]} {item.trigger_type?.toUpperCase()} • Trust: {item.trust_score}/100
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className={`badge ${item.status === 'flagged' ? 'badge-danger' : 'badge-warning'}`}>{item.status}</span>
                      <span style={{ fontWeight: '700' }}>₹{item.payout_inr}</span>
                    </div>
                  </div>

                  {/* Trust Signals */}
                  {item.trust_signals && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0' }}>
                      {Object.entries(item.trust_signals).map(([key, val]) => (
                        <span key={key} className={`badge ${val >= 0.7 ? 'badge-success' : val >= 0.4 ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                          {key.replace(/_/g, ' ')}: {(val * 100).toFixed(0)}%
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-success btn-sm" onClick={() => handleReview(item.id, 'approve')}>✅ Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleReview(item.id, 'reject')}>❌ Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TRIGGERS TAB ─── */}
      {activeTab === 'triggers' && (
        <>
          {/* Simulate */}
          <div className="glass-card animate-fade-up" style={{ marginBottom: '24px' }}>
            <h3 className="section-title" style={{ marginBottom: '16px' }}>⚡ Fire a Trigger</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
              Simulate weather/hazard events to test the end-to-end parametric pipeline.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {['KOR-4B', 'HSR-2A', 'DL-RK', 'WHT-5A'].map(zone => (
                <div key={zone} style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ padding: '6px 10px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>{zone}:</span>
                  {['rain', 'aqi', 'heat', 'closure', 'shutdown'].map(type => (
                    <button key={`${zone}-${type}`} className="btn btn-outline btn-sm" onClick={() => handleSimulate(zone, type)} disabled={simLoading}>
                      {triggerIcons[type]}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Trigger History */}
          <div className="glass-card animate-fade-up">
            <h3 className="section-title" style={{ marginBottom: '16px' }}>📋 Trigger History</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Zone</th>
                    <th>Value</th>
                    <th>Claims</th>
                    <th>Approved</th>
                    <th>Total Payout</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {triggerHistory.map((t, i) => (
                    <tr key={t.id} className={`animate-slide-in stagger-${Math.min(i + 1, 6)}`}>
                      <td>
                        <span style={{ marginRight: '6px' }}>{triggerIcons[t.trigger_type] || '⚡'}</span>
                        {t.trigger_type?.toUpperCase()}
                      </td>
                      <td><strong>{t.zone_id}</strong></td>
                      <td>{t.threshold_value}</td>
                      <td>{t.total_claims}</td>
                      <td style={{ color: 'var(--accent-success)' }}>{t.approved_claims}</td>
                      <td style={{ fontWeight: '600' }}>₹{t.total_payout?.toLocaleString()}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {t.triggered_at ? new Date(t.triggered_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
