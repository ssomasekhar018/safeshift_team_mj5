import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, MapPin, CreditCard, Activity, CheckCircle, AlertTriangle } from 'lucide-react';
import { useGlassmorphism } from '../hooks/useGlassmorphism';
import { api } from '../services/api';

export default function ConsentScreen({ onConsentGiven, user }) {
  const { getGlassClass } = useGlassmorphism();
  const navigate = useNavigate();
  const [consents, setConsents] = useState({
    gps_location: false,
    bank_upi: false,
    platform_activity: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const consentItems = [
    {
      key: 'gps_location',
      icon: MapPin,
      title: 'GPS Location Data',
      description: 'To verify you are in the trigger zone during a disruption event',
      details: 'We collect your GPS coordinates only when you submit a claim to verify you were in the affected zone during the weather/AQI event.',
      required: true,
    },
    {
      key: 'bank_upi',
      icon: CreditCard,
      title: 'Bank/UPI Account Information',
      description: 'To send payout directly to your wallet',
      details: 'Your UPI ID is used exclusively for instant payout processing. We do not store banking credentials or transaction history.',
      required: true,
    },
    {
      key: 'platform_activity',
      icon: Activity,
      title: 'Platform Activity Data',
      description: 'To confirm you were on an active delivery shift',
      details: 'We verify your shift status and delivery activity to ensure claims are legitimate. This includes shift timings and active delivery status.',
      required: true,
    },
  ];

  const allConsentsGiven = Object.values(consents).every(Boolean);

  const handleConsentChange = (key) => {
    setConsents(prev => ({ ...prev, [key]: !prev[key] }));
    setError('');
  };

  const handleSubmit = async () => {
    if (!allConsentsGiven) {
      setError('All consents are required to use SafeShift services');
      return;
    }

    setLoading(true);
    try {
      // Store consent in backend
      await api.post('/auth/consent', {
        consents,
        timestamp: new Date().toISOString(),
      });

      onConsentGiven();
      // Navigate to dashboard after state update
      setTimeout(() => navigate('/dashboard'), 100);
    } catch (err) {
      setError('Failed to save consent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 mb-4 shadow-[0_0_30px_rgba(124,58,237,0.4)]">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Data Privacy Consent</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            As per Digital Personal Data Protection Act 2023
          </p>
        </div>

        {/* Consent Card */}
        <div className={`${getGlassClass('glass-form')} rounded-3xl p-6 border border-[var(--border)] shadow-[var(--shadow-card)]`}>
          {/* Welcome message */}
          <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <p className="text-sm text-blue-400">
              <strong>Welcome, {user?.name || 'Worker'}!</strong> To activate your SafeShift protection, 
              we need your explicit consent for the following data processing activities:
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Consent Items */}
          <div className="space-y-4 mb-6">
            {consentItems.map((item) => {
              const Icon = item.icon;
              const isChecked = consents[item.key];
              
              return (
                <div key={item.key} className="border border-[var(--border)] rounded-xl p-4 hover:border-purple-500/50 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleConsentChange(item.key)}
                      className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                        ${isChecked 
                          ? 'bg-purple-600 border-purple-600' 
                          : 'border-[var(--border)] hover:border-purple-500'
                        }`}
                    >
                      {isChecked && <CheckCircle className="w-3 h-3 text-white" />}
                    </button>

                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-purple-400" />
                        <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                          {item.title}
                          {item.required && <span className="text-red-400 ml-1">*</span>}
                        </h3>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-[var(--text-secondary)] mb-2">
                        {item.description}
                      </p>

                      {/* Details */}
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        {item.details}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legal Notice */}
          <div className="mb-6 p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
            <h4 className="font-semibold text-[var(--text-primary)] text-sm mb-2">Your Rights</h4>
            <ul className="text-xs text-[var(--text-muted)] space-y-1">
              <li>• You can withdraw consent at any time by contacting support</li>
              <li>• Data is processed only for insurance claim verification</li>
              <li>• Data is not shared with third parties except payment processors</li>
              <li>• You can request data deletion after policy termination</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex-1 h-12 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-elevated)] transition-colors"
            >
              Go Back
            </button>
            
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!allConsentsGiven || loading}
              className={`flex-1 h-12 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2
                ${allConsentsGiven && !loading
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-[0_8px_25px_rgba(124,58,237,0.35)] hover:-translate-y-0.5'
                  : 'bg-gray-500 cursor-not-allowed opacity-70'
                }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Activate SafeShift
                </>
              )}
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-[var(--text-muted)] mt-4">
            By proceeding, you agree to our{' '}
            <a href="#" className="text-purple-400 hover:underline">Privacy Policy</a>
            {' '}and{' '}
            <a href="#" className="text-purple-400 hover:underline">Terms of Service</a>
          </p>
        </div>
      </div>
    </div>
  );
}