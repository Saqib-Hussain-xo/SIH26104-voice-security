# SIH26104 Voice Security Platform — API Contract Documentation

## Base URL
`http://127.0.0.1:8000/api/v1`

Interactive OpenAPI / Swagger UI: `http://127.0.0.1:8000/docs`
OpenAPI JSON Schema: `http://127.0.0.1:8000/openapi.json`

---

## Endpoints

### 1. System Health
* **URL**: `GET /health`
* **Response**: `200 OK`
```json
{
  "status": "healthy",
  "spoof_detector_loaded": true,
  "speaker_verifier_loaded": true,
  "version": "0.1.0"
}
```

### 2. Model Status
* **URL**: `GET /models/status`
* **Response**: `200 OK`
```json
{
  "spoof_detector": {
    "model_name": "AASIST",
    "model_version": "ASVspoof2019-LA",
    "sample_rate": 16000,
    "input_format": "raw waveform, mono, 16kHz, 64600 samples (4.04s)",
    "loaded": true
  },
  "speaker_verifier": {
    "model_name": "ECAPA-TDNN",
    "model_version": "VoxCeleb1+2 (SpeechBrain)",
    "embedding_dim": 192,
    "loaded": true
  }
}
```

### 3. Analyze Audio
* **URL**: `POST /analyze`
* **Content-Type**: `multipart/form-data`
* **Parameters**:
  - `audio` (file, required): Audio file (`.wav`, `.mp3`, `.m4a`, `.flac`, `.ogg`)
  - `speaker_id` (string, optional): Enrolled speaker identity to verify against
* **Response**: `200 OK`
```json
{
  "request_id": "9e40efe1-dc62-4501-888b-351def828a93",
  "timestamp": "2026-08-28 13:54:23",
  "spoof_detection": {
    "model_name": "AASIST",
    "model_version": "ASVspoof2019-LA",
    "raw_score": -0.6989626288414001,
    "score_type": "bona_fide_logit",
    "interpretation": "Bona fide logit: -0.6990, Spoof logit: -0.2442...",
    "label": "spoof",
    "inference_time_ms": 535.04,
    "available": true,
    "error": null
  },
  "speaker_verification": {
    "enabled": false,
    "model_name": null,
    "similarity": null,
    "verified": null
  },
  "risk_assessment": {
    "risk_score": 0.36,
    "risk_level": "MEDIUM",
    "confidence": 0.55,
    "reasons": [...],
    "recommended_action": "CAUTION: Uncertain result. Consider additional verification steps."
  },
  "processing_time_ms": 540.93
}
```

### 4. Enroll Speaker
* **URL**: `POST /enroll`
* **Content-Type**: `multipart/form-data`
* **Parameters**:
  - `speaker_id` (string, required): Unique identifier for speaker
  - `audio` (file, required): Reference voice clip file
* **Response**: `200 OK`
```json
{
  "status": "success",
  "speaker_id": "user_101",
  "message": "Speaker user_101 successfully enrolled"
}
```

### 5. Verify Enrolled Speaker Direct
* **URL**: `POST /speakers/{speaker_id}/verify`
* **Content-Type**: `multipart/form-data`
* **Parameters**:
  - `audio` (file, required): Test voice clip file
* **Response**: `200 OK`
```json
{
  "speaker_id": "user_101",
  "verified": true,
  "similarity": 0.9854,
  "threshold": 0.65,
  "model_name": "ECAPA-TDNN",
  "inference_time_ms": 312.4,
  "error": null
}
```

### 6. List Analysis Reports
* **URL**: `GET /reports?limit=50&offset=0`
* **Response**: `200 OK`
```json
{
  "reports": [
    {
      "request_id": "9e40efe1-dc62-4501-888b-351def828a93",
      "timestamp": "2026-08-28 13:54:23",
      "filename": "test_audio.wav",
      "duration_sec": 1.999875,
      "spoof_score": -0.698962,
      "spoof_label": "spoof",
      "risk_level": "MEDIUM",
      "risk_score": 0.36
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

### 7. Get Report By ID
* **URL**: `GET /reports/{request_id}`
* **Response**: `200 OK`
