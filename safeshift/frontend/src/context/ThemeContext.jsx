import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

/**
 * ThemeProvider — Manages dark/light mode via 'data-theme' attribute on <html>
 * Persists choice in localStorage. Defaults to dark.
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('safeshift_theme');
    return stored || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    // Use data-theme attribute for CSS variable switching
    root.setAttribute('data-theme', theme);
    // Also keep class for Tailwind compatibility
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    localStorage.setItem('safeshift_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
