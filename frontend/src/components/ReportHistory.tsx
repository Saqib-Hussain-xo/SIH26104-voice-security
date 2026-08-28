import React from 'react';
import { History, FileAudio } from 'lucide-react';
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
          <History size={20} />
          SQLite Analysis Report History
        </h3>
        <button className="btn btn-outline" onClick={onRefresh} disabled={loading} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8125rem' }}>
          {loading ? 'Refreshing...' : 'Refresh History'}
        </button>
      </div>

      {reports.length === 0 ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
          No reports found in SQLite database yet.
        </p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Timestamp</th>
                <th>Filename</th>
                <th>Duration</th>
                <th>AASIST Logit</th>
                <th>Prediction</th>
                <th>Risk Score</th>
                <th>Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.request_id}>
                  <td style={{ fontFamily: 'monospace' }}>{report.request_id.slice(0, 8)}</td>
                  <td>{report.timestamp}</td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <FileAudio size={14} />
                      {report.filename}
                    </span>
                  </td>
                  <td>{report.duration_sec ? `${report.duration_sec.toFixed(1)}s` : 'N/A'}</td>
                  <td>{report.spoof_score !== null ? report.spoof_score.toFixed(3) : 'N/A'}</td>
                  <td style={{ textTransform: 'capitalize', fontWeight: 500, color: report.spoof_label === 'bona_fide' ? 'var(--color-low)' : 'var(--color-critical)' }}>
                    {report.spoof_label.replace('_', ' ')}
                  </td>
                  <td style={{ fontWeight: 600 }}>{(report.risk_score * 100).toFixed(0)}%</td>
                  <td>
                    <span className={`risk-level-badge risk-level-${report.risk_level}`} style={{ fontSize: '0.6875rem', padding: '0.15rem 0.5rem', margin: 0 }}>
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
