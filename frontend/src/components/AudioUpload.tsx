import React, { useState, useRef } from 'react';
import { UploadCloud, FileAudio, ArrowRight, Loader2 } from 'lucide-react';

interface AudioUploadProps {
  onAnalyze: (file: File, speakerId?: string) => void;
  loading: boolean;
  speakerId: string;
  setSpeakerId: (id: string) => void;
}

export const AudioUpload: React.FC<AudioUploadProps> = ({
  onAnalyze,
  loading,
  speakerId,
  setSpeakerId,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (selectedFile && !loading) {
      onAnalyze(selectedFile, speakerId.trim() || undefined);
    }
  };

  return (
    <div>
      <div
        className="sutra-dropzone"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{ borderColor: isDragOver ? 'var(--border-focus)' : undefined }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="audio/*,.wav,.mp3,.m4a,.flac,.ogg"
          style={{ display: 'none' }}
        />

        {selectedFile ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <FileAudio size={28} style={{ color: 'var(--text-primary)' }} />
            <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{selectedFile.name}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Ready for analysis
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <UploadCloud size={30} style={{ color: 'var(--text-tertiary)' }} />
            <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
              Choose an audio file
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Drag and drop or browse · WAV, MP3, FLAC, M4A supported
            </p>
          </div>
        )}
      </div>

      <div className="sutra-actions-row" style={{ marginTop: '1.5rem' }}>
        <button
          className="sutra-btn-primary"
          onClick={handleSubmit}
          disabled={!selectedFile || loading}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          Verify Audio File
        </button>

        <input
          type="text"
          className="speaker-opt-input"
          placeholder="Speaker ID (Optional match)"
          value={speakerId}
          onChange={(e) => setSpeakerId(e.target.value)}
          disabled={loading}
        />
      </div>
    </div>
  );
};
