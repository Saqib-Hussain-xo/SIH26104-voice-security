import React from 'react';
import { ShieldAlert, ShieldCheck, Cpu, AlertTriangle, FileText, AlertCircle } from 'lucide-react';
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
        <p style={{ fontWeight: 600, marginTop: '1rem' }}>Running Acoustic & Intent Security Analysis...</p>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          AASIST Voice Anti-Spoofing → Whisper ASR Transcription → Social Engineering Threat Detection
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
          Upload an audio file or record via microphone to analyze acoustic anti-spoofing and social engineering threat signals.
        </p>
      </div>
    );
  }

  const { risk_assessment, spoof_detection, speaker_verification, semantic_threat_analysis, processing_time_ms, request_id } = result;

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
          <div className="metric-label">Overall System Risk</div>
          <div className="metric-val" style={{ color: `var(--color-${risk_assessment.risk_level.toLowerCase()})` }}>
            {(risk_assessment.risk_score * 100).toFixed(0)}%
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-label">Acoustic Risk (AASIST)</div>
          <div className="metric-val" style={{ color: spoof_detection.label === 'bona_fide' ? 'var(--color-low)' : 'var(--color-critical)' }}>
            {risk_assessment.acoustic_risk_score !== undefined ? `${(risk_assessment.acoustic_risk_score * 100).toFixed(0)}%` : (spoof_detection.label === 'bona_fide' ? 'Low' : 'High')}
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-label">Semantic Threat Risk</div>
          <div className="metric-val" style={{ color: (semantic_threat_analysis?.semantic_risk_score ?? 0) > 0.3 ? 'var(--color-critical)' : 'var(--color-low)' }}>
            {semantic_threat_analysis ? `${(semantic_threat_analysis.semantic_risk_score * 100).toFixed(0)}%` : '0%'}
          </div>
        </div>
      </div>

      {/* Speech Transcript Section */}
      {semantic_threat_analysis && (
        <div style={{ marginBottom: '1.25rem', padding: '0.875rem', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
          <div style={{ fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <FileText size={16} /> ASR Speech Transcript ({semantic_threat_analysis.asr_model || 'Whisper'})
          </div>
          <p style={{ fontSize: '0.875rem', fontStyle: semantic_threat_analysis.transcript ? 'normal' : 'italic', color: semantic_threat_analysis.transcript ? 'white' : 'var(--text-muted)', margin: 0, padding: '0.5rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '0.375rem' }}>
            {semantic_threat_analysis.transcript ? `"${semantic_threat_analysis.transcript}"` : 'No speech detected or transcribed.'}
          </p>

          {semantic_threat_analysis.detected_indicators && semantic_threat_analysis.detected_indicators.length > 0 ? (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-critical)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <AlertCircle size={14} /> Social Engineering Threat Indicators Detected:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {semantic_threat_analysis.detected_indicators.map((ind, i) => (
                  <span key={i} style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--color-critical)', color: '#fca5a5', fontSize: '0.75rem', fontWeight: 500 }}>
                    ⚠️ {ind.category}: <em>{ind.matched_terms.join(', ')}</em>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-low)' }}>
              ✓ No social engineering threat keywords or patterns detected in transcript.
            </div>
          )}
        </div>
      )}

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
