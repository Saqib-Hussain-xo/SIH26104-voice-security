export interface SpoofDetectionResult {
  model_name: string;
  model_version: string;
  raw_score: number;
  score_type: string;
  interpretation: string;
  label: 'bona_fide' | 'spoof' | 'unknown' | 'error';
  inference_time_ms: number;
  available: boolean;
  error?: string | null;
}

export interface SpeakerVerificationResult {
  enabled: boolean;
  model_name?: string | null;
  model_version?: string | null;
  similarity?: number | null;
  threshold?: number | null;
  verified?: boolean | null;
  inference_time_ms?: number | null;
  available: boolean;
  error?: string | null;
}

export interface ThreatIndicator {
  indicator_type: string;
  category: string;
  weight: number;
  matched_terms: string[];
  snippet: string;
}

export interface SemanticThreatResult {
  transcript: string;
  semantic_risk_score: number;
  threat_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detected_indicators: ThreatIndicator[];
  recommended_action: string;
  asr_model?: string;
  inference_time_ms?: number;
}

export interface RiskReason {
  factor: string;
  status: string;
  reason: string;
  impact: string;
  value?: number;
}

export interface RiskAssessment {
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  acoustic_risk_score?: number;
  semantic_risk_score?: number;
  reasons: RiskReason[];
  explanation?: string;
  recommended_action: string;
}

export interface AnalyzeResponse {
  request_id: string;
  timestamp: string;
  spoof_detection: SpoofDetectionResult;
  speaker_verification: SpeakerVerificationResult;
  semantic_threat_analysis?: SemanticThreatResult;
  risk_assessment: RiskAssessment;
  processing_time_ms: number;
}

export interface HealthStatus {
  status: string;
  spoof_detector_loaded: boolean;
  speaker_verifier_loaded: boolean;
  asr_transcriber_loaded?: boolean;
  semantic_analyzer_loaded?: boolean;
  version: string;
}

export interface ModelStatus {
  spoof_detector: {
    model_name?: string;
    model_version?: string;
    sample_rate?: number;
    input_format?: string;
    loaded: boolean;
    error?: string;
  };
  speaker_verifier: {
    model_name?: string;
    model_version?: string;
    embedding_dim?: number;
    loaded: boolean;
    error?: string;
  };
  asr_transcriber?: {
    model_name?: string;
    loaded: boolean;
  };
  semantic_analyzer?: {
    loaded: boolean;
    categories_tracked?: number;
  };
}

export interface ReportSummary {
  request_id: string;
  timestamp: string;
  filename: string;
  duration_sec: number;
  spoof_score: number;
  spoof_label: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  transcript?: string;
  semantic_risk_score?: number;
  threat_level?: string;
}

export interface ReportListResponse {
  reports: ReportSummary[];
  total: number;
  limit: number;
  offset: number;
}
