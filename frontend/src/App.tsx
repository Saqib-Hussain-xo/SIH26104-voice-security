import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AudioUpload } from './components/AudioUpload';
import { MicRecorder } from './components/MicRecorder';
import { AnalysisResult } from './components/AnalysisResult';
import { ReportHistory } from './components/ReportHistory';
import { fetchHealth, analyzeAudio, fetchReports, enrollSpeaker } from './services/api';
import { HealthStatus, AnalyzeResponse, ReportSummary } from './types';
import { Upload, Mic, UserCheck, ShieldAlert, FileText, Activity, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'mic' | 'enroll'>('upload');
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  const [enrollSpeakerId, setEnrollSpeakerId] = useState<string>('');
  const [enrollFile, setEnrollFile] = useState<File | null>(null);
  const [enrollMessage, setEnrollMessage] = useState<string | null>(null);
  const [enrollLoading, setEnrollLoading] = useState<boolean>(false);

  const loadHealth = async () => {
    try {
      const status = await fetchHealth();
      setHealth(status);
    } catch (err) {
      console.error('Failed to load health status:', err);
    }
  };

  const loadReportHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await fetchReports(50, 0);
      setReports(data.reports);
      setTotalCount(data.total);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
    loadReportHistory();
  }, []);

  const handleAnalyze = async (file: File, speakerId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeAudio(file, file.name, speakerId);
      setAnalysisResult(res);
      loadReportHistory();
    } catch (err: any) {
      setError(err.message || 'Audio analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!enrollFile || !enrollSpeakerId.trim()) return;
    setEnrollLoading(true);
    setEnrollMessage(null);
    try {
      await enrollSpeaker(enrollSpeakerId.trim(), enrollFile, enrollFile.name);
      setEnrollMessage(`✅ Speaker '${enrollSpeakerId}' enrolled successfully!`);
      setEnrollSpeakerId('');
      setEnrollFile(null);
    } catch (err: any) {
      setEnrollMessage(`❌ Enrollment failed: ${err.message}`);
    } finally {
      setEnrollLoading(false);
    }
  };

  const highRiskCount = reports.filter((r) => r.risk_level === 'HIGH' || r.risk_level === 'CRITICAL').length;

  return (
    <div className="container">
      <Header health={health} />

      {/* Operational Telemetry Metrics */}
      <div className="ops-metrics-grid">
        <div className="ops-card">
          <div className="ops-header">
            <span>Scan Volume</span>
            <FileText size={14} />
          </div>
          <div className="ops-val">{totalCount}</div>
          <div className="ops-sub">Total Audited Events</div>
        </div>

        <div className="ops-card">
          <div className="ops-header">
            <span style={{ color: highRiskCount > 0 ? 'var(--color-critical)' : 'var(--text-dim)' }}>Threat Intercepts</span>
            <ShieldAlert size={14} style={{ color: highRiskCount > 0 ? 'var(--color-critical)' : 'var(--text-dim)' }} />
          </div>
          <div className="ops-val" style={{ color: highRiskCount > 0 ? 'var(--color-critical)' : 'var(--text-main)' }}>
            {highRiskCount}
          </div>
          <div className="ops-sub">High / Critical Incidents</div>
        </div>

        <div className="ops-card">
          <div className="ops-header">
            <span>AASIST Core</span>
            <Activity size={14} />
          </div>
          <div className="ops-val" style={{ fontSize: '1rem', color: health?.spoof_detector_loaded ? 'var(--color-safe)' : 'var(--text-dim)' }}>
            {health?.spoof_detector_loaded ? 'ONLINE (LA-2019)' : 'INITIALIZING'}
          </div>
          <div className="ops-sub">Raw Spectral Anti-Spoofing</div>
        </div>

        <div className="ops-card">
          <div className="ops-header">
            <span>ECAPA-TDNN</span>
            <CheckCircle2 size={14} />
          </div>
          <div className="ops-val" style={{ fontSize: '1rem', color: health?.speaker_verifier_loaded ? 'var(--color-safe)' : 'var(--color-warning)' }}>
            {health?.speaker_verifier_loaded ? 'ACTIVE (VoxCeleb)' : 'STANDBY (Lazy)'}
          </div>
          <div className="ops-sub">192-dim Voice Biometrics</div>
        </div>
      </div>

      <div className="main-grid">
        <div className="card">
          <div className="tabs">
            <button
              className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <Upload size={14} />
              Audio File
            </button>
            <button
              className={`tab-btn ${activeTab === 'mic' ? 'active' : ''}`}
              onClick={() => setActiveTab('mic')}
            >
              <Mic size={14} />
              Live Microphone
            </button>
            <button
              className={`tab-btn ${activeTab === 'enroll' ? 'active' : ''}`}
              onClick={() => setActiveTab('enroll')}
            >
              <UserCheck size={14} />
              Speaker Registry
            </button>
          </div>

          {activeTab === 'upload' && (
            <AudioUpload onAnalyze={handleAnalyze} loading={loading} />
          )}

          {activeTab === 'mic' && (
            <MicRecorder onAnalyze={handleAnalyze} loading={loading} />
          )}

          {activeTab === 'enroll' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Register a verified reference voice profile into the secure local biometrics vault (ECAPA-TDNN 192-dim embedding).
              </p>
              <input
                type="text"
                className="input-field"
                placeholder="Unique Speaker Identifier (e.g. executive_user_42)"
                value={enrollSpeakerId}
                onChange={(e) => setEnrollSpeakerId(e.target.value)}
              />
              <div style={{ border: '1px dashed var(--border-subtle)', padding: '0.875rem', borderRadius: '0.25rem', backgroundColor: 'var(--bg-surface-subtle)' }}>
                <input
                  type="file"
                  accept="audio/*,.wav,.mp3,.flac"
                  onChange={(e) => e.target.files && setEnrollFile(e.target.files[0])}
                  style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', width: '100%' }}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleEnroll}
                disabled={!enrollFile || !enrollSpeakerId || enrollLoading}
              >
                {enrollLoading ? 'Generating Biometric Embedding...' : 'Enroll Voice Identity'}
              </button>
              {enrollMessage && (
                <div style={{
                  fontSize: '0.8125rem',
                  marginTop: '0.35rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.25rem',
                  backgroundColor: enrollMessage.includes('✅') ? 'var(--color-safe-bg)' : 'var(--color-critical-bg)',
                  border: `1px solid ${enrollMessage.includes('✅') ? 'var(--color-safe-border)' : 'var(--color-critical-border)'}`,
                  color: enrollMessage.includes('✅') ? 'var(--color-safe)' : 'var(--color-critical)',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {enrollMessage}
                </div>
              )}
            </div>
          )}
        </div>

        <AnalysisResult result={analysisResult} loading={loading} error={error} />

        <ReportHistory reports={reports} loading={historyLoading} onRefresh={loadReportHistory} />
      </div>

      {/* Forensic Scope Notice */}
      <footer style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
        <p>SIH26104 Operational Scope: Analyzes browser recorded and uploaded audio signals for synthetic cloning and speaker mismatch. Does not operate at baseband / cellular GSM layers.</p>
      </footer>
    </div>
  );
};
