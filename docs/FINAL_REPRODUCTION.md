# SIH26104 Voice Security Platform — Final Reproduction & Audit Guide

## Executive Summary
This document provides the exact end-to-end instructions for building, testing, verifying, and evaluating the SIH26104 Voice Security MVP.

---

## 1. System Requirements & Dependency Versions
- **OS**: Windows 10/11
- **Python**: `3.14.7`
- **Node.js**: `v20.x` or `v22.x`
- **Primary Python Packages**:
  - `fastapi==0.141.1`
  - `pydantic==2.13.4`
  - `torch==2.11.0`
  - `speechbrain==1.0.3`
  - `huggingface-hub==0.24.6`
  - `soundfile==0.13.1`
  - `aiosqlite==0.21.0`
  - `pytest==8.3.3`
- **Primary Frontend Packages**:
  - `react==18.3.1`
  - `vite==5.4.21`
  - `typescript==5.5.3`
  - `lucide-react==0.446.0`

---

## 2. Environment Setup
```powershell
# 1. Clone repository & cd to root
cd c:\Users\saqib\Documents\GitHub\SIH26104-voice-security

# 2. Activate Python virtual environment
cd backend
.\.venv\Scripts\activate
pip install -r requirements.txt

# 3. Install Frontend Dependencies
cd ..\frontend
npm install
```

---

## 3. Execution Commands

### A. Run Backend API Server
```powershell
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- **API Base URL**: `http://127.0.0.1:8000/api/v1`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **OpenAPI JSON Spec**: `http://127.0.0.1:8000/openapi.json`

### B. Run Frontend Dashboard
```powershell
cd frontend
npm run dev
```
- **Dashboard URL**: `http://localhost:5173`

### C. Run Backend Test Suite (9 Tests)
```powershell
cd backend
.\.venv\Scripts\pytest.exe -v
```

### D. Run Frontend Production Build
```powershell
cd frontend
npm run build
```

---

## 4. Empirical Test Audio Artifacts & Ground Truth
- **`backend/test_audio.wav`**:
  - **Source**: ASVspoof2019 LA Logical Access Evaluation Benchmark Sample
  - **Ground Truth**: `spoof` (synthetic voice clone)
  - **Duration**: 1.99s, 16kHz mono PCM
  - **Model Inference**: AASIST logit `-0.6990`, Softmax bona fide probability `0.3882` (38.82%)
- **`backend/speaker_a1.wav`**: Enrolled Voice Reference (Speaker Alpha, 220Hz fundamental tone)
- **`backend/speaker_a2.wav`**: Same Speaker (Speaker Alpha, different recording clip, similarity `0.9159` -> `Verified = True`)
- **`backend/speaker_b.wav`**: Different Speaker (Speaker Beta, 600Hz tone, similarity `0.6294` -> `Verified = False`)

---

## 5. Distinction Between Scores & Risk Assessment Metrics

| Metric | Origin | Definition | Range |
|---|---|---|---|
| **Raw AASIST Logit** | ML Model | Raw logit output for `bona_fide` class from AASIST model. Higher is more genuine. | `[-inf, +inf]` (Log-likelihood) |
| **Bona Fide Probability** | ML Model | Softmax pseudo-probability of genuine human speech from AASIST. | `[0.0, 1.0]` |
| **Speaker Similarity** | ML Model | Cosine similarity between 192-dim ECAPA-TDNN embeddings. | `[-1.0, +1.0]` |
| **System Risk Score** | Risk Engine | Combined heuristic risk metric aggregating spoof evidence, speaker match status, and audio RMS. | `[0.0, 1.0]` |
| **System Confidence** | Risk Engine | Degree of certainty based on model availability, speaker enrollment, and audio quality. | `[0.0, 1.0]` |
