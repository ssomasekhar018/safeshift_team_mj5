import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ variant = 'worker' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      style={{
        width: '56px', height: '28px', borderRadius: '14px', padding: '3px',
        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
        background: isDark ? 'linear-gradient(135deg, #0a0e1a, #1a1f35)' : 'linear-gradient(135deg, #87CEEB, #FFF9C4)',
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        position: 'relative', overflow: 'hidden',
        transition: 'background 400ms ease, border-color 400ms ease',
        boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
          : '0 2px 8px rgba(135,206,235,0.4)',
      }}
    >
      {/* Stars (dark mode only) */}
      {isDark && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          boxShadow: `
            10px 5px 0 0.5px rgba(255,255,255,0.8),
            20px 8px 0 0.5px rgba(255,255,255,0.5),
            35px 4px 0 0.5px rgba(255,255,255,0.7),
            28px 14px 0 0.5px rgba(255,255,255,0.4),
            14px 18px 0 0.5px rgba(255,255,255,0.3)
          `,
          borderRadius: '50%', width: '2px', height: '2px',
          background: 'transparent',
          opacity: isDark ? 1 : 0,
          transition: 'opacity 300ms ease',
        }} />
      )}

      {/* Sliding thumb */}
      <div style={{
        width: '22px', height: '22px', borderRadius: '50%',
        background: isDark ? '#1a1f35' : (variant === 'admin' ? '#FCD34D' : '#FCD34D'),
        transform: isDark ? 'translateX(0px)' : 'translateX(28px)',
        transition: 'transform 300ms cubic-bezier(0.34,1.56,0.64,1), background 300ms ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, position: 'relative', zIndex: 1,
        boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.5)' : '0 1px 6px rgba(0,0,0,0.2), 0 0 8px rgba(252,211,77,0.6)',
      }}>
        {isDark ? (
          // Crescent moon SVG
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
              fill="#93C5FD" />
          </svg>
        ) : (
          // Sun SVG with rays
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            style={{ animation: 'spin-once 400ms ease-out' }}>
            <circle cx="12" cy="12" r="4" fill={variant === 'admin' ? '#D97706' : '#F97316'} />
            <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
              stroke={variant === 'admin' ? '#D97706' : '#F97316'} strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </div>
    </button>
  );
}
