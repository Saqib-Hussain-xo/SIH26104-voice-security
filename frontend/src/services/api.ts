import { AnalyzeResponse, HealthStatus, ModelStatus } from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL
  ? `${(import.meta as any).env.VITE_API_BASE_URL.replace(/\/$/, '')}/api/v1`
  : '/api/v1';

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to fetch health status');
  return res.json();
}

export async function fetchModelStatus(): Promise<ModelStatus> {
  const res = await fetch(`${API_BASE}/models/status`);
  if (!res.ok) throw new Error('Failed to fetch model status');
  return res.json();
}

export async function analyzeAudio(
  file: File | Blob,
  filename: string = 'recording.wav',
  speakerId?: string
): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append('audio', file, filename);
  if (speakerId) {
    formData.append('speaker_id', speakerId);
  }

  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Analysis request failed' }));
    throw new Error(errorData.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function enrollSpeaker(speakerId: string, file: File | Blob, filename: string = 'enrollment.wav'): Promise<any> {
  const formData = new FormData();
  formData.append('speaker_id', speakerId);
  formData.append('audio', file, filename);

  const res = await fetch(`${API_BASE}/enroll`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Enrollment failed' }));
    throw new Error(errorData.error || `HTTP ${res.status}`);
  }

  return res.json();
}
