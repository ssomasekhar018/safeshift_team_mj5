import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getDashboard, getLossRatio, getFraudQueue, getZoneAnalytics, getPayoutTrend, getTriggerHistory, reviewClaim, simulateTrigger } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';
import ZoneHeatmap from '../components/ZoneHeatmap';
import { useNavigate } from 'react-router-dom';
import { useGlassmorphism } from '../hooks/useGlassmorphism';
import { Shield, LogOut, Users, Activity, FileText, TrendingUp, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedCard, AnimatedText } from '../components/AnimatedWrapper';

const COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6'];

export default function AdminDashboard({ user, onLogout }) {
  const { getGlassClass } = useGlassmorphism();
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
  const navigate = useNavigate();

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
      setZoneAnalytics(zoneRes.data.zones.filter(zone => !zone.zone_id.startsWith('TEST-')) || []);
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

  const handleLogout = () => {
    localStorage.removeItem('safeshift_token');
    localStorage.removeItem('safeshift_user');
    navigate('/');
    window.location.reload();
  };

  const triggerIcons = { rain: '🌧️', aqi: '💨', heat: '🔥', closure: '🚧', shutdown: '⚠️' };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-12 transition-colors duration-300 ${getGlassClass('glass-bg')}`}>
      {/* ─── ADMIN HEADER ─── */}
      <header className={`sticky top-0 z-50 px-6 h-20 flex items-center justify-between border-b ${getGlassClass('glass-card')}`} style={{ borderRadius: 0, borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Admin Portal</h1>
            <p className="text-[10px] uppercase tracking-widest text-purple-400 font-bold">System Overview</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="h-8 w-[1px] bg-[var(--border)]" />
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-overlay)', borderColor: 'var(--border)' }}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
              {user?.name?.[0] || 'A'}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-[var(--text-primary)]">{user?.name || 'Administrator'}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">Root Access</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="p-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all duration-200"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">
        
        {/* ─── TAB NAVIGATION ─── */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hidden pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
          {[
            { id: 'overview', icon: '📊', label: 'Overview' },
            { id: 'fraud', icon: '🚩', label: 'Fraud Queue', badge: fraudQueue.length },
            { id: 'triggers', icon: '⚡', label: 'Trigger Console' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 font-semibold shrink-0 tap-card transition-all"
              style={{
                height: '40px', padding: '0 16px', borderRadius: '999px',
                border: activeTab === tab.id ? 'none' : '1px solid var(--border)',
                background: activeTab === tab.id ? 'var(--accent-purple)' : 'var(--bg-elevated)',
                color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
                fontSize: '14px',
                boxShadow: activeTab === tab.id ? 'var(--shadow-glow)' : 'none',
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.badge > 0 && (
                <span style={{
                  background: activeTab === tab.id ? '#fff' : 'var(--accent-red)',
                  color: activeTab === tab.id ? 'var(--accent-purple)' : '#fff',
                  padding: '2px 6px', borderRadius: '99px', fontSize: '11px', fontWeight: 'bold', marginLeft: '4px'
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {simResult && (
          <div
            className="mb-4 rounded-xl p-4 flex items-center gap-3 animate-fade-up"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--accent-green)' }}
          >
            <span style={{ fontSize: '20px' }}>✅</span>
            <span className="font-semibold" style={{ fontSize: '14px' }}>
              Simulation Fired: {simResult.message}
            </span>
          </div>
        )}

        {/* ─── OVERVIEW TAB ─── */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6">
            {/* KPI ROW */}
            {kpis && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <AnimatedCard className={`rounded-3xl p-6 ${getGlassClass('glass-widget')}`} delay={0.1}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <Users size={24} />
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Growth</span>
                      <span className="text-xs font-bold text-green-500">+12%</span>
                    </div>
                  </div>
                  <AnimatedText className="text-3xl font-bold text-[var(--text-primary)] mb-1" type="slideUp" delay={0.2}>
                    {kpis.total_workers?.toLocaleString() || 0}
                  </AnimatedText>
                  <p className="text-sm text-[var(--text-secondary)]">Active Workers</p>
                </AnimatedCard>

                <AnimatedCard className={`rounded-3xl p-6 ${getGlassClass('glass-widget')}`} delay={0.2}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                      <FileText size={24} />
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">Volume</span>
                      <span className="text-xs font-bold text-green-500">+8%</span>
                    </div>
                  </div>
                  <AnimatedText className="text-3xl font-bold text-[var(--text-primary)] mb-1" type="slideUp" delay={0.3}>
                    {kpis.active_policies?.toLocaleString() || 0}
                  </AnimatedText>
                  <p className="text-sm text-[var(--text-secondary)]">Active Policies</p>
                </AnimatedCard>

                <AnimatedCard className={`rounded-3xl p-6 ${getGlassClass('glass-widget')}`} delay={0.3}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
                      <TrendingUp size={24} />
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Efficiency</span>
                      <span className="text-xs font-bold text-blue-500">Healthy</span>
                    </div>
                  </div>
                  <AnimatedText className="text-3xl font-bold text-[var(--text-primary)] mb-1" type="slideUp" delay={0.4}>
                    {kpis.loss_ratio}%
                  </AnimatedText>
                  <p className="text-sm text-[var(--text-secondary)]">Loss Ratio</p>
                </AnimatedCard>

                <AnimatedCard className={`rounded-3xl p-6 ${getGlassClass('glass-widget')}`} delay={0.4}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <Activity size={24} />
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Risks</span>
                      <span className="text-xs font-bold text-amber-500">{kpis.triggers_this_week} Alerts</span>
                    </div>
                  </div>
                  <AnimatedText className="text-3xl font-bold text-[var(--text-primary)] mb-1" type="slideUp" delay={0.5}>
                    {fraudQueue.length}
                  </AnimatedText>
                  <p className="text-sm text-[var(--text-secondary)]">Claims in Queue</p>
                </AnimatedCard>
              </div>
            )}

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`rounded-2xl p-5 ${getGlassClass('glass-widget')}`} style={{ }}>
                <h3 className="font-bold mb-4" style={{ fontSize: '16px', color: 'var(--text-primary)' }}>📈 Weekly Loss Ratio</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={lossData.map(d => ({ ...d, lossRatio: d.premiums > 0 ? ((d.payouts / d.premiums) * 100).toFixed(1) : 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="week" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => v?.slice(5)} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'var(--bg-elevated)' }} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                    <Bar dataKey="premiums" fill="var(--accent-blue)" name="Premiums ₹" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="payouts" fill="var(--accent-red)" name="Payouts ₹" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className={`rounded-2xl p-5 ${getGlassClass('glass-widget')}`} style={{ }}>
                <h3 className="font-bold mb-4" style={{ fontSize: '16px', color: 'var(--text-primary)' }}>💸 Daily Claim Velocity</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={payoutTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => v?.slice(5)} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                    <Line type="monotone" dataKey="amount" stroke="var(--accent-purple)" strokeWidth={3} dot={{ fill: 'var(--accent-purple)', r: 4, strokeWidth: 0 }} name="Payout ₹" />
                    <Line type="monotone" dataKey="count" stroke="var(--accent-green)" strokeWidth={3} dot={{ fill: 'var(--accent-green)', r: 4, strokeWidth: 0 }} name="Claims" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ZONE METRICS TABLE */}
            <div className={`rounded-2xl p-5 overflow-hidden ${getGlassClass('glass-table')}`} style={{ }}>
              <h3 className="font-bold mb-4" style={{ fontSize: '16px', color: 'var(--text-primary)' }}>🗺️ Zone Underwriting Analytics</h3>
              <div className="overflow-x-auto scrollbar-hidden">
                <table className="w-full text-left" style={{ borderCollapse: 'collapse', minWidth: '800px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th className="py-3 px-2 font-semibold text-xs text-muted uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Zone</th>
                      <th className="py-3 px-2 font-semibold text-xs text-muted uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Workers</th>
                      <th className="py-3 px-2 font-semibold text-xs text-muted uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Policies</th>
                      <th className="py-3 px-2 font-semibold text-xs text-muted uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Claims Filed</th>
                      <th className="py-3 px-2 font-semibold text-xs text-muted uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Payouts</th>
                      <th className="py-3 px-2 font-semibold text-xs text-muted uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Avg Trust Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zoneAnalytics.map((zone, i) => (
                      <tr key={zone.zone_id} style={{ borderBottom: i === zoneAnalytics.length - 1 ? 'none' : '1px solid var(--border)' }}>
                        <td className="py-3 px-2 font-bold" style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{zone.zone_id}</td>
                        <td className="py-3 px-2" style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{zone.workers}</td>
                        <td className="py-3 px-2" style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{zone.policies}</td>
                        <td className="py-3 px-2" style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{zone.claims}</td>
                        <td className="py-3 px-2 font-bold" style={{ color: 'var(--accent-green)', fontSize: '14px' }}>₹{zone.total_payouts?.toLocaleString()}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className="trust-bar-track flex-1 max-w-[80px]" style={{ height: '6px' }}>
                              <div
                                className="trust-bar-fill"
                                style={{
                                  '--fill-width': `${zone.avg_trust}%`,
                                  background: zone.avg_trust >= 70 ? 'var(--accent-green)' : 'var(--accent-amber)',
                                }}
                              />
                            </div>
                            <span className="font-bold" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {Math.round(zone.avg_trust)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Zone Risk Heatmap */}
            {zoneAnalytics && zoneAnalytics.length > 0 && (
              <div className={`rounded-2xl p-5 ${getGlassClass('glass-widget')}`} style={{ }}>
                <ZoneHeatmap zone_stats={zoneAnalytics} />
              </div>
            )}

            {/* Claims Pie Chart */}
            {kpis?.claims_by_status && (
              <div className={`rounded-2xl p-5 ${getGlassClass('glass-widget')}`} style={{ }}>
                <h3 className="font-bold mb-4" style={{ fontSize: '16px', color: 'var(--text-primary)' }}>📋 Global Claims Distribution</h3>
                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                  <ResponsiveContainer width={250} height={250}>
                    <PieChart>
                      <Pie
                        data={Object.entries(kpis.claims_by_status).map(([name, value]) => ({ name, value }))}
                        cx="50%" cy="50%" outerRadius={100} innerRadius={60}
                        dataKey="value" nameKey="name" paddingAngle={2} stroke="none"
                      >
                        {Object.keys(kpis.claims_by_status).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-3">
                    {Object.entries(kpis.claims_by_status).map(([status, count], i) => (
                      <div key={status} className="flex items-center gap-3">
                        <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: COLORS[i % COLORS.length] }}></div>
                        <span className="capitalize" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                          {status.replace('_', ' ')}
                        </span>
                        <span className="font-bold ml-auto" style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── FRAUD TAB ─── */}
        {activeTab === 'fraud' && (
          <div className={`rounded-2xl p-5 ${getGlassClass('glass-widget')}`} style={{ }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold" style={{ fontSize: '18px', color: 'var(--text-primary)' }}>🚩 Review Queue</h3>
              <span className="font-semibold px-3 py-1 rounded-full" style={{ fontSize: '12px', background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)' }}>
                {fraudQueue.length} pending
              </span>
            </div>
            
            {fraudQueue.length === 0 ? (
              <div className="py-16 text-center">
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛡️</div>
                <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Queue is empty</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>All flagged claims have been reviewed.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {fraudQueue.map(item => (
                  <div key={item.id} className="rounded-xl p-5 border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold" style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{item.name || 'Worker'}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                            {item.zone_id}
                          </span>
                        </div>
                        <div className="flex items-center gap-2" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <span>{triggerIcons[item.trigger_type]} {item.trigger_type?.toUpperCase()}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            Trust Score: <strong style={{ color: item.trust_score < 50 ? 'var(--accent-red)' : 'var(--accent-amber)' }}>{item.trust_score}/100</strong>
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="font-bold" style={{ fontSize: '24px', color: 'var(--text-primary)' }}>
                          ₹{item.payout_inr}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReview(item.id, 'approve')}
                            className="font-bold tap-card text-xs px-4 py-2 rounded-lg"
                            style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)', border: '1px solid rgba(16,185,129,0.3)' }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReview(item.id, 'reject')}
                            className="font-bold tap-card text-xs px-4 py-2 rounded-lg"
                            style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.3)' }}
                          >
                            Deny
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Signal Breakdown */}
                    {item.trust_signals && (
                      <div className="flex flex-wrap gap-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                        <span className="text-xs font-semibold self-center mr-2" style={{ color: 'var(--text-muted)' }}>Signals:</span>
                        {Object.entries(item.trust_signals).map(([key, val]) => {
                          const bad = val < 0.5;
                          return (
                            <span key={key} className="text-xs font-medium px-2 py-1 rounded" style={{
                              background: bad ? 'rgba(239,68,68,0.1)' : 'var(--bg-surface)',
                              color: bad ? 'var(--accent-red)' : 'var(--text-secondary)',
                              border: bad ? '1px solid rgba(239,68,68,0.2)' : '1px solid var(--border)'
                            }}>
                              {key.replace(/_/g, ' ').toUpperCase()}: {(val * 100).toFixed(0)}%
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TRIGGERS TAB ─── */}
        {activeTab === 'triggers' && (
          <div className="flex flex-col gap-6">
            {/* Simulation Card */}
            <div className={`rounded-2xl p-5 ${getGlassClass('glass-widget')}`} style={{ }}>
              <h3 className="font-bold mb-2" style={{ fontSize: '16px', color: 'var(--text-primary)' }}>⚡ Test Event Pipeline</h3>
              <p className="mb-4" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Simulate weather or hazard triggers in specific zones. This bypasses external APIs and directly runs the underwriting engine to generate claims.
              </p>
              
              <div className="flex flex-col gap-4">
                {['KOR-4B', 'HSR-2A', 'DL-RK', 'WHT-5A'].map(zone => (
                  <div key={zone} className="flex flex-col md:flex-row md:items-center gap-3 p-3 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                    <span className="font-bold shrink-0 w-24" style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{zone}</span>
                    <div className="flex flex-wrap gap-2">
                      {['rain', 'aqi', 'heat', 'closure', 'shutdown'].map(type => (
                        <button
                          key={`${zone}-${type}`}
                          onClick={() => handleSimulate(zone, type)}
                          disabled={simLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold tap-card"
                          style={{
                            background: 'var(--bg-surface)', borderColor: 'var(--border)',
                            color: 'var(--text-secondary)', fontSize: '13px', cursor: simLoading ? 'wait' : 'pointer'
                          }}
                        >
                          <span style={{ fontSize: '16px' }}>{triggerIcons[type]}</span>
                          <span className="capitalize">{type}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* History Table */}
            <div className={`rounded-2xl p-5 overflow-hidden ${getGlassClass('glass-table')}`} style={{ }}>
              <h3 className="font-bold mb-4" style={{ fontSize: '16px', color: 'var(--text-primary)' }}>📋 Recent Oracle Triggers</h3>
              <div className="overflow-x-auto scrollbar-hidden">
                <table className="w-full text-left" style={{ borderCollapse: 'collapse', minWidth: '800px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th className="py-3 px-2 font-semibold text-xs text-muted uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Event</th>
                      <th className="py-3 px-2 font-semibold text-xs text-muted uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Zone</th>
                      <th className="py-3 px-2 font-semibold text-xs text-muted uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Value</th>
                      <th className="py-3 px-2 font-semibold text-xs text-muted uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Claims Generated</th>
                      <th className="py-3 px-2 font-semibold text-xs text-muted uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Exposure</th>
                      <th className="py-3 px-2 font-semibold text-xs text-muted uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {triggerHistory.length === 0 ? (
                      <tr><td colSpan="6" className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No triggers recorded.</td></tr>
                    ) : (
                      triggerHistory.map((t, i) => (
                        <tr key={t.id} style={{ borderBottom: i === triggerHistory.length - 1 ? 'none' : '1px solid var(--border)' }}>
                          <td className="py-3 px-2 font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                            <span style={{ fontSize: '18px' }}>{triggerIcons[t.trigger_type] || '⚡'}</span>
                            <span className="uppercase">{t.trigger_type}</span>
                            {t.mass_disruption_mode === 1 && (
                              <span
                                className="px-2 py-0.5 rounded-full font-bold"
                                style={{
                                  background: 'rgba(239,68,68,0.15)',
                                  border: '1px solid rgba(239,68,68,0.3)',
                                  color: 'var(--accent-red)',
                                  fontSize: '10px'
                                }}
                              >
                                ⚠️ MASS
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2" style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{t.zone_id}</td>
                          <td className="py-3 px-2" style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{t.threshold_value}</td>
                          <td className="py-3 px-2" style={{ fontSize: '14px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{t.total_claims}</span>
                            {t.approved_claims > 0 && <span style={{ color: 'var(--accent-green)', marginLeft: '4px' }}>({t.approved_claims} paid)</span>}
                          </td>
                          <td className="py-3 px-2 font-bold" style={{ color: 'var(--accent-red)', fontSize: '14px' }}>₹{t.total_payout?.toLocaleString()}</td>
                          <td className="py-3 px-2" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                            {t.triggered_at ? new Date(t.triggered_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'}) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
