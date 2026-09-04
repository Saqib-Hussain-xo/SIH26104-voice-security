import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Send, Loader2 } from 'lucide-react';

interface MicRecorderProps {
  onAnalyze: (file: File, speakerId?: string) => void;
  loading: boolean;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM = 1) */
  view.setUint16(20, 1, true);
  /* channel count (mono = 1) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sampleRate * 2) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count = 1 * 2 bytes) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  /* float32 -> int16 PCM */
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

// Resamples audio using the browser's native high-quality OfflineAudioContext
async function resampleTo16k(samples: Float32Array, origRate: number): Promise<any> {
  if (origRate === 16000) return samples;
  
  const targetRate = 16000;
  const duration = samples.length / origRate;
  
  const OfflineCtx = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  if (!OfflineCtx) return samples; // Fallback if unsupported

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

export const MicRecorder: React.FC<MicRecorderProps> = ({ onAnalyze, loading }) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [speakerId, setSpeakerId] = useState<string>('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const pcmChunksRef = useRef<any[]>([]);

  const cleanupResources = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
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
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [cleanupResources]);

  const startRecording = async () => {
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false, // Prevents OS/Browser clipping from excessive artificial gain
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      // Request 16000Hz, but browser may supply a different native hardware rate
      const audioContext = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      pcmChunksRef.current = [];

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        pcmChunksRef.current.push(new Float32Array(input) as unknown as Float32Array);
      };

      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0; // Zero-gain to prevent mic feedback through speakers
      gainNodeRef.current = gainNode;

      source.connect(processor);
      processor.connect(gainNode);
      gainNode.connect(audioContext.destination);

      setIsRecording(true);
      setAudioBlob(null);
      setAudioUrl(null);
    } catch (err) {
      console.error('Microphone recording error:', err);
      alert('Microphone access denied or unsupported by browser.');
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    setIsProcessing(true);

    const pcmChunks = pcmChunksRef.current;
    const origSampleRate = audioContextRef.current ? audioContextRef.current.sampleRate : 16000;

    // Clean up hardware immediately while processing
    cleanupResources();

    let totalLength = 0;
    for (const chunk of pcmChunks) {
      totalLength += chunk.length;
    }

    const rawSamples = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of pcmChunks) {
      rawSamples.set(chunk, offset);
      offset += chunk.length;
    }

    // High quality resampling to 16kHz if browser ignored sampleRate: 16000
    let finalSamples: any = rawSamples;
    let finalSampleRate = origSampleRate;

    if (origSampleRate !== 16000) {
      try {
        finalSamples = await resampleTo16k(rawSamples, origSampleRate);
        finalSampleRate = 16000;
      } catch (err) {
        console.error("Native resampling failed, keeping original rate", err);
      }
    }

    // Diagnostic logging on the ACTUAL final buffer
    let maxPeak = 0;
    let sumSquares = 0;
    let clippedCount = 0;
    for (let i = 0; i < finalSamples.length; i++) {
      const absVal = Math.abs(finalSamples[i]);
      if (absVal > maxPeak) maxPeak = absVal;
      sumSquares += finalSamples[i] * finalSamples[i];
      if (absVal >= 0.99) clippedCount++;
    }
    const rms = Math.sqrt(sumSquares / (finalSamples.length || 1));
    const clipPercentage = (clippedCount / (finalSamples.length || 1)) * 100;
    const durationSec = finalSamples.length / finalSampleRate;

    console.log('[MicRecorder Diagnostic]', {
      actualAudioContextRate: origSampleRate,
      outputWavRate: finalSampleRate,
      resamplingOccurred: origSampleRate !== finalSampleRate,
      peak: maxPeak.toFixed(4),
      rms: rms.toFixed(4),
      clippedCount,
      clipPercentage: clipPercentage.toFixed(2) + '%',
      sampleCount: finalSamples.length,
      channelCount: 1,
      recordedDurationSec: durationSec.toFixed(2),
    });

    const wavBlob = encodeWAV(finalSamples, finalSampleRate);

    setAudioBlob(wavBlob);
    setAudioUrl(URL.createObjectURL(wavBlob));
    setIsProcessing(false);
  };

  const handleSubmit = () => {
    if (audioBlob && !loading) {
      const file = new File([audioBlob], `mic_recording_${Date.now()}.wav`, { type: 'audio/wav' });
      onAnalyze(file, speakerId.trim() || undefined);
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '1rem' }}>
      {!isRecording && !isProcessing && !audioBlob && (
        <button className="btn btn-primary" onClick={startRecording} style={{ padding: '0.875rem 1.5rem' }}>
          <Mic size={20} />
          Start Microphone Recording
        </button>
      )}

      {isRecording && (
        <div>
          <p style={{ color: 'var(--color-critical)', fontWeight: 600, marginBottom: '1rem' }}>
            🔴 Recording Audio... speak into your microphone
          </p>
          <button className="btn btn-danger" onClick={stopRecording}>
            <Square size={18} />
            Stop Recording
          </button>
        </div>
      )}

      {isProcessing && (
        <div>
          <p style={{ color: 'var(--text-main)', fontWeight: 500, marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Loader2 className="animate-spin" size={18} />
            Processing audio...
          </p>
        </div>
      )}

      {audioBlob && !isRecording && !isProcessing && (
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Audio recorded ({(audioBlob.size / 1024).toFixed(1)} KB)
          </p>
          {audioUrl && (
            <audio controls src={audioUrl} style={{ width: '100%', marginBottom: '1rem' }} />
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn btn-outline" onClick={() => { setAudioBlob(null); setAudioUrl(null); }}>
              Re-record
            </button>

            <input
              type="text"
              placeholder="Speaker ID (optional)"
              value={speakerId}
              onChange={(e) => setSpeakerId(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid var(--border-color)',
                backgroundColor: 'rgba(0,0,0,0.2)',
                color: 'white',
              }}
            />

            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              <Send size={16} />
              {loading ? 'Analyzing...' : 'Analyze Recording'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
