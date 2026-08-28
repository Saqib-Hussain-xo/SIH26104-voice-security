from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class SpoofDetectionResponse(BaseModel):
    model_name: str
    model_version: str
    raw_score: float
    score_type: str
    interpretation: str
    label: str
    inference_time_ms: float
    available: bool
    error: Optional[str] = None


class SpeakerVerificationResponse(BaseModel):
    enabled: bool
    model_name: Optional[str] = None
    model_version: Optional[str] = None
    similarity: Optional[float] = None
    threshold: Optional[float] = None
    verified: Optional[bool] = None
    inference_time_ms: Optional[float] = None
    available: bool = False
    error: Optional[str] = None


class RiskAssessmentResponse(BaseModel):
    risk_score: float
    risk_level: str
    confidence: float
    reasons: List[Dict[str, Any]]
    recommended_action: str


class AnalyzeResponse(BaseModel):
    request_id: str
    timestamp: datetime
    spoof_detection: SpoofDetectionResponse
    speaker_verification: SpeakerVerificationResponse
    risk_assessment: RiskAssessmentResponse
    processing_time_ms: float


class HealthResponse(BaseModel):
    status: str
    spoof_detector_loaded: bool
    speaker_verifier_loaded: bool
    version: str


class ModelsStatusResponse(BaseModel):
    spoof_detector: Dict[str, Any]
    speaker_verifier: Dict[str, Any]


class ReportSummary(BaseModel):
    request_id: str
    timestamp: datetime
    filename: str
    duration_sec: float
    spoof_score: float
    spoof_label: str
    risk_level: str
    risk_score: float


class ReportListResponse(BaseModel):
    reports: List[ReportSummary]
    total: int
    limit: int
    offset: int


class ReportDetailResponse(BaseModel):
    request_id: str
    timestamp: datetime
    filename: str
    duration_sec: float
    spoof_model_name: str
    spoof_model_version: str
    spoof_score: float
    spoof_label: str
    spoof_interpretation: str
    speaker_id: Optional[str] = None
    speaker_model_name: Optional[str] = None
    speaker_model_version: Optional[str] = None
    speaker_similarity: Optional[float] = None
    speaker_verified: Optional[bool] = None
    risk_score: float
    risk_level: str
    confidence: float
    explanation: str
    recommended_action: str
    processing_time_ms: int
    model_versions: str