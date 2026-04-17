import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlassmorphism } from '../hooks/useGlassmorphism';
import { AnimatedPage, AnimatedCard, AnimatedButton, AnimatedText } from '../components/AnimatedWrapper';
import { motion } from 'framer-motion';

export default function Profile({ user, onLogout }) {
  const { getGlassClass } = useGlassmorphism();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <AnimatedPage className={`px-4 py-5 max-w-lg mx-auto flex flex-col gap-5 ${getGlassClass('glass-bg')}`}>
      {/* Profile Header */}
      <AnimatedCard 
        className={`rounded-2xl p-6 text-center ${getGlassClass('glass-card')}`}
        style={{
          background: 'var(--gradient-hero)',
          boxShadow: 'var(--shadow-glow)',
        }}
        delay={0.1}
      >
        <div 
          className="mx-auto mb-4 flex items-center justify-center rounded-full bg-white/10"
          style={{ width: '80px', height: '80px', fontSize: '40px' }}
        >
          {user.role === 'admin' ? '👨‍💼' : '👷‍♂️'}
        </div>
        <AnimatedText 
          className="font-bold mb-1" 
          style={{ fontSize: '24px', color: 'var(--text-primary)' }}
        >
          {user.name}
        </AnimatedText>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          {user.phone} · {user.role?.toUpperCase()}
        </p>
      </AnimatedCard>

      {/* Account Info */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold px-1" style={{ fontSize: '15px', color: 'var(--text-primary)' }}>Account Settings</h3>
        
        <AnimatedCard className={`rounded-2xl p-4 flex items-center gap-3 ${getGlassClass('glass-list-item')}`} delay={0.2}>
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">📍</div>
          <div className="flex-1">
            <div className="font-bold" style={{ fontSize: '14px' }}>Zone ID</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.zone_id || 'KOR-4B'}</div>
          </div>
        </AnimatedCard>

        <AnimatedCard className={`rounded-2xl p-4 flex items-center gap-3 ${getGlassClass('glass-list-item')}`} delay={0.3}>
          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">📱</div>
          <div className="flex-1">
            <div className="font-bold" style={{ fontSize: '14px' }}>Device Hash</div>
            <div className="truncate w-40" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.device_hash || 'Unknown'}</div>
          </div>
        </AnimatedCard>
      </div>

      {/* Danger Zone */}
      <div className="mt-4 flex flex-col gap-3">
        <AnimatedButton
          onClick={() => {
            if (onLogout) onLogout();
            navigate('/');
          }}
          className="w-full font-bold"
          style={{
            height: '52px',
            borderRadius: '16px',
            background: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--accent-red)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            fontSize: '15px'
          }}
        >
          Log Out
        </AnimatedButton>
      </div>

      <div className="text-center py-4">
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          SafeShift v1.0.0 · Beta
        </p>
      </div>
    </AnimatedPage>
  );
}
