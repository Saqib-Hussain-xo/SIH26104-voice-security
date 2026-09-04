import React, { useState, useRef } from 'react';
import { UploadCloud, ArrowRight, FileAudio, UserCheck } from 'lucide-react';

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

        <UploadCloud className="upload-icon" />
        {selectedFile ? (
          <div>
            <p style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: '0.875rem' }}>{selectedFile.name}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB | Ready for analysis
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Drop voice recording or select file</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
              WAV, MP3, FLAC, M4A accepted (processed to 16kHz mono internally)
            </p>
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
        <input
          type="text"
          className="input-field"
          placeholder="Target Speaker ID for biometric matching (Optional)"
          value={speakerId}
          onChange={(e) => setSpeakerId(e.target.value)}
          style={{ flex: 1 }}
        />

        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!selectedFile || loading}
        >
          {loading ? 'Analyzing...' : 'Run Security Scan'}
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
};
