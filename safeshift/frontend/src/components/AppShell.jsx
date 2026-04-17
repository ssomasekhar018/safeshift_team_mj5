import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { useGlassmorphism } from '../hooks/useGlassmorphism';

/**
 * AppShell — PWA mobile-first layout shell
 * Wraps all worker pages with PageHeader + BottomTabBar
 */

const tabs = [
  { path: '/dashboard', label: 'Home',    icon: '🏠' },
  { path: '/policies',  label: 'Plans',   icon: '🛡️' },
  { path: '/claims',    label: 'Claims',  icon: '📋' },
  { path: '/payouts',   label: 'Payouts', icon: '💸' },
  { path: '/profile',   label: 'Profile', icon: '👤' },
];

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/policies':  'Plans',
  '/claims':    'Claims',
  '/payouts':   'Payouts',
  '/profile':   'Profile',
};

export default function AppShell({ children, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { getGlassClass } = useGlassmorphism();
  const currentPath = location.pathname;
  const pageTitle = pageTitles[currentPath] || 'SafeShift';

  useEffect(() => {
    // Add PWA class to body when in Worker portal
    document.body.classList.add('pwa-mode');
    return () => {
      document.body.classList.remove('pwa-mode');
    };
  }, []);

  // Page Content — scrollable area (disabled for strict PWA instruction)
  const isPWA = typeof document !== 'undefined' && document.body.classList.contains('pwa-mode');

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Safe area top */}
      <div className="safe-area-top shrink-0" />

      {/* Page Header — 48px sticky */}
      <header
        className={`sticky top-0 z-50 flex items-center justify-between px-4 shrink-0 ${getGlassClass('glass-navigation')}`}
        style={{
          height: '48px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          {/* Shield Icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
              fill="var(--accent-purple)"
              opacity="0.9"
            />
            <path
              d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
              fill="url(#shieldGrad)"
            />
            <defs>
              <linearGradient id="shieldGrad" x1="3" y1="2" x2="21" y2="19">
                <stop offset="0%" stopColor="var(--accent-purple)" />
                <stop offset="100%" stopColor="var(--accent-blue)" />
              </linearGradient>
            </defs>
          </svg>
          <span
            className="font-semibold"
            style={{ fontSize: '16px', color: 'var(--text-primary)' }}
          >
            SafeShift
          </span>
        </div>

        {/* Center: Page Title */}
        <span
          className="font-bold absolute left-1/2 -translate-x-1/2"
          style={{ fontSize: '16px', color: 'var(--text-primary)' }}
        >
          {pageTitle}
        </span>

        {/* Right: Theme Toggle */}
        <ThemeToggle />
      </header>

      {/* Page Content area */}
      <main
        className="flex-1 relative pb-24 overflow-y-auto scroll-container"
        style={{ WebkitOverflowScrolling: isPWA ? 'none' : 'touch' }}
      >
        {children}
      </main>

      {/* Bottom Tab Bar — 64px fixed */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-50 safe-area-bottom ${getGlassClass('glass-tab-bar')}`}
        style={{
          height: '64px',
          borderTop: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center justify-around h-full max-w-lg mx-auto px-2">
          {tabs.map((tab) => {
            const isActive = currentPath === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => {
                  navigate(tab.path);
                }}
                className="flex flex-col items-center justify-center relative"
                style={{
                  minWidth: '48px',
                  minHeight: '48px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  transition: 'all 150ms ease',
                }}
              >
                {/* Active indicator pill */}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-1px',
                      width: '24px',
                      height: '3px',
                      borderRadius: '0 0 3px 3px',
                      background: 'var(--accent-purple)',
                    }}
                  />
                )}

                {/* Icon */}
                <span
                  style={{
                    fontSize: '20px',
                    lineHeight: '24px',
                    transition: 'transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transform: isActive ? 'scale(1.15)' : 'scale(1)',
                    animation: isActive ? 'tabBounce 300ms ease' : 'none',
                  }}
                >
                  {tab.icon}
                </span>

                {/* Label */}
                <span
                  className="font-semibold"
                  style={{
                    fontSize: '10px',
                    lineHeight: '14px',
                    marginTop: '2px',
                    color: isActive ? 'var(--accent-purple)' : 'var(--text-muted)',
                    transition: 'color 150ms ease',
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
