# SIH26104 Voice Security Platform

## What is SIH26104?
This repository is for **Smart India Hackathon 2026 Problem Statement SIH26104**:
**"AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks."**

## Architecture
```text
audio input (file upload or browser mic recording)
→ audio preprocessing (soundfile, 16kHz resample, mono conversion, RMS normalization)
→ pretrained AASIST voice spoof detection (ASVspoof2019 LA)
→ optional pretrained ECAPA-TDNN speaker verification (SpeechBrain VoxCeleb)
→ explainable risk engine
→ FastAPI backend API
→ React + Vite + TypeScript frontend dashboard
→ SQLite report persistence (aiosqlite)
```

## Implemented Components
- **Backend**: FastAPI + Uvicorn server (`backend/app/main.py`)
- **Spoof Detector**: Pretrained AASIST model (`backend/app/models/spoof_detector.py`)
- **Speaker Verifier**: Pretrained ECAPA-TDNN (`backend/app/models/speaker_verifier.py`)
- **Risk Engine**: Multi-factor score normalization & explanation generator (`backend/app/services/risk_engine.py`)
- **Database**: SQLite async database (`backend/data/analysis.db`)
- **Frontend Dashboard**: React 18 + Vite + TypeScript + Lucide icons (`frontend/src/App.tsx`)
- **Test Suite**: 8 end-to-end integration tests (`backend/tests/test_api.py`)

## Running the Project

### 1. Backend Server
```bash
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```
Interactive API Docs available at `http://127.0.0.1:8000/docs`.

### 2. Run Backend Tests
```bash
cd backend
.\.venv\Scripts\pytest.exe -v
```

### 3. Frontend Application
```bash
cd frontend
npm install
npm run dev
```
Dashboard available at `http://localhost:5173`.
