import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { login, adminLogin } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';
import ThreeBackground from '../components/ThreeBackground';
import { AnimatedPage, AnimatedCard, AnimatedButton, AnimatedText } from '../components/AnimatedWrapper';
import { pageVariants, cardVariants, staggerContainer, staggerItem } from '../utils/animations';
import { useGlassmorphism } from '../hooks/useGlassmorphism';

export default function Login({ onLogin }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { getGlassClass, getGlassStyle } = useGlassmorphism();

  useEffect(() => {
    // Add PWA class to body when role is Worker (to disable hover/etc.)
    if (!isAdmin) {
      document.body.classList.add('pwa-mode');
    } else {
      document.body.classList.remove('pwa-mode');
    }
    return () => {
      document.body.classList.remove('pwa-mode');
    };
  }, [isAdmin]);

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
      console.error('Login error:', err.response || err);
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    }
    setLoading(false);
  };

  return (
    <AnimatedPage className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Three.js 3D Background */}
      <ThreeBackground />
      
      {/* Theme Toggle — fixed top right */}
      <div className="fixed top-4 right-4 z-[999]">
        <ThemeToggle />
      </div>

      {/* Login Card */}
      <AnimatedCard
        className={`w-full max-w-sm relative z-10 ${getGlassClass('glass-form')}`}
        style={{ padding: '32px' }}
        delay={0.2}
      >
        {/* Logo + Branding */}
        <motion.div 
          className="text-center" 
          style={{ marginBottom: '24px' }}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Shield Logo */}
          <motion.div
            className="mx-auto flex items-center justify-center"
            style={{
              width: '64px', height: '64px',
              marginBottom: '24px',
            }}
            variants={staggerItem}
            whileHover={{ scale: 1.1, rotate: 5 }}
            animate={{ 
              filter: [
                'drop-shadow(0 0 20px var(--accent-purple-glow))',
                'drop-shadow(0 0 30px var(--accent-purple-glow))',
                'drop-shadow(0 0 20px var(--accent-purple-glow))'
              ]
            }}
            transition={{ 
              filter: { duration: 3, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="loginShield" x1="3" y1="2" x2="21" y2="19">
                  <stop offset="0%" stopColor="var(--accent-purple)" />
                  <stop offset="100%" stopColor="var(--accent-blue)" />
                </linearGradient>
              </defs>
              <path
                d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
                fill="url(#loginShield)"
              />
              <path
                d="M10 12l2 2 4-4"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </motion.div>

          <AnimatedText
            className="font-bold mb-1"
            style={{ fontSize: '28px', color: 'var(--text-primary)' }}
            type="slideUp"
            delay={0.3}
          >
            SafeShift
          </AnimatedText>
          <AnimatedText
            className="italic"
            style={{ fontSize: '13px', color: 'var(--text-secondary)' }}
            type="fadeIn"
            delay={0.4}
          >
            AI-Powered Income Protection for Gig Workers
          </AnimatedText>
        </motion.div>

        {/* Worker / Admin Segmented Control */}
        <motion.div
          className={`flex w-full mb-6 ${getGlassClass('glass-subtle')}`}
          style={{
            borderRadius: '12px',
            padding: '4px',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <AnimatedButton
            type="button"
            onClick={() => { setIsAdmin(false); setError(''); }}
            className="flex-1 flex items-center justify-center gap-2 font-semibold transition-all duration-200"
            style={{
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              background: !isAdmin
                ? 'linear-gradient(135deg, #7C3AED, #4F46E5)'
                : 'transparent',
              color: !isAdmin
                ? '#FFFFFF'
                : 'var(--text-muted)',
            }}
          >
            🛵 Worker
          </AnimatedButton>
          <AnimatedButton
            type="button"
            onClick={() => { setIsAdmin(true); setError(''); }}
            className="flex-1 flex items-center justify-center gap-2 font-semibold transition-all duration-200"
            style={{
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              background: isAdmin
                ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                : 'transparent',
              color: isAdmin
                ? '#FFFFFF'
                : 'var(--text-muted)',
            }}
          >
            🏢 Admin
          </AnimatedButton>
        </motion.div>

        {/* Error message */}
        {error && (
          <motion.div
            className={`flex items-center gap-2 mb-4 ${getGlassClass('glass-subtle')}`}
            style={{
              padding: '12px 16px',
              borderLeft: '4px solid #f85149',
              borderRadius: '8px',
              color: 'var(--accent-red)',
              fontSize: '13px',
            }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <motion.span
              animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              ⚠️
            </motion.span> 
            {error}
          </motion.div>
        )}

        {/* Form */}
        <motion.form 
          onSubmit={handleLogin} 
          className="flex flex-col gap-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Phone */}
          <motion.div className="flex flex-col gap-1.5" variants={staggerItem}>
            <label
              className="font-semibold uppercase tracking-wider"
              style={{ fontSize: '11px', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '6px' }}
            >
              Phone Number
            </label>
            <motion.div 
              className={`flex align-stretch overflow-hidden ${getGlassClass('glass-input')}`} 
              style={{ height: '48px', borderRadius: '10px' }}
              whileFocus={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="flex items-center justify-center font-medium shrink-0"
                style={{
                  minWidth: '56px',
                  borderRight: '1px solid var(--glass-border)',
                  padding: '0 12px',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                }}
              >
                +91
              </div>
              <input
                id="phone-input"
                type="tel"
                placeholder="Enter your mobile number"
                value={phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhone(digits);
                }}
                autoFocus
                className="flex-1 outline-none bg-transparent"
                style={{
                  height: '100%',
                  padding: '0 12px',
                  color: 'var(--text-primary)',
                  fontSize: '15px',
                }}
              />
            </motion.div>
          </motion.div>

          {/* Password */}
          <motion.div className="flex flex-col gap-1.5" variants={staggerItem}>
            <label
              htmlFor="password-input"
              className="font-semibold uppercase tracking-wider"
              style={{ fontSize: '11px', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '6px' }}
            >
              Password
            </label>
            <div 
              className="relative"
              style={{ height: '48px' }}
            >
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full h-full outline-none auth-password-input ${getGlassClass('glass-input')}`}
                style={{
                  padding: '0 44px 0 12px',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  fontSize: '15px',
                  backgroundColor: 'transparent',
                }}
              />
              <div 
                className="absolute right-0 top-0 bottom-0 flex items-center justify-center"
                style={{ width: '44px', zIndex: 30 }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowPassword(!showPassword);
                  }}
                  className="flex items-center justify-center p-2 rounded-lg hover:bg-white/10 transition-colors focus:outline-none"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </motion.div>

          {/* CTA Button */}
          <motion.div variants={staggerItem}>
            <AnimatedButton
              id="login-btn"
              type="submit"
              disabled={loading}
              className="w-full font-bold flex items-center justify-center gap-2"
              style={{
                height: '48px',
                borderRadius: '10px',
                border: 'none',
                cursor: loading ? 'wait' : 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                color: '#FFFFFF',
                background: isAdmin
                  ? 'linear-gradient(135deg, #D97706, #B45309)'
                  : 'linear-gradient(135deg, #7C3AED, #4F46E5)',
                boxShadow: isAdmin
                  ? '0 8px 25px rgba(217,119,6,0.25)'
                  : '0 8px 25px var(--accent-purple-glow)',
                opacity: loading ? 0.8 : 1,
              }}
            >
              {loading ? (
                <>
                  <motion.div 
                    className="spinner spinner-sm" 
                    style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Signing in...
                </>
              ) : (
                `Sign In as ${isAdmin ? 'Admin' : 'Worker'}`
              )}
            </AnimatedButton>
          </motion.div>

          {/* Register Link */}
          <motion.div className="text-center mt-2" variants={staggerItem}>
            <AnimatedButton
              type="button"
              onClick={() => navigate('/register')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-purple)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              New worker? Create account →
            </AnimatedButton>
          </motion.div>
        </motion.form>
      </AnimatedCard>
    </AnimatedPage>
  );
}
