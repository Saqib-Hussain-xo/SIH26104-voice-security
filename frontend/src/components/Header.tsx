import React from 'react';
import { ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';
import { HealthStatus } from '../types';

interface HeaderProps {
  health: HealthStatus | null;
}

export const Header: React.FC<HeaderProps> = ({ health }) => {
  const isHealthy = health?.status === 'healthy';

  return (
    <header className="app-header">
      <div className="logo-section">
        <div className="logo-icon-badge">
          <ShieldCheck size={22} />
        </div>
        <div className="app-title-group">
          <div className="app-title">
            VOICE DEFENDER <span className="app-tag">SIH26104</span>
          </div>
          <p className="app-subtitle">Real-Time Voice Anti-Spoofing & Impersonation Analysis Platform</p>
        </div>
      </div>

      <div className={`status-badge ${isHealthy ? '' : 'degraded'}`}>
        <span className="status-dot"></span>
        <span>
          {health
            ? `ENGINE ${health.status.toUpperCase()} | AASIST ${health.spoof_detector_loaded ? 'READY' : 'OFFLINE'} | ECAPA ${health.speaker_verifier_loaded ? 'READY' : 'STANDBY'}`
            : 'ESTABLISHING LINK...'}
        </span>
      </div>
    </header>
  );
};
