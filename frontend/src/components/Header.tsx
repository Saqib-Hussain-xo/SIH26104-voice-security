import React from 'react';
import { HealthStatus } from '../types';

interface HeaderProps {
  health: HealthStatus | null;
}

export const Header: React.FC<HeaderProps> = ({ health }) => {
  const isHealthy = health?.status === 'healthy';

  return (
    <header className="sutra-header">
      <div className="sutra-brand">
        {/* Exact SUTRA logo image supplied by user */}
        <img
          src="/sutra-logo.jpg"
          alt="SUTRA"
          className="sutra-logo-img"
        />
        <div className="sutra-brand-info">
          <span className="sutra-brand-text">SUTRA</span>
          <span className="sutra-brand-tagline">Ideas, Connected.</span>
        </div>
      </div>

      <div className="sutra-status-pill">
        <span className={`status-indicator-dot ${isHealthy ? '' : 'degraded'}`} />
        <span>{health ? (isHealthy ? 'Models Ready' : 'Degraded Engine') : 'Connecting...'}</span>
      </div>
    </header>
  );
};
