import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, ArrowRight, RotateCcw, Loader2 } from 'lucide-react';

interface MicRecorderProps {
  onAnalyze: (file: File, speakerId?: string) => void;
  loading: boolean;
  speakerId: string;
  setSpeakerId: (id: string) => void;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

async function resampleTo16k(samples: Float32Array, origRate: number): Promise<Float32Array> {
  if (origRate === 16000) return samples;
  const targetRate = 16000;
  const duration = samples.length / origRate;
  const OfflineCtx = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  if (!OfflineCtx) return samples;

  const offlineCtx = new OfflineCtx(1, duration * targetRate, targetRate);
  const buffer = offlineCtx.createBuffer(1, samples.length, origRate);
  buffer.getChannelData(0).set(samples);

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  return renderedBuffer.getChannelData(0);
}

const BAR_COUNT = 32;

export const MicRecorder: React.FC<MicRecorderProps> = ({
  onAnalyze,
  loading,
  speakerId,
  setSpeakerId,
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [amplitudes, setAmplitudes] = useState<number[]>(new Array(BAR_COUNT).fill(4));

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);

  const cleanupResources = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [cleanupResources]);

  const updateWaveform = () => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const step = Math.floor(dataArray.length / BAR_COUNT);
    const nextAmps: number[] = [];

    for (let i = 0; i < BAR_COUNT; i++) {
      const val = dataArray[i * step] || 0;
      // Normal speech scaling: map 0-255 to min 4px, max 48px
      const height = Math.max(4, Math.min(48, Math.round((val / 255) * 44 + 4)));
      nextAmps.push(height);
    }

    setAmplitudes(nextAmps);
    animationFrameRef.current = requestAnimationFrame(updateWaveform);
  };

  const startRecording = async () => {
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;
      analyserRef.current = analyser;

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      pcmChunksRef.current = [];

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        pcmChunksRef.current.push(new Float32Array(input));
      };

      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0;

      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(gainNode);
      gainNode.connect(audioContext.destination);

      setIsRecording(true);
      setAudioBlob(null);
      setAudioUrl(null);
      setDurationSec(0);

      const startTime = Date.now();
      timerIntervalRef.current = setInterval(() => {
        setDurationSec(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      animationFrameRef.current = requestAnimationFrame(updateWaveform);
    } catch (err) {
      console.error('Microphone error:', err);
      alert('Microphone access was denied or unsupported.');
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    setIsProcessing(true);

    const pcmChunks = pcmChunksRef.current;
    const origSampleRate = audioContextRef.current ? audioContextRef.current.sampleRate : 16000;

    cleanupResources();

    let totalLength = 0;
    for (const chunk of pcmChunks) totalLength += chunk.length;

    const rawSamples = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of pcmChunks) {
      rawSamples.set(chunk, offset);
      offset += chunk.length;
    }

    let finalSamples: any = rawSamples;
    let finalSampleRate = origSampleRate;

    if (origSampleRate !== 16000) {
      try {
        finalSamples = await resampleTo16k(rawSamples, origSampleRate);
        finalSampleRate = 16000;
      } catch (err) {
        console.error('Resampling fallback:', err);
      }
    }

    const wavBlob = encodeWAV(finalSamples, finalSampleRate);
    setAudioBlob(wavBlob);
    setAudioUrl(URL.createObjectURL(wavBlob));
    setIsProcessing(false);
    setAmplitudes(new Array(BAR_COUNT).fill(4));
  };

  const handleReset = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setDurationSec(0);
    setAmplitudes(new Array(BAR_COUNT).fill(4));
  };

  const handleSubmit = () => {
    if (audioBlob && !loading) {
      const file = new File([audioBlob], `sutra_recording_${Date.now()}.wav`, { type: 'audio/wav' });
      onAnalyze(file, speakerId.trim() || undefined);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      {/* Real-time Dynamic Waveform Display */}
      <div className="mic-visualizer-box">
        <div className="waveform-bars">
          {amplitudes.map((height, i) => (
            <div
              key={i}
              className={`waveform-bar ${isRecording ? 'active' : ''} ${i >= 12 && i <= 19 ? 'brand-accent' : ''}`}
              style={{ height: `${height}px` }}
            />
          ))}
        </div>

        {isRecording ? (
          <div className="recording-timer">
            <span className="rec-pulse-dot" />
            <span>Recording {formatTime(durationSec)}</span>
          </div>
        ) : audioBlob ? (
          <div className="recording-timer">
            <span>Audio ready ({formatTime(durationSec || Math.round(audioBlob.size / 32000))})</span>
          </div>
        ) : (
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '0.75rem' }}>
            Microphone ready
          </div>
        )}
      </div>

      {/* Control Actions Row */}
      <div className="sutra-actions-row">
        <div>
          {!isRecording && !audioBlob && (
            <button className="sutra-btn-primary" onClick={startRecording}>
              <Mic size={16} />
              Start a recording
            </button>
          )}

          {isRecording && (
            <button className="sutra-btn-danger" onClick={stopRecording}>
              <Square size={16} />
              Stop recording
            </button>
          )}

          {audioBlob && !isRecording && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                className="sutra-btn-primary"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                Verify Recording
              </button>

              <button className="sutra-btn-ghost" onClick={handleReset} disabled={loading}>
                <RotateCcw size={14} style={{ marginRight: '0.35rem' }} />
                Discard & Re-record
              </button>
            </div>
          )}
        </div>

        {/* Optional Speaker Verification Input */}
        <input
          type="text"
          className="speaker-opt-input"
          placeholder="Speaker ID (Optional match)"
          value={speakerId}
          onChange={(e) => setSpeakerId(e.target.value)}
          disabled={isRecording || loading}
        />
      </div>

      {isProcessing && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Loader2 size={14} className="animate-spin" /> Preparing 16kHz audio waveform...
        </p>
      )}
    </div>
  );
};
