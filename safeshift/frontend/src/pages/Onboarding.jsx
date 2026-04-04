import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { registerWorker, verifyEKYC } from '../services/api';

/**
 * Onboarding — 4-step onboarding flow
 * Step 1: Personal Info (Name, Phone)
 * Step 2: Platform & Zone selection
 * Step 3: Shift & UPI details
 * Step 4: eKYC verification
 */
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

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      // eKYC verification
      if (form.aadhaar_last4) {
        await verifyEKYC(form.aadhaar_last4).catch(() => {});
      }

      // Register worker
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
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: '520px' }}>
        {/* Header */}
        <div className="login-header">
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🛡️</div>
          <h1 style={{ fontSize: '1.4rem' }}>Set Up SafeShift</h1>
          <p>4 simple steps to get covered</p>
        </div>

        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
          {steps.map((s) => (
            <div key={s.num} style={{ flex: 1 }}>
              <div style={{
                height: '4px',
                borderRadius: '2px',
                background: step >= s.num
                  ? 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))'
                  : 'rgba(255,255,255,0.1)',
                transition: 'all 0.3s ease',
              }} />
              <div style={{
                fontSize: '0.7rem',
                color: step >= s.num ? 'var(--accent-primary)' : 'var(--text-muted)',
                textAlign: 'center',
                marginTop: '6px',
                fontWeight: step === s.num ? '700' : '400',
              }}>
                {s.icon} {s.label}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ padding: '10px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-danger)', fontSize: '0.85rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className="login-form animate-fade-up">
            <div className="input-group">
              <label>Full Name *</label>
              <input id="onboard-name" type="text" className="input-field" placeholder="Enter your full name" value={form.name} onChange={(e) => update('name', e.target.value)} autoFocus />
            </div>
            <div className="input-group">
              <label>Phone Number</label>
              <input type="text" className="input-field" value={`+91 ${phone}`} disabled style={{ opacity: 0.6 }} />
            </div>
          </div>
        )}

        {/* Step 2: Platform & Zone */}
        {step === 2 && (
          <div className="login-form animate-fade-up">
            <div className="input-group">
              <label>Delivery Platform</label>
              <select className="input-field" value={form.platform} onChange={(e) => update('platform', e.target.value)}>
                {PLATFORMS.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Delivery Zone</label>
              <select className="input-field" value={form.zone_id} onChange={(e) => {
                const zone = ZONES.find(z => z.id === e.target.value);
                update('zone_id', e.target.value);
                if (zone) update('zone_pincode', zone.pincode);
              }}>
                {ZONES.map(z => <option key={z.id} value={z.id}>{z.name} ({z.id})</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Shift & UPI */}
        {step === 3 && (
          <div className="login-form animate-fade-up">
            <div className="grid-2">
              <div className="input-group">
                <label>Shift Start</label>
                <input type="time" className="input-field" value={form.shift_start} onChange={(e) => update('shift_start', e.target.value)} />
              </div>
              <div className="input-group">
                <label>Shift End</label>
                <input type="time" className="input-field" value={form.shift_end} onChange={(e) => update('shift_end', e.target.value)} />
              </div>
            </div>
            <div className="input-group">
              <label>UPI ID (for payouts)</label>
              <input type="text" className="input-field" placeholder="yourname@upi" value={form.upi_id} onChange={(e) => update('upi_id', e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 4: eKYC */}
        {step === 4 && (
          <div className="login-form animate-fade-up">
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔐</div>
              <p style={{ fontSize: '0.9rem' }}>Quick Aadhaar verification for instant payouts</p>
            </div>
            <div className="input-group">
              <label>Last 4 digits of Aadhaar</label>
              <input
                type="text"
                className="input-field"
                placeholder="XXXX"
                value={form.aadhaar_last4}
                onChange={(e) => update('aadhaar_last4', e.target.value.replace(/\D/g, '').slice(0, 4))}
                style={{ textAlign: 'center', fontSize: '1.3rem', letterSpacing: '0.5em' }}
                autoFocus
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              We only store the last 4 digits for verification. Use <strong>1234</strong> for demo.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          {step > 1 && (
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={handleBack}>
              ← Back
            </button>
          )}
          {step < 4 ? (
            <button className="btn btn-primary btn-lg" style={{ flex: 2 }} onClick={handleNext} disabled={!canNext()}>
              Continue →
            </button>
          ) : (
            <button className="btn btn-success btn-lg" style={{ flex: 2 }} onClick={handleSubmit} disabled={!canNext() || loading}>
              {loading ? 'Creating Account...' : '🛡️ Activate SafeShift'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
