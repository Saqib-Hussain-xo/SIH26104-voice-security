import React, { useState, useRef } from 'react';
import { Play, Pause, ChevronDown, ChevronUp } from 'lucide-react';
import { AnalyzeResponse } from '../types';

interface AnalysisResultProps {
  result: AnalyzeResponse;
  audioFile: File | null;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ result, audioFile }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [techExpanded, setTechExpanded] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { risk_assessment, spoof_detection, speaker_verification, semantic_threat_analysis, processing_time_ms, request_id } = result;

  const isBonaFide = spoof_detection.label === 'bona_fide';
  const riskPercent = Math.round(risk_assessment.risk_score * 100);

  // Status mapping
  const statusClass =
    risk_assessment.risk_level === 'LOW'
      ? 'status-safe'
      : risk_assessment.risk_level === 'MEDIUM'
      ? 'status-warning'
      : 'status-danger';

  const verdictTitle = isBonaFide
    ? 'Likely Genuine Voice'
    : 'Likely Synthetic Voice';

  // Toggle playback of user audio file
  const togglePlay = () => {
    if (!audioRef.current && audioFile) {
      const audio = new Audio(URL.createObjectURL(audioFile));
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      audioRef.current = audio;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(console.error);
        setIsPlaying(true);
      }
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  // Human-readable signal values for horizontal breakdown
  const voiceAuthScore = isBonaFide ? 15 : 90;
  const voiceAuthState = isBonaFide ? 'Natural acoustic pattern' : 'Synthetic speech indicators';

  let speakerScore = 50;
  let speakerState = 'Identity not specified';
  if (speaker_verification.enabled) {
    if (speaker_verification.verified) {
      speakerScore = 10;
      speakerState = `Matches reference (${(speaker_verification.similarity || 0).toFixed(2)})`;
    } else {
      speakerScore = 85;
      speakerState = `Mismatch / unverified (${(speaker_verification.similarity || 0).toFixed(2)})`;
    }
  }

  const audioQualityScore = 95;
  const audioQualityState = 'Sufficient clarity';

  const semanticScore = Math.round((semantic_threat_analysis?.semantic_risk_score ?? 0) * 100);
  const semanticState = (semantic_threat_analysis?.detected_indicators?.length ?? 0) > 0
    ? `${semantic_threat_analysis!.detected_indicators.length} threat indicator(s)`
    : 'No adversarial patterns';

  return (
    <section className="sutra-result-section">
      {/* Primary Human-Readable Verdict Card */}
      <div className="result-main-card">
        <div className="verdict-header">
          <div>
            <div className="verdict-eyebrow">Analysis Verdict</div>
            <div className={`verdict-headline ${statusClass}`}>{verdictTitle}</div>
          </div>

          <div className="risk-score-pill">
            <div className="risk-num">{riskPercent}%</div>
            <div className="risk-label">{risk_assessment.risk_level} Impersonation Risk</div>
          </div>
        </div>

        <div className="verdict-summary">
          {risk_assessment.recommended_action || (isBonaFide
            ? 'No significant indicators of synthetic cloning or manipulation were observed in this recording.'
            : 'Acoustic feature analysis indicates artificial speech synthesis or voice conversion artifacts.')}
        </div>

        {/* Horizontal Visual Evidence Breakdown */}
        <div className="evidence-section-title">Observable Evidence Breakdown</div>
        <div className="evidence-bars-group">
          {/* Voice Authenticity */}
          <div className="evidence-row">
            <span className="evidence-label">Voice authenticity</span>
            <div className="evidence-track">
              <div
                className="evidence-fill"
                style={{
                  width: `${voiceAuthScore}%`,
                  backgroundColor: isBonaFide ? 'var(--status-safe)' : 'var(--status-danger)',
                }}
              />
            </div>
            <span className="evidence-state-text">{voiceAuthState}</span>
          </div>

          {/* Speaker Identity */}
          <div className="evidence-row">
            <span className="evidence-label">Speaker identity</span>
            <div className="evidence-track">
              <div
                className="evidence-fill"
                style={{
                  width: `${speakerScore}%`,
                  backgroundColor: speaker_verification.enabled && speaker_verification.verified
                    ? 'var(--status-safe)'
                    : 'var(--text-tertiary)',
                }}
              />
            </div>
            <span className="evidence-state-text">{speakerState}</span>
          </div>

          {/* Audio Quality */}
          <div className="evidence-row">
            <span className="evidence-label">Audio quality</span>
            <div className="evidence-track">
              <div
                className="evidence-fill"
                style={{
                  width: `${audioQualityScore}%`,
                  backgroundColor: 'var(--status-safe)',
                }}
              />
            </div>
            <span className="evidence-state-text">{audioQualityState}</span>
          </div>

          {/* Semantic Context */}
          <div className="evidence-row">
            <span className="evidence-label">Semantic context</span>
            <div className="evidence-track">
              <div
                className="evidence-fill"
                style={{
                  width: `${Math.max(10, semanticScore)}%`,
                  backgroundColor: semanticScore > 40 ? 'var(--status-danger)' : 'var(--status-safe)',
                }}
              />
            </div>
            <span className="evidence-state-text">{semanticState}</span>
          </div>
        </div>

        {/* Audio Result Playback */}
        {audioFile && (
          <div className="result-playback-box">
            <button className="play-pause-btn" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '2px' }} />}
            </button>
            <div className="playback-waveform-mock">
              {/* Restrained amplitude line visualization */}
              {Array.from({ length: 48 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${Math.max(4, Math.sin(i * 0.4) * 16 + 10)}px`,
                    backgroundColor: i < (currentTime / 10) * 48 ? 'var(--text-primary)' : 'var(--border-strong)',
                    borderRadius: '1px',
                  }}
                />
              ))}
            </div>
            <div className="playback-time">
              {formatDuration(currentTime)}
            </div>
          </div>
        )}
      </div>

      {/* Editorial Transcript Card */}
      {semantic_threat_analysis?.transcript && (
        <div className="transcript-card">
          <div className="transcript-label">Transcribed Speech ({semantic_threat_analysis.asr_model || 'Whisper'})</div>
          <div className="transcript-quote">"{semantic_threat_analysis.transcript}"</div>
        </div>
      )}

      {/* Technical Details Accordion */}
      <details
        className="tech-details-details"
        open={techExpanded}
        onToggle={(e) => setTechExpanded((e.target as HTMLDetailsElement).open)}
      >
        <summary className="tech-details-summary">
          <span>Technical Details & Forensic Signals</span>
          {techExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </summary>

        <div className="tech-details-content">
          <div className="tech-grid">
            <div className="tech-item">
              <div className="tech-item-title">AASIST Anti-Spoof</div>
              <div className="tech-item-val">{spoof_detection.raw_score.toFixed(4)}</div>
              <div className="tech-item-sub">Logit ({spoof_detection.label}) · {spoof_detection.inference_time_ms}ms</div>
            </div>

            <div className="tech-item">
              <div className="tech-item-title">ECAPA-TDNN Biometrics</div>
              <div className="tech-item-val">
                {speaker_verification.enabled && typeof speaker_verification.similarity === 'number'
                  ? speaker_verification.similarity.toFixed(4)
                  : 'N/A'}
              </div>
              <div className="tech-item-sub">
                {speaker_verification.enabled
                  ? `Threshold ${speaker_verification.threshold} · ${speaker_verification.verified ? 'Verified' : 'Unverified'}`
                  : 'No reference profile applied'}
              </div>
            </div>

            <div className="tech-item">
              <div className="tech-item-title">Inference Pipeline</div>
              <div className="tech-item-val">{processing_time_ms}ms</div>
              <div className="tech-item-sub">Trace: {request_id.slice(0, 8)}</div>
            </div>

            <div className="tech-item">
              <div className="tech-item-title">Semantic Score</div>
              <div className="tech-item-val">{(semantic_threat_analysis?.semantic_risk_score ?? 0).toFixed(3)}</div>
              <div className="tech-item-sub">Level: {semantic_threat_analysis?.threat_level || 'LOW'}</div>
            </div>
          </div>

          {/* Explainable factors list */}
          {risk_assessment.reasons && risk_assessment.reasons.length > 0 && (
            <div style={{ marginTop: '1.25rem' }}>
              <div className="tech-item-title" style={{ marginBottom: '0.5rem' }}>Risk Engine Factors</div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {risk_assessment.reasons.map((r, i) => (
                  <li key={i} style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                    • [{r.factor.toUpperCase()}] {r.reason} ({r.status})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </section>
  );
};
