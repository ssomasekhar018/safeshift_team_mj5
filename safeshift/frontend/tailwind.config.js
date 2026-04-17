/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        'ss-base':      'var(--bg-base)',
        'ss-surface':   'var(--bg-surface)',
        'ss-elevated':  'var(--bg-elevated)',
        'ss-overlay':   'var(--bg-overlay)',
        'ss-border':    'var(--border)',
        'ss-border-br': 'var(--border-bright)',
        'ss-purple':    'var(--accent-purple)',
        'ss-purple-br': 'var(--accent-purple-bright)',
        'ss-green':     'var(--accent-green)',
        'ss-amber':     'var(--accent-amber)',
        'ss-red':       'var(--accent-red)',
        'ss-blue':      'var(--accent-blue)',
        'ss-primary':   'var(--text-primary)',
        'ss-secondary': 'var(--text-secondary)',
        'ss-muted':     'var(--text-muted)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'glow': 'var(--shadow-glow)',
        'glass': 'var(--glass-shadow)',
        'glass-strong': 'var(--glass-shadow-strong)',
        'glass-subtle': 'var(--glass-shadow-subtle)',
        'glass-intense': 'var(--glass-shadow-intense)',
      },
      backdropBlur: {
        'glass': 'var(--glass-blur)',
        'glass-strong': 'var(--glass-blur-strong)',
        'glass-subtle': 'var(--glass-blur-subtle)',
        'glass-intense': 'var(--glass-blur-intense)',
      },
      backgroundColor: {
        'glass': 'var(--glass-bg)',
        'glass-strong': 'var(--glass-bg-strong)',
        'glass-subtle': 'var(--glass-bg-subtle)',
        'glass-intense': 'var(--glass-bg-intense)',
        'glass-fallback': 'var(--glass-fallback-bg)',
        'glass-perf': 'var(--glass-perf-bg)',
      },
      borderColor: {
        'glass': 'var(--glass-border)',
        'glass-strong': 'var(--glass-border-strong)',
        'glass-subtle': 'var(--glass-border-subtle)',
        'glass-fallback': 'var(--glass-fallback-border)',
      },
    },
  },
  plugins: [],
}
