import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AudioUpload } from './components/AudioUpload';
import { MicRecorder } from './components/MicRecorder';
import { AnalysisResult } from './components/AnalysisResult';
import { fetchHealth, analyzeAudio, enrollSpeaker } from './services/api';
import { HealthStatus, AnalyzeResponse } from './types';
import { Upload, Mic, UserCheck } from 'lucide-react';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'mic' | 'enroll'>('upload');
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    loadHealth();
  }, []);

  const handleAnalyze = async (file: File, speakerId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeAudio(file, file.name, speakerId);
      setAnalysisResult(res);
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

  return (
    <div className="container">
      <Header health={health} />

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
      </div>
    </div>
  );
};
