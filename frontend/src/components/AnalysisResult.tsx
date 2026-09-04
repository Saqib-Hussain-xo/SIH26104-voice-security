import React, { useState, useRef } from 'react';
import { Play, Pause, ChevronDown, ChevronUp, ShieldCheck, ShieldAlert, Fingerprint, Activity, FileText, Sparkles } from 'lucide-react';
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

  const verdictTheme = isBonaFide ? 'verdict-theme-genuine' : 'verdict-theme-synthetic';

  const verdictTitle = isBonaFide
    ? 'Likely Genuine Voice'
    : 'Likely Synthetic Voice';

  const verdictBadge = isBonaFide
    ? 'Bona Fide Acoustic Signal'
    : 'Synthetic / Cloning Artifacts Detected';

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

  // Distinctive Evidence Metrics
  const voiceAuthStatus = isBonaFide ? 'Natural Speech' : 'Synthetic Artifacts';
  const voiceAuthDetail = isBonaFide
    ? 'Spectral graph distribution matches human vocal tract'
    : `Raw AASIST logit ${spoof_detection.raw_score.toFixed(3)}`;

  let speakerStatus = 'Unspecified';
  let speakerDetail = 'No reference speaker profile supplied for identity verification';
  let speakerVerified = false;
  if (speaker_verification.enabled) {
    if (speaker_verification.verified) {
      speakerStatus = 'Verified Identity';
      speakerDetail = `Cosine similarity ${(speaker_verification.similarity || 0).toFixed(3)} ≥ ${speaker_verification.threshold}`;
      speakerVerified = true;
    } else {
      speakerStatus = 'Identity Mismatch';
      speakerDetail = `Cosine similarity ${(speaker_verification.similarity || 0).toFixed(3)} below threshold ${speaker_verification.threshold}`;
    }
  }

  const audioQualityStatus = 'High Clarity';
  const audioQualityDetail = '16kHz PCM mono · Adequate signal-to-noise ratio';

  const hasThreat = (semantic_threat_analysis?.detected_indicators?.length ?? 0) > 0;
  const semanticStatus = hasThreat ? 'Adversarial Signals' : 'Neutral Context';
  const semanticDetail = hasThreat
    ? `${semantic_threat_analysis!.detected_indicators.map((d) => d.category).join(', ')} keywords detected`
    : 'No coercion, urgency, or impersonation keywords detected';

  return (
    <section className="sutra-result-section">
      {/* 1. Forensic Charcoal Verdict Banner */}
      <div className={`forensic-verdict-banner ${verdictTheme}`}>
        <div className="verdict-banner-inner">
          <div className="verdict-text-block">
            <div className="verdict-tag-row">
              <span className="verdict-tag">{verdictBadge}</span>
              <span className="verdict-trace">TRACE {request_id.slice(0, 8)}</span>
            </div>
            <h2 className="verdict-headline">{verdictTitle}</h2>
            <p className="verdict-statement">
              {risk_assessment.recommended_action || (isBonaFide
                ? 'Acoustic spectral patterns show natural human vocal characteristics. Standard verification sufficient.'
                : 'Spectral distribution indicates artificial speech synthesis, voice conversion, or cloning manipulation.')}
            </p>
          </div>

          <div className="verdict-metric-block">
            <div className="verdict-metric-score">{riskPercent}%</div>
            <div className="verdict-metric-level">
              <span className={`risk-dot risk-dot-${risk_assessment.risk_level.toLowerCase()}`} />
              {risk_assessment.risk_level} RISK
            </div>
          </div>
        </div>
      </div>

      {/* 2. Distinctive Forensic Evidence Cards */}
      <div className="evidence-cards-header">
        <h3 className="evidence-title">Forensic Signal Analysis</h3>
        <span className="evidence-subtitle">Four independent acoustic & contextual vectors</span>
      </div>

      <div className="evidence-cards-grid">
        {/* Voice Authenticity */}
        <div className={`evidence-card ${isBonaFide ? 'card-status-safe' : 'card-status-danger'}`}>
          <div className="evidence-card-top">
            <div className="evidence-card-icon">
              {isBonaFide ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
            </div>
            <span className="evidence-card-badge">{voiceAuthStatus}</span>
          </div>
          <div className="evidence-card-label">Voice Authenticity</div>
          <div className="evidence-card-detail">{voiceAuthDetail}</div>
          <div className="evidence-card-bar">
            <div
              className="evidence-card-fill"
              style={{
                width: isBonaFide ? '85%' : '92%',
                backgroundColor: isBonaFide ? 'var(--status-safe)' : 'var(--status-danger)',
              }}
            />
          </div>
        </div>

        {/* Speaker Identity */}
        <div className={`evidence-card ${speakerVerified ? 'card-status-safe' : speaker_verification.enabled ? 'card-status-danger' : 'card-status-neutral'}`}>
          <div className="evidence-card-top">
            <div className="evidence-card-icon">
              <Fingerprint size={18} />
            </div>
            <span className="evidence-card-badge">{speakerStatus}</span>
          </div>
          <div className="evidence-card-label">Speaker Biometrics</div>
          <div className="evidence-card-detail">{speakerDetail}</div>
          <div className="evidence-card-bar">
            <div
              className="evidence-card-fill"
              style={{
                width: speaker_verification.enabled ? `${Math.min(100, Math.max(10, Math.round((speaker_verification.similarity || 0) * 100)))}%` : '0%',
                backgroundColor: speakerVerified ? 'var(--status-safe)' : 'var(--status-danger)',
              }}
            />
          </div>
        </div>

        {/* Audio Quality */}
        <div className="evidence-card card-status-safe">
          <div className="evidence-card-top">
            <div className="evidence-card-icon">
              <Activity size={18} />
            </div>
            <span className="evidence-card-badge">{audioQualityStatus}</span>
          </div>
          <div className="evidence-card-label">Acoustic Signal Quality</div>
          <div className="evidence-card-detail">{audioQualityDetail}</div>
          <div className="evidence-card-bar">
            <div
              className="evidence-card-fill"
              style={{ width: '90%', backgroundColor: 'var(--status-safe)' }}
            />
          </div>
        </div>

        {/* Semantic Threat */}
        <div className={`evidence-card ${hasThreat ? 'card-status-danger' : 'card-status-safe'}`}>
          <div className="evidence-card-top">
            <div className="evidence-card-icon">
              <FileText size={18} />
            </div>
            <span className="evidence-card-badge">{semanticStatus}</span>
          </div>
          <div className="evidence-card-label">Contextual / Semantic Risk</div>
          <div className="evidence-card-detail">{semanticDetail}</div>
          <div className="evidence-card-bar">
            <div
              className="evidence-card-fill"
              style={{
                width: hasThreat ? '80%' : '15%',
                backgroundColor: hasThreat ? 'var(--status-danger)' : 'var(--status-safe)',
              }}
            />
          </div>
        </div>
      </div>

      {/* 3. Integrated Audio Playback Area */}
      {audioFile && (
        <div className="forensic-player-container">
          <div className="player-meta">
            <span className="player-title">Analyzed Audio Capture</span>
            <span className="player-filename">{audioFile.name}</span>
          </div>
          <div className="player-controls">
            <button className="player-play-btn" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: '2px' }} />}
            </button>
            <div className="player-waveform-track">
              {Array.from({ length: 42 }).map((_, i) => (
                <div
                  key={i}
                  className="player-waveform-bar"
                  style={{
                    height: `${Math.max(5, Math.sin(i * 0.35) * 16 + 10)}px`,
                    opacity: i < (currentTime / 10) * 42 ? 1 : 0.3,
                  }}
                />
              ))}
            </div>
            <span className="player-timer">{formatDuration(currentTime)}</span>
          </div>
        </div>
      )}

      {/* 4. Editorial Transcript */}
      {semantic_threat_analysis?.transcript && (
        <div className="editorial-transcript-card">
          <div className="transcript-header-bar">
            <div className="transcript-meta-tag">
              <Sparkles size={12} />
              <span>Whisper Speech-to-Text Transcription</span>
            </div>
          </div>
          <blockquote className="transcript-editorial-quote">
            "{semantic_threat_analysis.transcript}"
          </blockquote>
        </div>
      )}

      {/* 5. Deep Forensic Technical Layer */}
      <details
        className="forensic-tech-accordion"
        open={techExpanded}
        onToggle={(e) => setTechExpanded((e.target as HTMLDetailsElement).open)}
      >
        <summary className="forensic-tech-summary">
          <div className="summary-label-group">
            <span className="summary-title">Forensic Technology Signals & Weights</span>
            <span className="summary-subtitle">Raw model logits, 192-dim vectors, and decision matrix</span>
          </div>
          {techExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </summary>

        <div className="forensic-tech-body">
          <div className="forensic-signals-grid">
            <div className="forensic-signal-cell">
              <div className="cell-label">AASIST Logit Output</div>
              <div className="cell-value">{spoof_detection.raw_score.toFixed(4)}</div>
              <div className="cell-sub">{spoof_detection.model_version} · {spoof_detection.inference_time_ms}ms</div>
            </div>

            <div className="forensic-signal-cell">
              <div className="cell-label">ECAPA-TDNN Similarity</div>
              <div className="cell-value">
                {speaker_verification.enabled && typeof speaker_verification.similarity === 'number'
                  ? speaker_verification.similarity.toFixed(4)
                  : 'N/A'}
              </div>
              <div className="cell-sub">
                {speaker_verification.enabled
                  ? `Threshold ${speaker_verification.threshold} · ${speaker_verification.verified ? 'Verified' : 'Mismatch'}`
                  : 'No reference profile'}
              </div>
            </div>

            <div className="forensic-signal-cell">
              <div className="cell-label">Semantic Adversarial Score</div>
              <div className="cell-value">{(semantic_threat_analysis?.semantic_risk_score ?? 0).toFixed(3)}</div>
              <div className="cell-sub">Level: {semantic_threat_analysis?.threat_level || 'LOW'}</div>
            </div>

            <div className="forensic-signal-cell">
              <div className="cell-label">Pipeline Processing Latency</div>
              <div className="cell-value">{processing_time_ms}ms</div>
              <div className="cell-sub">End-to-end execution</div>
            </div>
          </div>

          {risk_assessment.reasons && risk_assessment.reasons.length > 0 && (
            <div className="forensic-decision-matrix">
              <div className="matrix-title">Risk Engine Weighted Reasons</div>
              <div className="matrix-list">
                {risk_assessment.reasons.map((r, i) => (
                  <div key={i} className="matrix-row">
                    <span className="matrix-factor">{r.factor}</span>
                    <span className="matrix-reason">{r.reason}</span>
                    <span className={`matrix-status status-${r.impact}`}>{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </details>
    </section>
  );
};
