import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, adminLogin } from '../services/api';

export default function Login({ onLogin }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (phone.length < 10) { setError('Enter a valid 10-digit phone number'); return; }
    if (!password) { setError('Password is required'); return; }

    setLoading(true);
    setError('');

    try {
      const loginFn = isAdmin ? adminLogin : login;
      const res = await loginFn(phone, password);
      const { token, role, worker } = res.data;
      localStorage.setItem('safeshift_token', token);
      onLogin({ role, phone, token, ...(worker || {}) });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    }
    setLoading(false);
  };

  const fillDemo = (type) => {
    if (type === 'worker') {
      setPhone('9876543210');
      setPassword('demo123');
      setIsAdmin(false);
    } else {
      setPhone('9999999999');
      setPassword('admin123');
      setIsAdmin(true);
    }
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🛡️</div>
          <h1>SafeShift</h1>
          <p>AI-Powered Income Protection for Gig Workers</p>
        </div>

        {/* Role Toggle */}
        <div style={{
          display: 'flex',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          marginBottom: '24px',
        }}>
          <button
            type="button"
            onClick={() => { setIsAdmin(false); setError(''); }}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: !isAdmin ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' : 'transparent',
              color: !isAdmin ? 'white' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              fontFamily: 'var(--font-family)',
              transition: 'var(--transition)',
            }}
          >
            👷 Worker
          </button>
          <button
            type="button"
            onClick={() => { setIsAdmin(true); setError(''); }}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              borderLeft: '1px solid var(--border-color)',
              background: isAdmin ? 'linear-gradient(135deg, var(--accent-warning), #d97706)' : 'transparent',
              color: isAdmin ? 'white' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              fontFamily: 'var(--font-family)',
              transition: 'var(--transition)',
            }}
          >
            🏢 Admin
          </button>
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

        <form className="login-form" onSubmit={handleLogin}>
          <div className="input-group">
            <label>Phone Number</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="input-field" style={{ width: '60px', textAlign: 'center', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+91</span>
              <input
                id="phone-input"
                type="tel"
                className="input-field"
                placeholder="Enter your mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                style={{ flex: 1 }}
                autoFocus
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', paddingRight: '48px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            id="login-btn"
            type="submit"
            className={`btn ${isAdmin ? 'btn-warning' : 'btn-primary'} btn-lg`}
            disabled={loading}
            style={{
              width: '100%',
              background: isAdmin
                ? 'linear-gradient(135deg, var(--accent-warning), #d97706)'
                : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></span>
                Signing in...
              </span>
            ) : (
              `Sign In as ${isAdmin ? 'Admin' : 'Worker'}`
            )}
          </button>

          <div className="login-divider">
            <span style={{ padding: '0 12px', background: 'var(--bg-primary)', position: 'relative', zIndex: 1 }}>Quick Demo Access</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }}
              onClick={() => fillDemo('worker')}>
              👷 Demo Worker
            </button>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }}
              onClick={() => fillDemo('admin')}>
              🏢 Demo Admin
            </button>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            fontSize: '0.78rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            padding: '4px 0',
          }}>
            <span>Worker: <strong style={{ color: 'var(--accent-primary)' }}>9876543210</strong> / <strong style={{ color: 'var(--accent-primary)' }}>demo123</strong></span>
            <span>Admin: <strong style={{ color: 'var(--accent-warning)' }}>9999999999</strong> / <strong style={{ color: 'var(--accent-warning)' }}>admin123</strong></span>
          </div>

          <div style={{ textAlign: 'center', marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => navigate('/register')}
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
              New worker? Create account →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
