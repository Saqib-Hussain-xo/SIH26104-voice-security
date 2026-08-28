import React from 'react';
import { Shield, Server, CheckCircle2, AlertTriangle } from 'lucide-react';
import { HealthStatus } from '../types';

interface HeaderProps {
  health: HealthStatus | null;
}

export const Header: React.FC<HeaderProps> = ({ health }) => {
  const isHealthy = health?.status === 'healthy';

  return (
    <header className="app-header">
      <div className="logo-section">
        <Shield className="logo-icon" />
        <div>
          <h1 className="app-title">SIH26104 Voice Security</h1>
          <p className="app-subtitle">Real-Time Detection and Prevention of Voice Cloning Impersonation</p>
        </div>
      </div>

      <div className={`status-badge ${isHealthy ? '' : 'degraded'}`}>
        <span className="status-dot"></span>
        <span>
          {health
            ? `Backend ${health.status.toUpperCase()} | AASIST ${health.spoof_detector_loaded ? 'Active' : 'Offline'}`
            : 'Connecting...'}
        </span>
      </div>
    </header>
  );
};
