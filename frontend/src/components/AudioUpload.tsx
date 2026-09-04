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
        className={`sutra-dropzone ${selectedFile ? 'has-file' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleFileDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
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
          <div className="upload-selected-state">
            <div className="upload-selected-header">
              <span className="upload-tag">AUDIO FILE</span>
              <button
                type="button"
                className="upload-change-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Change file
              </button>
            </div>
            <div className="upload-selected-info">
              <div className="upload-file-icon">
                <FileAudio size={24} />
              </div>
              <div className="upload-file-details">
                <p className="upload-filename">{selectedFile.name}</p>
                <p className="upload-filesub">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Ready for analysis
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="upload-empty-state">
            <div className="upload-icon-circle">
              <UploadCloud size={24} />
            </div>
            <h3 className="upload-main-title">Drop an audio file here</h3>
            <p className="upload-main-desc">
              Drop audio here or browse from your computer
            </p>
            <span className="upload-formats-badge">
              WAV · MP3 · FLAC · M4A
            </span>
            <button
              type="button"
              className="upload-choose-btn"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Choose audio file
            </button>
          </div>
        )}
      </div>

      <div className="sutra-actions-row" style={{ marginTop: '1.25rem' }}>
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
