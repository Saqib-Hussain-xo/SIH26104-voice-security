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

      {/* Dashboard Stats Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            <FileText size={16} /> Total Analyses
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{totalCount}</div>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-critical)', fontSize: '0.8125rem' }}>
            <ShieldAlert size={16} /> High Risk Analyses
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--color-critical)' }}>{highRiskCount}</div>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontSize: '0.8125rem' }}>
            <Activity size={16} /> AASIST Model
          </div>
          <div style={{ fontSize: '0.9375rem', fontWeight: 600, marginTop: '0.35rem', color: 'var(--color-low)' }}>
            {health?.spoof_detector_loaded ? 'Active (ASVspoof2019)' : 'Offline'}
          </div>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontSize: '0.8125rem' }}>
            <CheckCircle2 size={16} /> ECAPA-TDNN Model
          </div>
          <div style={{ fontSize: '0.9375rem', fontWeight: 600, marginTop: '0.35rem', color: 'var(--color-low)' }}>
            {health?.speaker_verifier_loaded ? 'Active (VoxCeleb)' : 'Initialized (Lazy)'}
          </div>
        </div>
      </div>

      <div className="main-grid">
        <div className="card">
          <div className="tabs">
            <button
              className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <Upload size={16} style={{ display: 'inline', marginRight: '0.35rem' }} />
              Audio Upload
            </button>
            <button
              className={`tab-btn ${activeTab === 'mic' ? 'active' : ''}`}
              onClick={() => setActiveTab('mic')}
            >
              <Mic size={16} style={{ display: 'inline', marginRight: '0.35rem' }} />
              Microphone
            </button>
            <button
              className={`tab-btn ${activeTab === 'enroll' ? 'active' : ''}`}
              onClick={() => setActiveTab('enroll')}
            >
              <UserCheck size={16} style={{ display: 'inline', marginRight: '0.35rem' }} />
              Speaker Enrollment
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
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Enroll a clean reference voice clip to enable speaker verification matching.
              </p>
              <input
                type="text"
                placeholder="Speaker ID (e.g. user_101)"
                value={enrollSpeakerId}
                onChange={(e) => setEnrollSpeakerId(e.target.value)}
                style={{
                  padding: '0.625rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  color: 'white',
                }}
              />
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => e.target.files && setEnrollFile(e.target.files[0])}
                style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}
              />
              <button
                className="btn btn-primary"
                onClick={handleEnroll}
                disabled={!enrollFile || !enrollSpeakerId || enrollLoading}
              >
                {enrollLoading ? 'Enrolling Voice...' : 'Enroll Speaker Identity'}
              </button>
              {enrollMessage && (
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', fontWeight: 500 }}>
                  {enrollMessage}
                </p>
              )}
            </div>
          )}
        </div>

        <AnalysisResult result={analysisResult} loading={loading} error={error} />

        <ReportHistory reports={reports} loading={historyLoading} onRefresh={loadReportHistory} />
      </div>

      {/* SIH Scope Disclaimer */}
      <footer style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
        <p>Disclaimer: This prototype analyzes supplied/recorded audio and does not intercept ordinary cellular calls.</p>
      </footer>
    </div>
  );
};
