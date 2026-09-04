import React from 'react';
import { ShieldAlert, ShieldCheck, Cpu, AlertTriangle, FileText, CheckCircle2, UserCheck, Activity, Terminal } from 'lucide-react';
import { AnalyzeResponse } from '../types';

interface AnalysisResultProps {
  result: AnalyzeResponse | null;
  loading: boolean;
  error: string | null;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ result, loading, error }) => {
  if (loading) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '340px' }}>
        <div className="spinner"></div>
        <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '1rem', color: 'var(--text-main)' }}>
          Executing Voice Security Analysis Pipeline
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          <div>[1/4] Normalizing & Resampling audio to 16kHz mono...</div>
          <div>[2/4] AASIST Raw Waveform Graph Spectral Anti-Spoofing...</div>
          <div>[3/4] ECAPA-TDNN Speaker Identity Cosine Verification...</div>
          <div>[4/4] Multi-Signal Explainable Threat Evaluation...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ borderLeft: '3px solid var(--color-critical)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: 'var(--color-critical)' }}>
          <AlertTriangle size={20} />
          <h3 style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Analysis Pipeline Exception</h3>
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontFamily: 'var(--font-mono)' }}>
          {error}
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '340px', textAlign: 'center' }}>
        <Cpu size={40} style={{ color: 'var(--text-dim)', marginBottom: '0.875rem' }} />
        <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-main)' }}>Awaiting Audio Sample</p>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem', maxWidth: '380px' }}>
          Select an audio file or record via browser microphone to execute deep acoustic anti-spoofing and speaker identity verification.
        </p>
      </div>
    );
  }

  const { risk_assessment, spoof_detection, speaker_verification, semantic_threat_analysis, processing_time_ms, request_id } = result;

  const isCritical = risk_assessment.risk_level === 'CRITICAL';
  const isHigh = risk_assessment.risk_level === 'HIGH';
  const isSafe = risk_assessment.risk_level === 'LOW';

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
        <h3 className="card-title" style={{ margin: 0 }}>
          {isSafe ? (
            <ShieldCheck size={18} style={{ color: 'var(--color-safe)' }} />
          ) : (
            <ShieldAlert size={18} style={{ color: isCritical ? 'var(--color-critical)' : 'var(--color-high)' }} />
          )}
          Forensic Assessment Verdict
        </h3>
        <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          TRACE: {request_id.slice(0, 8)} | LATENCY: {processing_time_ms}ms
        </span>
      </div>

      {/* Decision Banner */}
      <div className={`risk-banner risk-${risk_assessment.risk_level}`}>
        <div>
          <div className="risk-title">
            {isSafe ? 'SECURITY CLEARANCE: SAFE' : `${risk_assessment.risk_level} RISK THREAT DETECTED`}
          </div>
          <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem', opacity: 0.95 }}>
            {risk_assessment.recommended_action}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
            System Risk
          </div>
          <div className="risk-score-display">
            {(risk_assessment.risk_score * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Primary Model Signals Grid */}
      <div className="forensic-grid">
        <div className="forensic-card">
          <div className="forensic-label">Acoustic Spoof</div>
          <div className="forensic-value" style={{ color: spoof_detection.label === 'bona_fide' ? 'var(--color-safe)' : 'var(--color-critical)' }}>
            {spoof_detection.label === 'bona_fide' ? 'BONA FIDE' : 'SYNTHETIC SPOOF'}
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
            Logit: {spoof_detection.raw_score.toFixed(3)}
          </div>
        </div>

        <div className="forensic-card">
          <div className="forensic-label">Speaker Identity</div>
          <div className="forensic-value" style={{
            color: !speaker_verification.enabled
              ? 'var(--text-dim)'
              : speaker_verification.verified
              ? 'var(--color-safe)'
              : 'var(--color-critical)'
          }}>
            {!speaker_verification.enabled
              ? 'UNSPECIFIED'
              : speaker_verification.verified
              ? 'VERIFIED MATCH'
              : 'MISMATCH / UNKNOWN'}
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
            {speaker_verification.enabled && typeof speaker_verification.similarity === 'number'
              ? `Sim: ${speaker_verification.similarity.toFixed(3)} (≥${speaker_verification.threshold})`
              : 'No enrolled ID'}
          </div>
        </div>

        <div className="forensic-card">
          <div className="forensic-label">Inference Model</div>
          <div className="forensic-value" style={{ color: 'var(--text-main)', fontSize: '0.8125rem' }}>
            AASIST + ECAPA
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
            Single-Window 3.0s
          </div>
        </div>
      </div>

      {/* Transcript & Semantic Threat Section (if present) */}
      {semantic_threat_analysis && semantic_threat_analysis.transcript && (
        <div style={{ marginBottom: '1.25rem', padding: '0.75rem', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: '0.25rem', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-primary)', marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
            <Terminal size={14} /> Speech Content Transcription (Whisper ASR)
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-main)', margin: 0, fontStyle: 'italic' }}>
            "{semantic_threat_analysis.transcript}"
          </p>

          {semantic_threat_analysis.detected_indicators && semantic_threat_analysis.detected_indicators.length > 0 && (
            <div style={{ marginTop: '0.625rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {semantic_threat_analysis.detected_indicators.map((ind, i) => (
                <span key={i} style={{ padding: '0.2rem 0.45rem', borderRadius: '0.2rem', backgroundColor: 'var(--color-critical-bg)', border: '1px solid var(--color-critical-border)', color: 'var(--color-critical)', fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  THREAT DETECTED: {ind.category} ({ind.matched_terms.join(', ')})
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Explainable Decision Factors */}
      <div>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          Why Did The System Reach This Conclusion?
        </div>
        <ul className="reasons-list">
          {risk_assessment.reasons.map((r, idx) => (
            <li key={idx} className={`reason-item ${r.impact}`}>
              <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{r.reason}</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', marginTop: '0.125rem', fontFamily: 'var(--font-mono)' }}>
                Signal: {r.factor.toUpperCase()} → Status: {r.status}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
