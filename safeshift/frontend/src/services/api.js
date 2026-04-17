import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('safeshift_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response) {
      // Network error — backend not running
      return Promise.reject({ 
        response: { 
          data: { 
            error: 'Cannot connect to server. Is the backend running on port 4000?' 
          } 
        }
      });
    }
    if (err.response?.status === 401) {
      localStorage.removeItem('safeshift_token');
      localStorage.removeItem('safeshift_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────
export const login = (phone, password) => api.post('/auth/login', { phone, password });
export const adminLogin = (phone, password) => api.post('/auth/admin/login', { phone, password });
export const registerWorker = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');
export const verifyEKYC = (aadhaar_last4) => api.post('/auth/ekyc', { aadhaar_last4 });

// ─── Policies ─────────────────────────────────────
export const getQuote = (zone_id) => api.get('/policies/quote', { params: { zone_id } });
export const createPolicy = (tier) => api.post('/policies/create', { tier, payment_ref: `PAY_${Date.now()}` });
export const getActivePolicy = () => api.get('/policies/active');
export const getPolicyHistory = () => api.get('/policies/history');
export const cancelPolicy = (id) => api.post(`/policies/${id}/cancel`);

// ─── Claims ──────────────────────────────────────
export const getMyClaims = () => api.get('/claims/my');
export const getAllClaims = (params) => api.get('/claims/all', { params });
export const reviewClaim = (id, action, notes) => api.post(`/claims/${id}/review`, { action, notes });

// ─── Triggers ─────────────────────────────────────
export const getZones = () => api.get('/triggers/zones');
export const getZoneStatus = (id) => api.get(`/triggers/zone/${id}`);
export const simulateTrigger = (data) => api.post('/triggers/simulate', data);
export const getRecentTriggers = () => api.get('/triggers/recent');
export const checkin = (data) => api.post('/triggers/checkin', data);

// ─── Admin ────────────────────────────────────────
export const getDashboard = () => api.get('/admin/dashboard');
export const getLossRatio = () => api.get('/admin/loss-ratio');
export const getFraudQueue = () => api.get('/admin/fraud-queue');
export const getZoneAnalytics = () => api.get('/admin/zone-analytics');
export const getPayoutTrend = () => api.get('/admin/payout-trend');
export const getTriggerHistory = () => api.get('/admin/trigger-history');

export default api;
