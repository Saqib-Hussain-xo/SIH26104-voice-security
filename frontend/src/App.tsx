import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { MicRecorder } from './components/MicRecorder';
import { AudioUpload } from './components/AudioUpload';
import { AnalysisResult } from './components/AnalysisResult';
import { SpeakerEnrollmentBeta } from './components/SpeakerEnrollmentBeta';
import { fetchHealth, analyzeAudio } from './services/api';
import { HealthStatus, AnalyzeResponse } from './types';
import { Mic, UploadCloud, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record');
  const [speakerId, setSpeakerId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [lastAudioFile, setLastAudioFile] = useState<File | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHealth()
      .then((data) => setHealth(data))
      .catch((err) => console.error('Failed to load health status:', err));
  }, []);

  // Smooth-scroll to result section when analysis completes
  useEffect(() => {
    if (analysisResult && !loading && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [analysisResult, loading]);

  const handleAnalyze = async (file: File, targetSpeakerId?: string) => {
    setLoading(true);
    setError(null);
    setLastAudioFile(file);
    try {
      const res = await analyzeAudio(file, file.name, targetSpeakerId);
      setAnalysisResult(res);
    } catch (err: any) {
      setError(err.message || 'Voice security analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sutra-app">
      <Header health={health} />

      {/* Hero Section */}
      <section className="sutra-hero">
        <h1 className="sutra-hero-title">Verify a voice before you trust it.</h1>
        <p className="sutra-hero-desc">
          Analyze an audio recording for synthetic speech, voice cloning artifacts, and speaker impersonation.
        </p>
      </section>

      {/* Audio Input Experience (Dominant Component) */}
      <section className="sutra-input-container">
        <div className="input-mode-switcher">
          <button
            className={`mode-btn ${activeTab === 'record' ? 'active' : ''}`}
            onClick={() => setActiveTab('record')}
          >
            <Mic size={14} />
            Record voice
          </button>
          <button
            className={`mode-btn ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <UploadCloud size={14} />
            Upload file
          </button>
        </div>

        {activeTab === 'record' ? (
          <MicRecorder
            onAnalyze={handleAnalyze}
            loading={loading}
            speakerId={speakerId}
            setSpeakerId={setSpeakerId}
          />
        ) : (
          <AudioUpload
            onAnalyze={handleAnalyze}
            loading={loading}
            speakerId={speakerId}
            setSpeakerId={setSpeakerId}
          />
        )}
      </section>

      {/* Technology Proof Points */}
      <section className="sutra-proof-strip">
        <div className="proof-item">
          <div className="proof-meta">
            <span className="proof-name">AASIST Core</span>
            <span className="proof-tag">
              {health?.spoof_detector_loaded ? '● ONLINE' : '● STANDBY'}
            </span>
          </div>
          <p className="proof-desc">Raw spectral graph anti-spoofing for synthetic speech artifact detection.</p>
        </div>

        <div className="proof-item">
          <div className="proof-meta">
            <span className="proof-name">ECAPA-TDNN</span>
            <span className="proof-tag" style={{ color: 'var(--text-secondary)' }}>
              {health?.speaker_verifier_loaded ? '● ACTIVE' : '● READY (LAZY)'}
            </span>
          </div>
          <p className="proof-desc">192-dimensional voice biometrics comparing claimed identities against reference profiles.</p>
        </div>
      </section>

      {/* Analysis In-Progress State */}
      {loading && (
        <div className="sutra-analyzing-card">
          <div className="analysis-spinner" />
          <div className="analyzing-title">Analyzing your recording</div>
          <p className="analyzing-subtitle">
            Evaluating acoustic spectrograms, biometrics, and contextual threats...
          </p>
        </div>
      )}

      {/* Request Error State */}
      {error && !loading && (
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '0.5rem',
            backgroundColor: 'var(--status-danger-bg)',
            border: '1px solid var(--status-danger-border)',
            color: 'var(--status-danger)',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.875rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Primary Result Experience */}
      <div ref={resultRef}>
        {analysisResult && !loading && (
          <AnalysisResult result={analysisResult} audioFile={lastAudioFile} />
        )}
      </div>

      {/* Speaker Verification Beta (Cleanly demarcated at bottom) */}
      <SpeakerEnrollmentBeta />

      {/* Quiet Footer */}
      <footer style={{ marginTop: '5rem', paddingTop: '2rem', borderTop: '1px solid var(--border-subtle)', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
        SUTRA analyzes supplied recordings and browser microphone input. It does not operate on cellular telephony basebands.
      </footer>
    </div>
  );
};
