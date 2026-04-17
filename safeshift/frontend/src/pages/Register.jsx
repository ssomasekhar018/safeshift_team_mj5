import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Shield, User, Phone, Lock, Wallet, ChevronDown, Clock, CheckCircle } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import ThreeBackground from '../components/ThreeBackground';
import { api } from '../services/api';
import { useGlassmorphism } from '../hooks/useGlassmorphism';
import { AnimatedPage, AnimatedCard, AnimatedButton, AnimatedText, AnimatedList, AnimatedListItem } from '../components/AnimatedWrapper';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '../utils/animations';

// Password strength utility
const getStrength = (pwd) => {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
};

const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-green-500'];
const strengthText  = ['', 'text-red-400', 'text-amber-400', 'text-blue-400', 'text-green-400'];

const PLATFORMS = ['zepto', 'blinkit', 'swiggy_instamart', 'bigbasket_bb_now', 'dunzo', 'other'];
const ZONES = [
  { id: 'KOR-4B', name: 'Koramangala (KOR-4B)' },
  { id: 'HSR-2A', name: 'HSR Layout (HSR-2A)' },
  { id: 'INR-1C', name: 'Indiranagar (INR-1C)' },
  { id: 'WHF-3D', name: 'Whitefield (WHF-3D)' },
  { id: 'ELC-5E', name: 'Electronic City (ELC-5E)' },
  { id: 'MRT-6F', name: 'Marathahalli (MRT-6F)' },
  { id: 'JAY-7G', name: 'Jayanagar (JAY-7G)' },
  { id: 'BTM-8H', name: 'BTM Layout (BTM-8H)' },
];

// ── FIELD COMPONENT — Defined OUTSIDE render to prevent re-mount on state change ──
const Field = React.memo(({ label, icon: Icon, error: ferr, children }) => (
  <div style={{ marginBottom: '20px' }}>
    <label className="block font-semibold uppercase tracking-wider" style={{ 
      fontSize: '11px', 
      letterSpacing: '0.08em', 
      color: 'var(--text-secondary)', 
      marginBottom: '6px' 
    }}>
      {label}
    </label>
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
      )}
      {children}
    </div>
    {ferr && (
      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
        <span>⚠</span> {ferr}
      </p>
    )}
  </div>
));
Field.displayName = 'Field';

// ── INPUT CLASS HELPER — Defined outside render ──
const getInputClass = (fieldErrors, fieldName, hasIcon = true) =>
  `w-full ${hasIcon ? 'pl-10' : 'pl-4'} pr-4 rounded-xl text-sm
  bg-[var(--bg-elevated)] border text-[var(--text-primary)]
  placeholder-[var(--text-muted)] transition-all duration-200 outline-none
  ${fieldErrors[fieldName]
    ? 'border-red-500 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]'
    : 'border-[var(--border)] focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]'
  }` + ' h-12';

export default function Register() {
  const navigate = useNavigate();
  const { getGlassClass, getGlassStyle } = useGlassmorphism();
  
  React.useEffect(() => {
    // Register is worker-only, always use PWA mode
    document.body.classList.add('pwa-mode');
    return () => document.body.classList.remove('pwa-mode');
  }, []);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [success, setSuccess]           = useState(false);
  const [error, setError]               = useState('');
  const [fieldErrors, setFieldErrors]   = useState({});
  const [form, setForm] = useState({
    name: '', phone: '', password: '', confirmPassword: '',
    platform: 'zepto', zone_id: 'KOR-4B',
    shift_start: '06:00', shift_end: '22:00', upi_id: '',
  });

  const strength = getStrength(form.password);

  // Stable onChange handler using useCallback — functional state updates
  const handleChange = useCallback((field) => (e) => {
    const value = e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
    setError('');
  }, []);

  // Separate phone handler — strips non-digits, limits to 10
  const handlePhoneChange = useCallback((e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm(prev => ({ ...prev, phone: digits }));
    setFieldErrors(prev => ({ ...prev, phone: '' }));
    setError('');
  }, []);

  const validate = () => {
    const errs = {};
    if (!form.name.trim() || form.name.length < 2) errs.name = 'Full name required (min 2 chars)';
    if (!/^[6-9]\d{9}$/.test(form.phone)) errs.phone = 'Valid 10-digit Indian mobile number required';
    if (strength < 4) errs.password = 'Password must include uppercase, number, and special character';
    if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your password';
    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match exactly';
    }
    if (!form.upi_id || !/^[\w.\-]+@[\w.\-]+$/.test(form.upi_id)) errs.upi_id = 'Valid UPI ID required (e.g. name@upi)';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }

    setLoading(true);
    try {
      // Strip +91 prefix and send only 10-digit number
      const phoneNumber = form.phone.replace(/^\+?91/, '').slice(-10);
      
      const res = await api.post('/auth/register', {
        name: form.name.trim(),
        phone: phoneNumber,
        password: form.password,
        platform: form.platform,
        zone_id: form.zone_id,
        zone_pincode: '560034',
        shift_start: form.shift_start,
        shift_end: form.shift_end,
        upi_id: form.upi_id,
      });

      // Handle successful registration: store token and user
      const { token, role, worker } = res.data;
      if (token) {
        localStorage.setItem('safeshift_token', token);
        const userData = { role, phone: phoneNumber, token, ...(worker || {}) };
        localStorage.setItem('safeshift_user', JSON.stringify(userData));
        onLogin(userData);
      }

      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 3000);
    } catch (err) {
      // Log full error response to console
      console.error('Registration error:', err.response || err);
      
      const serverErrors = err.response?.data?.errors;
      if (serverErrors && Array.isArray(serverErrors)) {
        const newFieldErrors = {};
        serverErrors.forEach(e => {
          newFieldErrors[e.field] = e.message;
        });
        setFieldErrors(newFieldErrors);
        setError('Please fix the errors below.');
      } else {
        // Show specific error messages
        const errorMsg = err.response?.data?.error;
        if (errorMsg?.includes('phone') || errorMsg?.includes('already') || err.response?.status === 409) {
          setError('Phone number already registered. Try logging in instead.');
        } else if (errorMsg?.includes('server') || errorMsg?.includes('database')) {
          setError('Server error. Please try again later.');
        } else if (!err.response) {
          setError('Cannot connect to server. Proceeding in demo mode...');
          
          // Fallback: store user in localStorage as mock and proceed
          const mockUser = {
            name: form.name.trim(),
            phone: form.phone,
            platform: form.platform,
            city: 'Delhi',
            role: 'worker',
            consent_given: true,
            demo_mode: true
          };
          localStorage.setItem('safeshift_token', 'demo_token_' + Date.now());
          localStorage.setItem('safeshift_user', JSON.stringify(mockUser));
          
          setSuccess(true);
          setTimeout(() => navigate('/dashboard'), 2000);
        } else {
          setError(errorMsg || 'Registration failed. Please check your details and try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // ── SUCCESS SCREEN ──────────────────────────────────
  if (success) return (
    <AnimatedPage className="min-h-screen flex items-center justify-center px-4">
      {/* Three.js 3D Background */}
      <ThreeBackground />
      
      <AnimatedCard className="text-center max-w-sm relative z-10" delay={0.2}>
        <motion.div 
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{
            background: 'rgba(63, 185, 80, 0.2)',
            border: '2px solid #3fb950'
          }}
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          <CheckCircle className="w-10 h-10" style={{ color: '#3fb950' }} />
        </motion.div>
        <AnimatedText 
          className="text-2xl font-bold text-[var(--text-primary)] mb-2"
          type="slideUp"
          delay={0.3}
        >
          Account Created!
        </AnimatedText>
        <AnimatedText 
          className="text-[var(--text-secondary)] text-sm mb-6"
          type="fadeIn"
          delay={0.4}
        >
          Your SafeShift protection is now active.
        </AnimatedText>
        <div className="w-full bg-[var(--bg-elevated)] rounded-full h-1.5">
          <motion.div 
            className="h-1.5 rounded-full"
            style={{ 
              background: '#3fb950',
              transformOrigin: 'left' 
            }}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 3, ease: "linear" }}
          />
        </div>
        <AnimatedText 
          className="text-xs text-[var(--text-muted)] mt-2"
          type="fadeIn"
          delay={0.5}
        >
          Redirecting to dashboard...
        </AnimatedText>
      </AnimatedCard>
    </AnimatedPage>
  );

  const inputClass = (fieldName, hasIcon = true) => getInputClass(fieldErrors, fieldName, hasIcon);

  // ── MAIN RENDER ─────────────────────────────────────
  return (
    <AnimatedPage className="min-h-screen relative overflow-hidden flex items-start justify-center py-8 px-4">
      {/* Three.js 3D Background */}
      <ThreeBackground />
      
      {/* Theme toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <motion.div 
          className="text-center" 
          style={{ marginBottom: '24px' }}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600"
            style={{ 
              marginBottom: '24px',
              boxShadow: '0 0 30px rgba(124,58,237,0.4)'
            }}
            variants={staggerItem}
            whileHover={{ 
              scale: 1.1, 
              rotate: 5,
              boxShadow: '0 0 40px rgba(124,58,237,0.6)'
            }}
            animate={{
              boxShadow: [
                '0 0 30px rgba(124,58,237,0.4)',
                '0 0 40px rgba(124,58,237,0.6)',
                '0 0 30px rgba(124,58,237,0.4)'
              ]
            }}
            transition={{
              boxShadow: { duration: 3, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            <Shield className="w-7 h-7 text-white" />
          </motion.div>
          <AnimatedText 
            className="text-2xl font-bold text-[var(--text-primary)]"
            type="slideUp"
            delay={0.2}
          >
            SafeShift
          </AnimatedText>
          <AnimatedText 
            className="text-sm text-[var(--text-secondary)] mt-1 italic"
            type="fadeIn"
            delay={0.3}
          >
            Create your income protection account
          </AnimatedText>
        </motion.div>

        {/* Progress steps — visual only */}
        <motion.div 
          className="flex items-center justify-center gap-2 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {['Account', 'Coverage', 'Verify'].map((step, i) => (
            <React.Fragment key={step}>
              <motion.div 
                className="flex items-center gap-1.5"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
              >
                <motion.div 
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${i === 0 ? 'bg-purple-600 text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)]'}`}
                  animate={i === 0 ? {
                    boxShadow: [
                      '0 0 10px rgba(124,58,237,0.5)',
                      '0 0 20px rgba(124,58,237,0.8)',
                      '0 0 10px rgba(124,58,237,0.5)'
                    ]
                  } : {}}
                  transition={i === 0 ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
                >
                  {i + 1}
                </motion.div>
                <span className={`text-xs font-medium hidden sm:block
                  ${i === 0 ? 'text-purple-400' : 'text-[var(--text-muted)]'}`}>
                  {step}
                </span>
              </motion.div>
              {i < 2 && (
                <motion.div 
                  className="w-8 h-px bg-[var(--border)]"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.6 + i * 0.1, duration: 0.3 }}
                />
              )}
            </React.Fragment>
          ))}
        </motion.div>

        {/* Form card */}
        <AnimatedCard className={getGlassClass('glass-form')} style={{ padding: '24px' }} delay={0.6}>
          {/* Global error banner */}
          {error && (
            <motion.div 
              className="flex items-center gap-2" 
              style={{ 
                marginBottom: '16px', 
                padding: '12px 16px', 
                borderRadius: '8px', 
                background: 'rgba(248, 81, 73, 0.1)', 
                borderLeft: '4px solid #f85149' 
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <motion.span 
                className="text-red-400 text-sm"
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              >
                ⚠
              </motion.span>
              <p className="text-sm text-red-400">{error}</p>
            </motion.div>
          )}

          <motion.form 
            onSubmit={handleSubmit} 
            noValidate
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {/* SECTION: Personal Details */}
            <motion.div variants={staggerItem}>
              <p className="font-semibold uppercase tracking-widest" style={{ 
                fontSize: '10px', 
                color: 'var(--text-muted)', 
                marginBottom: '12px' 
              }}>Personal Details</p>
            </motion.div>

            <motion.div variants={staggerItem}>
              <Field label="Full Name" icon={User} error={fieldErrors.name}>
                <motion.input
                  type="text" value={form.name} onChange={handleChange('name')}
                  placeholder="Ravi Kumar"
                  className={inputClass('name')}
                  whileFocus={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                />
              </Field>
            </motion.div>

            <motion.div variants={staggerItem}>
              <Field label="Phone Number" icon={Phone} error={fieldErrors.phone}>
                <motion.div 
                  className="flex align-stretch overflow-hidden" 
                  style={{ height: '48px', borderRadius: '10px', border: `1px solid ${fieldErrors.phone ? '#ef4444' : 'var(--border)'}` }}
                  whileFocus={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center font-semibold" style={{
                    minWidth: '56px',
                    borderRight: '1px solid var(--border)',
                    padding: '0 12px',
                    background: 'var(--bg-overlay)',
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    +91
                  </div>
                  <input
                    type="tel" value={form.phone} onChange={handlePhoneChange}
                    placeholder="98765 43210" maxLength={10}
                    className="flex-1 outline-none"
                    style={{
                      height: '100%',
                      padding: '0 12px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                  />
                </motion.div>
              </Field>
            </motion.div>

            {/* SECTION: Security */}
            <motion.div variants={staggerItem}>
              <p className="font-semibold uppercase tracking-widest" style={{ 
                fontSize: '10px', 
                color: 'var(--text-muted)', 
                marginBottom: '12px',
                marginTop: '20px'
              }}>Security</p>
            </motion.div>

            <motion.div variants={staggerItem}>
              <Field label="Password" icon={Lock} error={fieldErrors.password}>
                <div 
                  className="relative"
                  style={{ height: '48px' }}
                >
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password} onChange={handleChange('password')}
                    placeholder="Min 8 characters"
                    className={`${inputClass('password')} auth-password-input h-full`}
                    style={{ paddingRight: '44px', backgroundColor: 'transparent' }}
                  />
                  <div 
                    className="absolute right-0 top-0 bottom-0 flex items-center justify-center"
                    style={{ width: '44px', zIndex: 30 }}
                  >
                    <AnimatedButton 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowPassword(v => !v);
                      }}
                      className="flex items-center justify-center p-2 rounded-lg hover:bg-white/5 transition-colors"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                      }}
                    >
                      {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </AnimatedButton>
                  </div>
                </div>

                {/* Strength bar */}
                {form.password.length > 0 && (
                  <motion.div 
                    className="mt-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4].map(i => (
                        <motion.div 
                          key={i}
                          className={`flex-1 rounded-full transition-all duration-300
                            ${i <= strength ? strengthColor[strength] : 'bg-[var(--bg-overlay)]'}`}
                          style={{ height: '4px', borderRadius: '2px' }}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: i <= strength ? 1 : 0.3 }}
                          transition={{ delay: i * 0.1, duration: 0.3 }}
                        />
                      ))}
                    </div>
                    <motion.p 
                      className={`text-xs text-right ${strengthText[strength]}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      {strengthLabel[strength]}
                    </motion.p>

                    {/* Rules tooltip */}
                    <motion.div 
                      className="mt-2 p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] space-y-1"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.3 }}
                    >
                      {[
                        [form.password.length >= 8,    'At least 8 characters'],
                        [/[A-Z]/.test(form.password),  'One uppercase letter'],
                        [/[0-9]/.test(form.password),  'One number'],
                        [/[^A-Za-z0-9]/.test(form.password), 'One special character'],
                      ].map(([ok, rule], idx) => (
                        <motion.div 
                          key={rule} 
                          className="flex items-center" 
                          style={{ gap: '6px', fontSize: '12px' }}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + idx * 0.1, duration: 0.2 }}
                        >
                          <motion.span 
                            className={ok ? 'text-green-400' : 'text-[var(--text-muted)]'}
                            animate={ok ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ duration: 0.3 }}
                          >
                            {ok ? '✓' : '○'}
                          </motion.span>
                          <span className={`${ok ? 'text-green-400' : 'text-[var(--text-muted)]'}`}>
                            {rule}
                          </span>
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.div>
                )}
              </Field>
            </motion.div>

            <motion.div variants={staggerItem}>
              <Field label="Confirm Password" icon={Lock} error={fieldErrors.confirmPassword}>
                <div 
                  className="relative"
                  style={{ height: '48px' }}
                >
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmPassword} onChange={handleChange('confirmPassword')}
                    placeholder="Repeat password"
                    className={`${inputClass('confirmPassword')} auth-password-input h-full`}
                    style={{ paddingRight: '44px', backgroundColor: 'transparent' }}
                  />
                  <div 
                    className="absolute right-0 top-0 bottom-0 flex items-center justify-center"
                    style={{ width: '44px', zIndex: 30 }}
                  >
                    <AnimatedButton 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowConfirm(v => !v);
                      }}
                      className="flex items-center justify-center p-2 rounded-lg hover:bg-white/5 transition-colors"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                      }}
                    >
                      {showConfirm ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </AnimatedButton>
                  </div>
                </div>
              </Field>
            </motion.div>

            {/* SECTION: Work Details */}
            <motion.div variants={staggerItem}>
              <p className="font-semibold uppercase tracking-widest" style={{ 
                fontSize: '10px', 
                color: 'var(--text-muted)', 
                marginBottom: '12px',
                marginTop: '20px'
              }}>Work Details</p>
            </motion.div>

            {/* Platform */}
            <motion.div className="mb-4" variants={staggerItem}>
              <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Platform</label>
              <div className="relative">
                <motion.select 
                  value={form.platform} 
                  onChange={handleChange('platform')}
                  className="w-full h-12 pl-4 pr-10 rounded-xl text-sm appearance-none
                    bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] outline-none cursor-pointer
                    focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]
                    transition-all duration-200"
                  whileFocus={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  {PLATFORMS.map(p => (
                    <option key={p} value={p} className="bg-[var(--bg-elevated)] capitalize">
                      {p.replace(/_/g, ' ')}
                    </option>
                  ))}
                </motion.select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </motion.div>

            {/* Zone */}
            <motion.div className="mb-4" variants={staggerItem}>
              <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Zone</label>
              <div className="relative">
                <motion.select 
                  value={form.zone_id} 
                  onChange={handleChange('zone_id')}
                  className="w-full h-12 pl-4 pr-10 rounded-xl text-sm appearance-none
                    bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] outline-none cursor-pointer
                    focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]
                    transition-all duration-200"
                  whileFocus={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  {ZONES.map(z => (
                    <option key={z.id} value={z.id} className="bg-[var(--bg-elevated)]">
                      {z.name}
                    </option>
                  ))}
                </motion.select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </motion.div>

            {/* Shift times */}
            <motion.div className="grid grid-cols-2 gap-3 mb-4" variants={staggerItem}>
              {[
                ['shift_start','Shift Start','06:00'],
                ['shift_end',  'Shift End',  '22:00']
              ].map(([field, label, def], idx) => (
                <motion.div 
                  key={field}
                  initial={{ opacity: 0, x: idx === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + idx * 0.1, duration: 0.3 }}
                >
                  <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">{label}</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                    <motion.input 
                      type="time" 
                      value={form[field]} 
                      onChange={handleChange(field)}
                      className="w-full h-12 pl-9 pr-3 rounded-xl text-sm
                        bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] outline-none
                        focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]
                        transition-all duration-200 [color-scheme:dark]"
                      whileFocus={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* UPI ID */}
            <motion.div variants={staggerItem}>
              <Field label="UPI ID (for payouts)" icon={Wallet} error={fieldErrors.upi_id}>
                <motion.input
                  type="text" value={form.upi_id} onChange={handleChange('upi_id')}
                  placeholder="yourname@upi"
                  className={inputClass('upi_id')}
                  whileFocus={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                />
                <motion.p 
                  className="text-xs text-[var(--text-muted)] mt-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  💳 Payouts will be credited instantly to this UPI ID
                </motion.p>
              </Field>
            </motion.div>

            {/* CTA Button */}
            <motion.div variants={staggerItem}>
              <AnimatedButton 
                type="submit" 
                disabled={loading}
                className="w-full flex items-center justify-center gap-2"
                style={{
                  height: '48px',
                  marginTop: '8px',
                  borderRadius: '10px',
                  fontWeight: '600',
                  fontSize: '14px',
                  color: 'white',
                  background: 'linear-gradient(to right, #7c3aed, #4f46e5)',
                  boxShadow: '0 8px 25px rgba(124,58,237,0.35)',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                {loading ? (
                  <>
                    <motion.div 
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    Creating your account...
                  </>
                ) : (
                  <>
                    <Shield size={18} />
                    Create Account & Activate SafeShift
                  </>
                )}
              </AnimatedButton>
            </motion.div>
          </motion.form>

          <motion.p 
            className="text-center text-xs text-[var(--text-secondary)] mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.3 }}
          >
            Already have an account?{' '}
            <Link to="/" className="text-purple-400 hover:underline font-medium">Sign in →</Link>
          </motion.p>
        </AnimatedCard>
      </div>
    </AnimatedPage>
  );
}
