import React from 'react';
import { Database, RefreshCw, FileAudio } from 'lucide-react';
import { ReportSummary } from '../types';

interface ReportHistoryProps {
  reports: ReportSummary[];
  loading: boolean;
  onRefresh: () => void;
}

export const ReportHistory: React.FC<ReportHistoryProps> = ({ reports, loading, onRefresh }) => {
  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 className="card-title" style={{ margin: 0 }}>
          <Database size={17} style={{ color: 'var(--color-primary)' }} />
          Security Incident & Audit Trail (SQLite)
        </h3>
        <button
          className="btn btn-outline"
          onClick={onRefresh}
          disabled={loading}
          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {loading ? 'SYNCING...' : 'SYNC LOGS'}
        </button>
      </div>

      {reports.length === 0 ? (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', textAlign: 'center', padding: '1.5rem 0', fontFamily: 'var(--font-mono)' }}>
          No historical analysis events recorded in database.
        </p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Trace ID</th>
                <th>Timestamp</th>
                <th>Source File</th>
                <th>Duration</th>
                <th>AASIST Logit</th>
                <th>Acoustic Label</th>
                <th>Risk Score</th>
                <th>Threat Level</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.request_id}>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {report.request_id.slice(0, 8)}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                    {report.timestamp}
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <FileAudio size={13} style={{ color: 'var(--text-dim)' }} />
                      {report.filename}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>
                    {report.duration_sec ? `${report.duration_sec.toFixed(1)}s` : '—'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>
                    {report.spoof_score !== null ? report.spoof_score.toFixed(3) : '—'}
                  </td>
                  <td>
                    <span style={{
                      fontWeight: 600,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      color: report.spoof_label === 'bona_fide' ? 'var(--color-safe)' : 'var(--color-critical)'
                    }}>
                      {report.spoof_label === 'bona_fide' ? 'BONA FIDE' : 'SPOOF'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {(report.risk_score * 100).toFixed(0)}%
                  </td>
                  <td>
                    <span className={`badge badge-${report.risk_level}`}>
                      {report.risk_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
