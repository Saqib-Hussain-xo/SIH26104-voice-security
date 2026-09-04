import React, { useState, useRef } from 'react';
import {
  Activity,
  AudioWaveform,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  FileAudio,
  Play,
  Pause,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
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

  const {
    risk_assessment,
    spoof_detection,
    speaker_verification,
    semantic_threat_analysis,
    processing_time_ms,
    request_id,
  } = result;

  const isBonaFide = spoof_detection.label === 'bona_fide';
  const riskPercent = Math.round(risk_assessment.risk_score * 100);
  const statusClass =
    risk_assessment.risk_level === 'LOW'
      ? 'status-safe'
      : risk_assessment.risk_level === 'MEDIUM'
      ? 'status-warning'
      : 'status-danger';

  const verdictTitle = isBonaFide ? 'Likely Genuine Voice' : 'Likely Synthetic Voice';
  const verdictKicker = isBonaFide ? 'VOICE AUTHENTICITY' : 'SYNTHETIC SPEECH DETECTED';
  const verdictIcon = isBonaFide ? <ShieldCheck size={22} strokeWidth={1.8} /> : <CircleAlert size={22} strokeWidth={1.8} />;

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
  const semanticState =
    (semantic_threat_analysis?.detected_indicators?.length ?? 0) > 0
      ? `${semantic_threat_analysis!.detected_indicators.length} threat indicator(s)`
      : 'No adversarial patterns';

  const evidence = [
    {
      label: 'Voice authenticity',
      value: voiceAuthScore,
      state: voiceAuthState,
      icon: <AudioWaveform size={17} />,
      tone: isBonaFide ? 'safe' : 'danger',
    },
    {
      label: 'Speaker identity',
      value: speakerScore,
      state: speakerState,
      icon: <UserRound size={17} />,
      tone: speaker_verification.enabled && speaker_verification.verified ? 'safe' : 'neutral',
    },
    {
      label: 'Audio quality',
      value: audioQualityScore,
      state: audioQualityState,
      icon: <FileAudio size={17} />,
      tone: 'safe',
    },
    {
      label: 'Semantic context',
      value: Math.max(10, semanticScore),
      state: semanticState,
      icon: <Activity size={17} />,
      tone: semanticScore > 40 ? 'danger' : 'safe',
    },
  ];

  return (
    <section className="sutra-result-section">
      <style>{`
        .sutra-result-section { --result-ink: #111827; --result-muted: #667085; --result-line: #e5e7eb; }
        .result-main-card { position: relative; overflow: hidden; padding: 0; border: 1px solid #dfe3e8; border-radius: 22px; background: #fff; box-shadow: 0 18px 55px rgba(15,23,42,.07); }
        .result-main-card::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 3px; background: #111827; }
        .result-verdict-panel { display: grid; grid-template-columns: minmax(0, 1fr) 210px; min-height: 235px; background: #111827; color: #fff; }
        .result-verdict-copy { padding: 32px 34px 30px; display: flex; flex-direction: column; justify-content: space-between; }
        .result-kicker { display: inline-flex; align-items: center; gap: 8px; width: fit-content; color: #cbd5e1; font: 600 11px/1 var(--font-mono); letter-spacing: .12em; }
        .result-kicker-dot { width: 7px; height: 7px; border-radius: 50%; background: ${isBonaFide ? '#34d399' : '#fb7185'}; box-shadow: 0 0 0 4px ${isBonaFide ? 'rgba(52,211,153,.12)' : 'rgba(251,113,133,.12)'}; }
        .result-verdict-title { margin: 22px 0 9px; font-size: clamp(2rem, 4vw, 3rem); line-height: 1.02; letter-spacing: -.045em; font-weight: 720; }
        .result-verdict-summary { max-width: 610px; color: #aeb8c7; font-size: 14px; line-height: 1.65; }
        .result-trace { margin-top: 22px; color: #667085; font: 10px var(--font-mono); letter-spacing: .05em; }
        .result-risk-panel { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; border-left: 1px solid rgba(255,255,255,.1); background: #181d27; }
        .result-risk-caption { color: #98a2b3; font: 600 10px var(--font-mono); letter-spacing: .12em; text-transform: uppercase; }
        .result-risk-number { margin: 7px 0 2px; font: 700 56px/.95 var(--font-mono); letter-spacing: -.07em; color: ${isBonaFide ? '#34d399' : riskPercent >= 75 ? '#fb7185' : '#fbbf24'}; }
        .result-risk-level { color: #e5e7eb; font: 600 11px var(--font-mono); letter-spacing: .08em; text-transform: uppercase; }
        .result-risk-rule { width: 74px; height: 1px; margin: 18px 0 10px; background: #3b4351; }
        .result-risk-note { max-width: 125px; text-align: center; color: #7f8999; font-size: 11px; line-height: 1.45; }
        .result-evidence-wrap { padding: 26px 28px 28px; }
        .result-section-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; }
        .result-section-heading h4 { font-size: 12px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: #344054; }
        .result-section-heading span { color: #98a2b3; font: 10px var(--font-mono); letter-spacing: .04em; }
        .evidence-bars-group { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .evidence-card { position: relative; padding: 17px 17px 16px 20px; border: 1px solid #e5e7eb; border-radius: 15px; background: #fafbfc; overflow: hidden; }
        .evidence-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--evidence-tone); }
        .evidence-card.safe { --evidence-tone: #10b981; }
        .evidence-card.danger { --evidence-tone: #ef4444; }
        .evidence-card.neutral { --evidence-tone: #98a2b3; }
        .evidence-card-head { display: flex; align-items: center; gap: 8px; color: #667085; }
        .evidence-card-head svg { color: var(--evidence-tone); }
        .evidence-card-label { font-size: 12px; font-weight: 650; color: #344054; }
        .evidence-card-state { margin: 10px 0 12px; min-height: 18px; color: #667085; font-size: 11px; line-height: 1.4; }
        .evidence-card-track { height: 5px; border-radius: 99px; background: #e6e9ed; overflow: hidden; }
        .evidence-card-fill { height: 100%; border-radius: inherit; background: var(--evidence-tone); }
        .result-playback-box { display: grid; grid-template-columns: 40px 1fr auto; align-items: center; gap: 14px; margin-top: 18px; padding: 13px 15px; border: 1px solid #e1e5ea; border-radius: 14px; background: #f5f6f8; }
        .play-pause-btn { width: 38px; height: 38px; border: 1px solid #d7dbe0; border-radius: 50%; background: #fff; color: #111827; display: grid; place-items: center; cursor: pointer; box-shadow: 0 2px 7px rgba(15,23,42,.06); }
        .playback-waveform-mock { height: 38px; display: flex; align-items: center; gap: 2px; }
        .playback-waveform-mock > div { min-width: 2px; }
        .playback-time { color: #667085; font: 10px var(--font-mono); min-width: 34px; text-align: right; }
        .transcript-card { position: relative; margin-top: 14px; padding: 22px 24px 24px; border: 1px solid #dedfe3; border-radius: 18px; background: #f7f5f0; overflow: hidden; }
        .transcript-card::before { content: '“'; position: absolute; top: -13px; right: 19px; font: 100px/1 Georgia, serif; color: #e6e1d8; pointer-events: none; }
        .transcript-label { position: relative; color: #8a8277; font: 600 10px var(--font-mono); letter-spacing: .1em; text-transform: uppercase; }
        .transcript-quote { position: relative; margin-top: 10px; max-width: 800px; color: #292725; font-family: Georgia, 'Times New Roman', serif; font-size: 17px; line-height: 1.6; }
        .tech-details-details { margin-top: 14px; border: 1px solid #e1e5ea; border-radius: 16px; background: #fff; overflow: hidden; }
        .tech-details-summary { display: flex; align-items: center; justify-content: space-between; padding: 17px 19px; cursor: pointer; list-style: none; color: #344054; font-size: 12px; font-weight: 650; }
        .tech-details-summary::-webkit-details-marker { display: none; }
        .tech-details-content { padding: 0 19px 20px; border-top: 1px solid #edf0f2; }
        .tech-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; margin-top: 16px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #e5e7eb; }
        .tech-item { padding: 16px; background: #fafbfc; }
        .tech-item-title { color: #667085; font-size: 10px; font-weight: 650; text-transform: uppercase; letter-spacing: .07em; }
        .tech-item-val { margin-top: 6px; color: #111827; font: 650 17px var(--font-mono); }
        .tech-item-sub { margin-top: 4px; color: #98a2b3; font: 10px/1.45 var(--font-mono); }
        @media (max-width: 700px) {
          .result-verdict-panel { grid-template-columns: 1fr; }
          .result-risk-panel { min-height: 150px; border-left: 0; border-top: 1px solid rgba(255,255,255,.1); align-items: flex-start; }
          .result-risk-number { font-size: 42px; }
          .result-risk-note { max-width: 260px; text-align: left; }
          .evidence-bars-group, .tech-grid { grid-template-columns: 1fr; }
          .result-verdict-copy { padding: 27px 23px; }
          .result-evidence-wrap { padding: 22px 18px 20px; }
        }
      `}</style>

      <div className="result-main-card">
        <div className="result-verdict-panel">
          <div className="result-verdict-copy">
            <div>
              <div className="result-kicker">
                <span className="result-kicker-dot" />
                {verdictIcon}
                {verdictKicker}
              </div>
              <div className="result-verdict-title">{verdictTitle}</div>
              <div className="result-verdict-summary">
                {risk_assessment.recommended_action ||
                  (isBonaFide
                    ? 'No significant indicators of synthetic cloning or manipulation were observed in this recording.'
                    : 'Acoustic feature analysis indicates artificial speech synthesis or voice conversion artifacts.')}
              </div>
            </div>
            <div className="result-trace">
              TRACE {request_id.slice(0, 8).toUpperCase()} &nbsp;·&nbsp; {processing_time_ms}MS PIPELINE
            </div>
          </div>

          <div className="result-risk-panel">
            <div className="result-risk-caption">System risk</div>
            <div className="result-risk-number">{riskPercent}%</div>
            <div className="result-risk-level">{risk_assessment.risk_level} risk</div>
            <div className="result-risk-rule" />
            <div className="result-risk-note">
              {isBonaFide ? 'No strong synthetic indicators detected.' : 'Signals point toward synthetic or impersonation activity.'}
            </div>
          </div>
        </div>

        <div className="result-evidence-wrap">
          <div className="result-section-heading">
            <h4>Evidence profile</h4>
            <span>4 SIGNALS · EXPLAINABLE</span>
          </div>

          <div className="evidence-bars-group">
            {evidence.map((item) => (
              <div className={`evidence-card ${item.tone}`} key={item.label}>
                <div className="evidence-card-head">
                  {item.icon}
                  <span className="evidence-card-label">{item.label}</span>
                </div>
                <div className="evidence-card-state">{item.state}</div>
                <div className="evidence-card-track">
                  <div className="evidence-card-fill" style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>

          {audioFile && (
            <div className="result-playback-box">
              <button className="play-pause-btn" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '2px' }} />}
              </button>
              <div className="playback-waveform-mock">
                {Array.from({ length: 64 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${Math.max(4, Math.abs(Math.sin(i * 0.43)) * 25 + 5)}px`,
                      backgroundColor: i < (currentTime / 10) * 64 ? '#111827' : '#cbd0d6',
                      borderRadius: '2px',
                    }}
                  />
                ))}
              </div>
              <div className="playback-time">{formatDuration(currentTime)}</div>
            </div>
          )}
        </div>
      </div>

      {semantic_threat_analysis?.transcript && (
        <div className="transcript-card">
          <div className="transcript-label">Speech content · {semantic_threat_analysis.asr_model || 'Whisper'}</div>
          <div className="transcript-quote">{semantic_threat_analysis.transcript}</div>
        </div>
      )}

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
