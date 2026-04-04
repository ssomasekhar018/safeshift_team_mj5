import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import WorkerDashboard from './pages/WorkerDashboard';
import PolicyShop from './pages/PolicyShop';
import ClaimHistory from './pages/ClaimHistory';
import PayoutNotification from './pages/PayoutNotification';
import AdminDashboard from './pages/AdminDashboard';
import { getMe } from './services/api';

function Navbar({ user, onLogout }) {
  const location = useLocation();
  const isAdmin = user?.role === 'admin';

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span style={{ fontSize: '1.5rem' }}>🛡️</span>
        <span className="navbar-logo">SafeShift</span>
      </Link>
      <div className="navbar-links">
        {isAdmin ? (
          <>
            <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>Dashboard</Link>
          </>
        ) : (
          <>
            <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>Home</Link>
            <Link to="/policies" className={`nav-link ${location.pathname === '/policies' ? 'active' : ''}`}>Plans</Link>
            <Link to="/claims" className={`nav-link ${location.pathname === '/claims' ? 'active' : ''}`}>Claims</Link>
            <Link to="/payouts" className={`nav-link ${location.pathname === '/payouts' ? 'active' : ''}`}>Payouts</Link>
          </>
        )}
        <button className="nav-link" onClick={onLogout} style={{ color: 'var(--accent-danger)' }}>Logout</button>
      </div>
    </nav>
  );
}

function ProtectedRoute({ children, user, requiredRole }) {
  if (!user) return <Navigate to="/" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
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

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('safeshift_token');
    localStorage.removeItem('safeshift_user');
  };

  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-container">
        {user && <Navbar user={user} onLogout={handleLogout} />}
        <Routes>
          <Route path="/" element={
            user ? (
              <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          } />
          <Route path="/register" element={<Register onLogin={handleLogin} />} />
          <Route path="/onboarding" element={<Onboarding onLogin={handleLogin} />} />
          <Route path="/dashboard" element={
            <ProtectedRoute user={user}><WorkerDashboard user={user} /></ProtectedRoute>
          } />
          <Route path="/policies" element={
            <ProtectedRoute user={user}><PolicyShop user={user} /></ProtectedRoute>
          } />
          <Route path="/claims" element={
            <ProtectedRoute user={user}><ClaimHistory user={user} /></ProtectedRoute>
          } />
          <Route path="/payouts" element={
            <ProtectedRoute user={user}><PayoutNotification user={user} /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute user={user} requiredRole="admin"><AdminDashboard user={user} /></ProtectedRoute>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
