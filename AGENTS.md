# AGENTS.md - SIH26104 Voice Security Platform

## Project Status

This repository contains a working MVP for **Smart India Hackathon 2026 Problem Statement SIH26104: "AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks."**

The backend, pretrained model integrations, frontend dashboard, evaluation routine and automated tests are implemented. Treat the repository as an active working project, not an empty scaffold.

## Current Tech Stack

- **Backend:** Python + FastAPI + Uvicorn
- **ML runtime:** PyTorch / TorchAudio
- **Spoof detection:** AASIST (`SpeechAntiSpoofingBenchmarks/AASIST`)
- **Speaker verification:** ECAPA-TDNN (`speechbrain/spkrec-ecapa-voxceleb`)
- **Audio processing:** SoundFile + PyTorch resampling/normalization
- **Persistence:** SQLite + aiosqlite
- **Logging:** structlog
- **Frontend:** React 18 + Vite + TypeScript + Lucide React
- **Evaluation:** Python evaluation routine under `evaluation/`
- **Tests:** pytest + pytest-asyncio + httpx

## Repository Structure

```text
/
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI routes
│   │   ├── models/           # AASIST + ECAPA-TDNN integrations
│   │   ├── schemas/          # API schemas
│   │   ├── services/         # Audio, database and risk engine
│   │   └── utils/             # Logging
│   ├── tests/                # Backend integration/regression tests
│   ├── requirements.txt
│   └── README.md
├── frontend/                 # React + Vite + TypeScript dashboard
├── models/                   # Model asset documentation; runtime integrations live in backend/app/models/
├── evaluation/               # Evaluation routine and documentation
├── docs/                     # Architecture, API, demo, evidence and limitations
├── evidence/                 # Captured validation outputs
├── scripts/                  # Reserved project utility-script directory
├── .env.example
├── DECISIONS.md
├── KNOWN_LIMITATIONS.md
└── README.md
```

## Key Constraints

- Keep the architecture simple and suitable for local demonstration.
- Use pretrained models rather than adding unnecessary from-scratch training infrastructure.
- Do **not** claim universal detection accuracy from a few samples.
- Model scores are evidence/signals, not calibrated fraud probabilities.
- The current system analyzes supplied files and browser microphone recordings.
- The system does **not** intercept ordinary GSM/PSTN cellular calls or operate at the baseband/network layer.
- Keep generated databases, enrollment embeddings, temporary audio, model checkpoints, virtual environments and Node modules out of Git.

## Architecture Flow

```text
Audio Input
  → Audio Preprocessing
  → AASIST Spoof Detection
  → optional ECAPA-TDNN Speaker Verification
  → Explainable Risk Engine
  → FastAPI API
  → React Dashboard
  → SQLite Reporting
```

## Active API Endpoints

Under `/api/v1`:

- `GET /health`
- `GET /models/status`
- `POST /analyze`
- `POST /enroll`
- `POST /speakers/{speaker_id}/verify`
- `GET /reports`
- `GET /reports/{request_id}`

FastAPI documentation is available at `/docs`, `/redoc` and `/openapi.json` when the server is running.

## Development Commands

### Backend

From `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Backend tests

```powershell
.\.venv\Scripts\pytest.exe -v
```

### Frontend

From `frontend/`:

```powershell
npm install
npm run dev
```

Production build:

```powershell
npm run build
```

### Evaluation

From `evaluation/`:

```powershell
..\backend\.venv\Scripts\python.exe evaluate_dataset.py
```

## Environment

Use `.env.example` as the environment template. Do not commit real `.env` files or credentials.

## Model Assets

Model checkpoints are downloaded/cached as required and are not committed to Git. Speaker enrollment embeddings are generated locally under `backend/data/enrollments/` and are ignored by Git.

## Development Guidance

Before modifying the application:

1. Read the relevant current code and README for the component.
2. Preserve the existing FastAPI/React architecture unless a change is necessary.
3. Run the backend tests after backend changes.
4. Run `npm run build` after frontend changes.
5. Do not replace real model inference with hardcoded/demo scores.
6. Keep security and scope claims accurate.
7. Update documentation when behavior or API contracts change.

## Validation Baseline

The current documented validation baseline is:

- Backend integration/regression suite: **10/10 passing**.
- Frontend production build: **0 errors**.
- Real AASIST spoof/genuine inference exercised.
- Real ECAPA-TDNN speaker match and mismatch exercised.
- Browser microphone WAV analysis exercised.
- SQLite report persistence exercised.

The validation baseline is evidence of an operational MVP, not a guarantee that every possible audio sample or attack will be classified correctly.
