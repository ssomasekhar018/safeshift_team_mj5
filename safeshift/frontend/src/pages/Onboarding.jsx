import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { registerWorker, verifyEKYC } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

export default function Onboarding({ onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const phone = location.state?.phone || '';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    platform: 'zepto',
    zone_id: 'KOR-4B',
    zone_pincode: '560034',
    shift_start: '06:00',
    shift_end: '22:00',
    upi_id: '',
    aadhaar_last4: '',
  });

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const PLATFORMS = ['zepto', 'blinkit', 'swiggy_instamart', 'bigbasket_bb_now', 'dunzo'];
  const ZONES = [
    { id: 'KOR-4B', name: 'Koramangala', pincode: '560034' },
    { id: 'HSR-2A', name: 'HSR Layout', pincode: '560102' },
    { id: 'BTM-1C', name: 'BTM Layout', pincode: '560076' },
    { id: 'IND-3D', name: 'Indiranagar', pincode: '560038' },
    { id: 'WHT-5A', name: 'Whitefield', pincode: '560066' },
    { id: 'MG-1B', name: 'MG Road', pincode: '560001' },
    { id: 'DL-CP', name: 'Connaught Place', pincode: '110001' },
    { id: 'DL-RK', name: 'RK Puram', pincode: '110022' },
  ];

  const steps = [
    { num: 1, label: 'Personal', icon: '👤' },
    { num: 2, label: 'Platform', icon: '🏪' },
    { num: 3, label: 'Shift & UPI', icon: '💼' },
    { num: 4, label: 'Verify', icon: '✅' },
  ];

  const canNext = () => {
    if (step === 1) return form.name.trim().length >= 2;
    if (step === 2) return form.platform && form.zone_id;
    if (step === 3) return true;
    if (step === 4) return form.aadhaar_last4.length === 4;
    return false;
  };

  const handleNext = () => { if (step < 4) setStep(step + 1); };
  const handleBack = () => { if (step > 1) setStep(step - 1); };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      if (form.aadhaar_last4) {
        await verifyEKYC(form.aadhaar_last4).catch(() => {});
      }
      const res = await registerWorker({ ...form, phone });
      const { token, worker } = res.data;
      localStorage.setItem('safeshift_token', token);
      onLogin({ role: 'worker', phone, token, ...worker });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      <div
        className="orb fixed"
        style={{ width: '300px', height: '300px', background: 'var(--accent-purple)', opacity: 0.12, top: '10%', left: '10%', animation: 'drift 8s ease-in-out infinite alternate', pointerEvents: 'none' }}
      />
      
      <div className="fixed top-4 right-4 z-[999]">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md relative z-10" style={{ animation: 'fadeUp 0.6s ease-out' }}>
        <div className="text-center mb-8">
          <div className="mx-auto mb-4" style={{ fontSize: '48px' }}>🛡️</div>
          <h1 className="font-bold mb-1" style={{ fontSize: '24px', color: 'var(--text-primary)' }}>
            Set Up SafeShift
          </h1>
          <p className="italic" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            4 simple steps to get covered
          </p>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-1 mb-8">
          {steps.map((s) => (
            <div key={s.num} className="flex-1">
              <div
                style={{
                  height: '4px', borderRadius: '2px',
                  background: step >= s.num ? 'var(--accent-purple)' : 'var(--border)',
                  transition: 'all 0.3s ease',
                }}
              />
              <div
                style={{
                  fontSize: '11px', textAlign: 'center', marginTop: '6px',
                  color: step >= s.num ? 'var(--accent-purple)' : 'var(--text-muted)',
                  fontWeight: step === s.num ? 'bold' : 'normal',
                }}
              >
                {s.icon} {s.label}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 mb-6" style={{ padding: '10px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: 'var(--accent-red)', fontSize: '13px' }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <div className="bg-transparent flex flex-col gap-4" style={{ minHeight: '220px' }}>
          {step === 1 && (
            <div className="flex flex-col gap-4 animate-fade-up">
              <div className="flex flex-col gap-1.5">
                <label className="font-medium" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Full Name *</label>
                <input
                  type="text" placeholder="Enter your full name" autoFocus
                  value={form.name} onChange={(e) => update('name', e.target.value)}
                  className="w-full outline-none"
                  style={{ height: '52px', padding: '0 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '15px' }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-medium" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Phone Number</label>
                <input
                  type="text" value={`+91 ${phone}`} disabled
                  className="w-full outline-none"
                  style={{ height: '52px', padding: '0 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '15px' }}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4 animate-fade-up">
              <div className="flex flex-col gap-1.5">
                <label className="font-medium" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Delivery Platform</label>
                <select
                  value={form.platform} onChange={(e) => update('platform', e.target.value)}
                  className="w-full outline-none"
                  style={{ height: '52px', padding: '0 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '15px' }}
                >
                  {PLATFORMS.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-medium" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Delivery Zone</label>
                <select
                  value={form.zone_id}
                  onChange={(e) => {
                    const zone = ZONES.find(z => z.id === e.target.value);
                    update('zone_id', e.target.value);
                    if (zone) update('zone_pincode', zone.pincode);
                  }}
                  className="w-full outline-none"
                  style={{ height: '52px', padding: '0 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '15px' }}
                >
                  {ZONES.map(z => <option key={z.id} value={z.id}>{z.name} ({z.id})</option>)}
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4 animate-fade-up">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-medium" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Shift Start</label>
                  <input
                    type="time" value={form.shift_start} onChange={(e) => update('shift_start', e.target.value)}
                    className="w-full outline-none"
                    style={{ height: '52px', padding: '0 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '15px' }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-medium" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Shift End</label>
                  <input
                    type="time" value={form.shift_end} onChange={(e) => update('shift_end', e.target.value)}
                    className="w-full outline-none"
                    style={{ height: '52px', padding: '0 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '15px' }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-medium" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>UPI ID (for payouts)</label>
                <input
                  type="text" placeholder="yourname@upi" value={form.upi_id} onChange={(e) => update('upi_id', e.target.value)}
                  className="w-full outline-none"
                  style={{ height: '52px', padding: '0 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '15px' }}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-4 animate-fade-up text-center">
              <div className="mb-4">
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔐</div>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Quick Aadhaar verification for instant payouts</p>
              </div>
              <div className="flex flex-col gap-1.5 items-center">
                <label className="font-medium" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Last 4 digits of Aadhaar</label>
                <input
                  type="text" placeholder="XXXX" autoFocus
                  value={form.aadhaar_last4} onChange={(e) => update('aadhaar_last4', e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="outline-none"
                  style={{ width: '160px', height: '64px', padding: '0 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '24px', letterSpacing: '0.4em', textAlign: 'center' }}
                />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                We only store the last 4 digits. Use <strong>1234</strong> for demo.
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              className="font-bold tap-card"
              onClick={handleBack}
              style={{
                flex: 1, height: '52px', borderRadius: '14px', border: '1.5px solid var(--border)',
                background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '15px',
              }}
            >
              ← Back
            </button>
          )}
          {step < 4 ? (
            <button
              className="font-bold tap-card"
              onClick={handleNext} disabled={!canNext()}
              style={{
                flex: 2, height: '52px', borderRadius: '14px', border: 'none',
                background: canNext() ? 'var(--accent-purple)' : 'var(--bg-elevated)',
                color: canNext() ? '#fff' : 'var(--text-muted)',
                cursor: canNext() ? 'pointer' : 'not-allowed', fontSize: '15px',
                boxShadow: canNext() ? '0 8px 25px var(--accent-purple-glow)' : 'none',
              }}
            >
              Continue →
            </button>
          ) : (
            <button
              className="font-bold flex items-center justify-center gap-2 tap-card"
              onClick={handleSubmit} disabled={!canNext() || loading}
              style={{
                flex: 2, height: '52px', borderRadius: '14px', border: 'none',
                background: canNext() ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--bg-elevated)',
                color: canNext() ? '#fff' : 'var(--text-muted)',
                cursor: canNext() ? 'pointer' : 'not-allowed', fontSize: '15px',
                boxShadow: canNext() ? '0 8px 25px rgba(16,185,129,0.25)' : 'none',
              }}
            >
              {loading ? <div className="spinner spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> : '🛡️ Activate SafeShift'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
