import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import AppShell from './components/AppShell';
import ThreeBackground from './components/ThreeBackground';
import { AnimatedPresence } from './components/AnimatedWrapper';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import ConsentScreen from './pages/ConsentScreen';
import WorkerDashboard from './pages/WorkerDashboard';
import PolicyShop from './pages/PolicyShop';
import ClaimHistory from './pages/ClaimHistory';
import PayoutNotification from './pages/PayoutNotification';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import EnhancedGlassDemo from './components/EnhancedGlassDemo';
import { getMe } from './services/api';

// Initialize glassmorphism compatibility system
import './utils/glassmorphismCompat';

// Initialize theme enhancement system
import './utils/themeEnhancer';

function ProtectedRoute({ children, user, requiredRole }) {
  if (!user) return <Navigate to="/" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" replace />;
  return children;
}

/**
 * WorkerShell — Wraps worker pages in the AppShell (PageHeader + BottomTabBar)
 */
function WorkerShell({ children, onLogout }) {
  return (
    <AppShell onLogout={onLogout}>
      {children}
    </AppShell>
  );
}

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('safeshift_token');
    const stored = localStorage.getItem('safeshift_user');
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('safeshift_user', JSON.stringify(userData));
  };

  const handleConsentGiven = () => {
    // Update user state to mark consent as given
    const updatedUser = { ...user, consent_given: true };
    setUser(updatedUser);
    localStorage.setItem('safeshift_user', JSON.stringify(updatedUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('safeshift_token');
    localStorage.removeItem('safeshift_user');
  };

  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <AnimatedPresence mode="wait">
      <Routes location={location} key={location.pathname.split('/')[1] || 'root'}>
        <Route path="/" element={
          user ? (
            <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />
          ) : (
            <Login onLogin={handleLogin} />
          )
        } />
        <Route path="/register" element={<Register onLogin={handleLogin} />} />
        <Route path="/onboarding" element={<Onboarding onLogin={handleLogin} />} />
        <Route path="/consent" element={
          <ProtectedRoute user={user}>
            <ConsentScreen onConsentGiven={handleConsentGiven} user={user} />
          </ProtectedRoute>
        } />

        {/* Worker Routes — wrapped in AppShell */}
        <Route path="/dashboard" element={
          <ProtectedRoute user={user}>
            {user && user.role === 'worker' && !user.consent_given ? (
              <Navigate to="/consent" replace />
            ) : (
              <WorkerShell onLogout={handleLogout}>
                <WorkerDashboard user={user} />
              </WorkerShell>
            )}
          </ProtectedRoute>
        } />
        <Route path="/policies" element={
          <ProtectedRoute user={user}>
            {user && user.role === 'worker' && !user.consent_given ? (
              <Navigate to="/consent" replace />
            ) : (
              <WorkerShell onLogout={handleLogout}>
                <PolicyShop user={user} />
              </WorkerShell>
            )}
          </ProtectedRoute>
        } />
        <Route path="/claims" element={
          <ProtectedRoute user={user}>
            {user && user.role === 'worker' && !user.consent_given ? (
              <Navigate to="/consent" replace />
            ) : (
              <WorkerShell onLogout={handleLogout}>
                <ClaimHistory user={user} />
              </WorkerShell>
            )}
          </ProtectedRoute>
        } />
        <Route path="/payouts" element={
          <ProtectedRoute user={user}>
            {user && user.role === 'worker' && !user.consent_given ? (
              <Navigate to="/consent" replace />
            ) : (
              <WorkerShell onLogout={handleLogout}>
                <PayoutNotification user={user} />
              </WorkerShell>
            )}
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute user={user}>
            <WorkerShell onLogout={handleLogout}>
              <Profile user={user} onLogout={handleLogout} />
            </WorkerShell>
          </ProtectedRoute>
        } />

        {/* Admin Route — no AppShell, admin has its own layout */}
        <Route path="/admin" element={
          <ProtectedRoute user={user} requiredRole="admin">
            <AdminDashboard user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        } />

        {/* Enhanced Glass Demo Route — for development and testing */}
        <Route path="/glass-demo" element={<EnhancedGlassDemo />} />
      </Routes>
    </AnimatedPresence>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <div className="relative min-h-screen">
          {/* Three.js 3D Background */}
          <ThreeBackground />
          
          {/* Application Content */}
          <div className="relative z-10">
            <AppContent />
          </div>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}
