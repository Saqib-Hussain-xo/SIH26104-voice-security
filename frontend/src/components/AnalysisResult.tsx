import React from 'react';
import { ShieldAlert, ShieldCheck, Cpu, AlertTriangle, Info } from 'lucide-react';
import { AnalyzeResponse } from '../types';

interface AnalysisResultProps {
  result: AnalyzeResponse | null;
  loading: boolean;
  error: string | null;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ result, loading, error }) => {
  if (loading) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '320px' }}>
        <div className="spinner"></div>
        <p style={{ fontWeight: 600, marginTop: '1rem' }}>Processing Pretrained AASIST Voice Analysis...</p>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Preprocessing → PyTorch AASIST Synthetic Evidence Inference → Risk Assessment
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ borderLeft: '4px solid var(--color-critical)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-critical)' }}>
          <AlertTriangle size={24} />
          <h3 style={{ fontWeight: 600 }}>Analysis Request Error</h3>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '320px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Cpu size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
        <p style={{ fontWeight: 500 }}>No Analysis Results Yet</p>
        <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
          Upload an audio file or record via microphone to generate an explainable synthetic-evidence risk assessment.
        </p>
      </div>
    );
  }

  const { risk_assessment, spoof_detection, speaker_verification, processing_time_ms, request_id } = result;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 className="card-title" style={{ margin: 0 }}>
          {risk_assessment.risk_level === 'LOW' ? (
            <ShieldCheck style={{ color: 'var(--color-low)' }} />
          ) : (
            <ShieldAlert style={{ color: `var(--color-${risk_assessment.risk_level.toLowerCase()})` }} />
          )}
          System Risk Assessment
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Req ID: {request_id.slice(0, 8)} | {processing_time_ms}ms</span>
      </div>

      <div className="risk-gauge-container">
        <div className={`risk-level-badge risk-level-${risk_assessment.risk_level}`}>
          {risk_assessment.risk_level} RISK
        </div>
        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', textAlign: 'center' }}>
          {risk_assessment.recommended_action}
        </p>
      </div>

      <div className="metrics-grid">
        <div className="metric-box">
          <div className="metric-label">Risk Assessment Score</div>
          <div className="metric-val" style={{ color: `var(--color-${risk_assessment.risk_level.toLowerCase()})` }}>
            {(risk_assessment.risk_score * 100).toFixed(0)}%
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-label">Synthetic-Evidence Label</div>
          <div className="metric-val" style={{ textTransform: 'capitalize', color: spoof_detection.label === 'bona_fide' ? 'var(--color-low)' : 'var(--color-critical)' }}>
            {spoof_detection.label === 'bona_fide' ? 'Genuine Speech' : 'Synthetic / Spoof'}
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-label">System Confidence</div>
          <div className="metric-val">
            {(risk_assessment.confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1.25rem', padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '0.375rem', fontSize: '0.8125rem' }}>
        <div style={{ fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Info size={14} /> Synthetic-Evidence Model (AASIST)
        </div>
        <div><strong>Raw Bona Fide Logit:</strong> {spoof_detection.raw_score.toFixed(4)}</div>
        <div style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.75rem' }}>
          {spoof_detection.interpretation}
        </div>
      </div>

      {speaker_verification.enabled && (
        <div style={{ marginBottom: '1.25rem', padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '0.375rem', fontSize: '0.8125rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
            Speaker Verification (ECAPA-TDNN)
          </div>
          <div><strong>Cosine Similarity:</strong> {speaker_verification.similarity !== null && speaker_verification.similarity !== undefined ? speaker_verification.similarity.toFixed(4) : 'N/A'} (Threshold: {speaker_verification.threshold})</div>
          <div><strong>Verified Identity:</strong> {speaker_verification.verified ? 'Matched' : 'Unverified / Mismatch'}</div>
        </div>
      )}

      <div>
        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
          Risk Assessment Factors
        </h4>
        <ul className="reasons-list">
          {risk_assessment.reasons.map((r, idx) => (
            <li key={idx} className={`reason-item ${r.impact}`}>
              <div style={{ fontWeight: 500 }}>{r.reason}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Factor: {r.factor} ({r.status})</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
