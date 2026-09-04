import React, { useState } from 'react';
import { UserCheck, ArrowRight, Loader2 } from 'lucide-react';
import { enrollSpeaker } from '../services/api';

export const SpeakerEnrollmentBeta: React.FC = () => {
  const [speakerId, setSpeakerId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);

  const handleEnroll = async () => {
    if (!file || !speakerId.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      await enrollSpeaker(speakerId.trim(), file, file.name);
      setMessage({
        text: `Speaker profile '${speakerId.trim()}' enrolled into local biometrics vault.`,
        success: true,
      });
      setSpeakerId('');
      setFile(null);
    } catch (err: any) {
      setMessage({
        text: err.message || 'Enrollment failed',
        success: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="sutra-beta-section">
      <div className="beta-title-row">
        <UserCheck size={18} style={{ color: 'var(--text-secondary)' }} />
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Speaker Verification</h3>
        <span className="beta-badge">Beta</span>
      </div>
      <p className="beta-desc">
        Create a trusted reference voice profile to compare incoming recordings against using ECAPA-TDNN 192-dimensional embeddings.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          className="speaker-opt-input"
          placeholder="New Speaker Identifier (e.g. user_101)"
          value={speakerId}
          onChange={(e) => setSpeakerId(e.target.value)}
          disabled={loading}
          style={{ width: '280px' }}
        />

        <input
          type="file"
          accept="audio/*,.wav,.mp3,.flac"
          onChange={(e) => e.target.files && setFile(e.target.files[0])}
          style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}
          disabled={loading}
        />

        <button
          className="sutra-btn-ghost"
          onClick={handleEnroll}
          disabled={!file || !speakerId.trim() || loading}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} style={{ marginRight: '0.25rem' }} />}
          Register Reference
        </button>
      </div>

      {message && (
        <p
          style={{
            fontSize: '0.8125rem',
            fontFamily: 'var(--font-mono)',
            marginTop: '0.75rem',
            color: message.success ? 'var(--status-safe)' : 'var(--status-danger)',
          }}
        >
          {message.text}
        </p>
      )}
    </section>
  );
};
