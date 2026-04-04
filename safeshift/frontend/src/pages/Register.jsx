import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerWorker } from '../services/api';

export default function Register({ onLogin }) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    phone: '',
    password: '',
    confirmPassword: '',
    name: '',
    platform: 'zepto',
    zone_id: 'KOR-4B',
    zone_pincode: '560034',
    shift_start: '06:00',
    shift_end: '22:00',
    upi_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { setError('Name is required'); return; }
    if (!form.phone || form.phone.length < 10) { setError('Valid 10-digit phone number required'); return; }
    if (!form.password || form.password.length < 4) { setError('Password must be at least 4 characters'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await registerWorker({
        phone: form.phone,
        password: form.password,
        name: form.name,
        platform: form.platform,
        zone_id: form.zone_id,
        zone_pincode: form.zone_pincode,
        shift_start: form.shift_start,
        shift_end: form.shift_end,
        upi_id: form.upi_id || `${form.phone}@upi`,
      });
      const { token, worker } = res.data;
      localStorage.setItem('safeshift_token', token);
      onLogin({ role: 'worker', phone: form.phone, token, ...worker });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
    setLoading(false);
  };

  const PLATFORMS = ['zepto', 'blinkit', 'swiggy_instamart', 'bigbasket_bb_now', 'dunzo'];
  const ZONES = [
    { id: 'KOR-4B', name: 'Koramangala' }, { id: 'HSR-2A', name: 'HSR Layout' },
    { id: 'BTM-1C', name: 'BTM Layout' }, { id: 'IND-3D', name: 'Indiranagar' },
    { id: 'WHT-5A', name: 'Whitefield' }, { id: 'MG-1B', name: 'MG Road' },
    { id: 'DL-CP', name: 'Connaught Place' }, { id: 'DL-RK', name: 'RK Puram' },
  ];

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: '480px' }}>
        <div className="login-header">
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📋</div>
          <h1 style={{ fontSize: '1.4rem' }}>Create Your Account</h1>
          <p>Set up your gig worker insurance account</p>
        </div>

        {error && (
          <div style={{
            padding: '10px 16px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-danger)',
            fontSize: '0.85rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Full Name *</label>
            <input id="name-input" type="text" className="input-field" placeholder="Enter your full name" value={form.name} onChange={(e) => update('name', e.target.value)} autoFocus />
          </div>

          <div className="input-group">
            <label>Phone Number *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="input-field" style={{ width: '60px', textAlign: 'center', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+91</span>
              <input
                id="phone-input"
                type="tel"
                className="input-field"
                placeholder="10-digit mobile number"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="input-group">
              <label>Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Min 4 characters"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', fontSize: '1rem', padding: '4px',
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div className="input-group">
              <label>Confirm Password *</label>
              <input
                id="confirm-password-input"
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="Repeat password"
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Password match indicator */}
          {form.password && form.confirmPassword && (
            <div style={{
              fontSize: '0.78rem',
              color: form.password === form.confirmPassword ? 'var(--accent-success)' : 'var(--accent-danger)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '-8px',
            }}>
              {form.password === form.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
            </div>
          )}

          <div className="grid-2">
            <div className="input-group">
              <label>Platform</label>
              <select className="input-field" value={form.platform} onChange={(e) => update('platform', e.target.value)}>
                {PLATFORMS.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Zone</label>
              <select className="input-field" value={form.zone_id} onChange={(e) => update('zone_id', e.target.value)}>
                {ZONES.map(z => <option key={z.id} value={z.id}>{z.name} ({z.id})</option>)}
              </select>
            </div>
          </div>

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

          <button id="register-btn" type="submit" className="btn btn-success btn-lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></span>
                Creating Account...
              </span>
            ) : (
              '🛡️ Create Account & Activate SafeShift'
            )}
          </button>

          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-primary)',
                cursor: 'pointer',
                fontFamily: 'var(--font-family)',
                fontSize: '0.88rem',
                fontWeight: 500,
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              ← Already have an account? Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
