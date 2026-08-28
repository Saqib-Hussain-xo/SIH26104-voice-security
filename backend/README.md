# Backend

The backend is the core analysis service for the SIH26104 Voice Security Platform. It is a working **FastAPI + PyTorch + SpeechBrain** application that receives audio, preprocesses it, runs voice spoof detection, optionally verifies a claimed speaker, calculates an explainable risk assessment, and stores analysis reports in SQLite.

## What the Backend Does

The backend currently provides:

- Audio upload validation.
- WAV/MP3/M4A/FLAC/OGG input handling through the audio-processing layer.
- 16 kHz mono preprocessing and resampling.
- Silence, duration, RMS and clipping checks.
- Temporary-file cleanup after processing.
- Pretrained **AASIST** voice spoof detection.
- Pretrained **ECAPA-TDNN** speaker enrollment and verification.
- Cosine-similarity based speaker matching.
- Context-aware impersonation risk assessment.
- Explainable risk factors and recommended actions.
- SQLite persistence with `aiosqlite`.
- Request IDs and structured logging.
- Automatic OpenAPI documentation through FastAPI.

## Model Integrations

### AASIST

The spoof detector uses:

```text
SpeechAntiSpoofingBenchmarks/AASIST
```

with the `AASIST.pth` checkpoint. The model processes 16 kHz waveform input and returns evidence used to classify an input as `bona_fide` or `spoof`.

The checkpoint is obtained through Hugging Face Hub when required and is cached locally rather than committed to the repository.

### ECAPA-TDNN

Speaker verification uses:

```text
speechbrain/spkrec-ecapa-voxceleb
```

The integration creates 192-dimensional speaker embeddings and compares a test recording against a locally enrolled reference embedding using cosine similarity. The current verification threshold is `0.65`.

Enrollment embeddings are stored locally in:

```text
data/enrollments/<speaker_id>.npy
```

These generated files are ignored by Git.

## Risk Engine

`app/services/risk_engine.py` combines three types of evidence:

1. **Spoof evidence** from AASIST.
2. **Speaker evidence** from ECAPA-TDNN when a speaker ID is supplied.
3. **Audio quality evidence** such as silence, clipping and RMS level.

A particularly important rule is the interaction between spoof detection and speaker verification. A high speaker similarity does not automatically make audio safe. When a clip is classified as spoofed and also strongly resembles an enrolled speaker, the engine treats the combination as potential **voice-cloning impersonation** and increases the risk.

Risk levels are:

```text
LOW       < 0.35
MEDIUM    0.35 - 0.54
HIGH      0.55 - 0.74
CRITICAL  >= 0.75
```

The engine returns a normalized score, level, confidence, factor breakdown, explanation and recommended action.

## API

All application routes are under `/api/v1`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/health` | Backend and model health status |
| GET | `/api/v1/models/status` | Detailed AASIST and ECAPA-TDNN status |
| POST | `/api/v1/analyze` | Analyze an audio file with optional `speaker_id` and `language_hint` |
| POST | `/api/v1/enroll` | Enroll a speaker reference recording |
| POST | `/api/v1/speakers/{speaker_id}/verify` | Verify a recording against an enrolled speaker |
| GET | `/api/v1/reports` | Paginated analysis history |
| GET | `/api/v1/reports/{request_id}` | Retrieve one stored report |

FastAPI also provides `/docs`, `/redoc` and `/openapi.json`.

## Project Structure

```text
backend/
├── app/
│   ├── api/
│   │   └── routes.py             # FastAPI endpoints
│   ├── models/
│   │   ├── spoof_detector.py     # AASIST integration
│   │   └── speaker_verifier.py   # ECAPA-TDNN integration
│   ├── schemas/
│   │   └── requests.py            # API schemas
│   ├── services/
│   │   ├── audio.py               # Validation + preprocessing
│   │   ├── database.py            # SQLite persistence
│   │   └── risk_engine.py          # Explainable risk scoring
│   ├── utils/
│   │   └── logging.py             # Structured logging
│   ├── config.py
│   └── main.py                    # FastAPI application entry point
├── tests/
│   └── test_api.py                # Integration/regression tests
├── requirements.txt
└── README.md
```

## Local Setup

From the repository root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Start the server:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

The pretrained models may be downloaded the first time they are needed, so the first inference can take longer than later requests.

## Tests

Run from `backend/`:

```powershell
.\.venv\Scripts\pytest.exe -v
```

The current suite covers health checks, model status, successful and invalid analysis requests, report persistence/retrieval, speaker enrollment/verification, spoof-risk regression behavior, and microphone WAV payload support.

## Current Validation

The implementation has been validated end-to-end with the local API and frontend, including real AASIST inference, real ECAPA-TDNN speaker matching, speaker mismatch testing, browser microphone input, SQLite report persistence, and the frontend production build.

## Important Scope Boundary

This backend analyzes supplied audio. It does **not** intercept ordinary GSM/PSTN cellular calls or operate at the baseband/network layer.

It is an MVP security-analysis service. Model outputs and risk scores are signals for decision support, not universal guarantees of authenticity or fraud probability.
