import React, { useState, useRef } from 'react';
import { Upload, FileAudio, ArrowRight } from 'lucide-react';

interface AudioUploadProps {
  onAnalyze: (file: File, speakerId?: string) => void;
  loading: boolean;
}

export const AudioUpload: React.FC<AudioUploadProps> = ({ onAnalyze, loading }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [speakerId, setSpeakerId] = useState<string>('');
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
        className={`dropzone ${isDragOver ? 'active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="audio/*,.wav,.mp3,.m4a,.flac,.ogg"
          style={{ display: 'none' }}
        />

        <Upload className="upload-icon" />
        {selectedFile ? (
          <div>
            <p style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{selectedFile.name}</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontWeight: 500 }}>Drop audio file here or click to browse</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Supports WAV, MP3, M4A, FLAC, OGG (16kHz mono recommended)
            </p>
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Optional Speaker ID (for verification)"
          value={speakerId}
          onChange={(e) => setSpeakerId(e.target.value)}
          style={{
            flex: 1,
            padding: '0.625rem',
            borderRadius: '0.375rem',
            border: '1px solid var(--border-color)',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            color: 'var(--text-main)',
            fontSize: '0.875rem',
          }}
        />

        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!selectedFile || loading}
          style={{ opacity: selectedFile && !loading ? 1 : 0.5 }}
        >
          {loading ? 'Analyzing...' : 'Analyze Audio'}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
