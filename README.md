# SIH26104 Voice Security Platform

> A working MVP for detecting synthetic or cloned speech, verifying a claimed speaker identity, and turning those signals into an explainable risk decision.

## 1. Project Overview

This repository contains our implementation for **Smart India Hackathon 2026 Problem Statement SIH26104: "AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks."**

Modern voice-cloning systems can produce speech that sounds convincing enough to impersonate a real person. Because of this, speaker identity alone is not enough. A security system should examine both:

- Whether the speech itself appears genuine or synthetic.
- Whether the voice matches the claimed speaker when an identity is available.

SUTRA combines these checks into one local, demo-ready pipeline:

1. Accept an audio file or browser microphone recording.
2. Validate and preprocess the audio.
3. Run a pretrained **AASIST** anti-spoofing model.
4. Optionally compare the voice with an enrolled identity using **ECAPA-TDNN**.
5. Combine the signals with audio-quality indicators.
6. Generate an explainable risk score, risk level, confidence, reasons, and recommended action.
7. Store analysis results in SQLite for report/history access.

The system is designed to demonstrate several important cases:

- Genuine speech.
- Synthetic/spoofed speech.
- Speaker identity mismatch.
- Synthetic speech that strongly resembles an enrolled speaker.

The last case is especially important for demonstrating a possible **voice-cloning impersonation attack**.

---

## 2. Why We Built It This Way

Voice spoof detection and speaker verification answer different questions.

### Spoof Detection

**Question:** Does the acoustic signal resemble genuine human speech or synthetic/manipulated speech?

SUTRA uses the pretrained **AASIST** model for this.

### Speaker Verification

**Question:** Does this voice resemble the enrolled voice associated with a particular identity?

SUTRA uses **ECAPA-TDNN** speaker embeddings and cosine similarity for this.

### Risk Engine

**Question:** What should the system do when these signals agree or conflict?

For example, a high speaker similarity score does not automatically mean that an audio sample is safe. If the same sample is classified as spoofed, the combination can indicate an attempt to imitate an enrolled person.

The context-aware combination is implemented in:

```text
backend/app/services/risk_engine.py
```

The goal is therefore not simply:

```text
Fake / Real
```

but:

```text
Audio evidence
      +
Speaker identity evidence
      +
Audio quality
      ↓
Explainable security decision
```

---

## 3. System Architecture

```text
                    ┌──────────────────────────────┐
                    │       Audio Input            │
                    │  File Upload / Browser Mic   │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │     Audio Preprocessing      │
                    │ validation / mono / 16 kHz  │
                    │ silence / RMS / normalization│
                    └──────────────┬───────────────┘
                                   │
                     ┌─────────────┴─────────────┐
                     ▼                           ▼
          ┌─────────────────────┐     ┌─────────────────────┐
          │ AASIST Anti-Spoof   │     │ ECAPA-TDNN Speaker  │
          │ Genuine / Spoof     │     │ Enrollment / Match  │
          └──────────┬──────────┘     └──────────┬──────────┘
                     │                           │
                     └─────────────┬─────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │       Explainable Risk       │
                    │ score / level / confidence  │
                    │ factors / recommendation    │
                    └──────────────┬───────────────┘
                                   │
                     ┌─────────────┴─────────────┐
                     ▼                           ▼
          ┌─────────────────────┐     ┌─────────────────────┐
          │ FastAPI REST API    │     │ SQLite Reporting    │
          └──────────┬──────────┘     └─────────────────────┘
                     │
                     ▼
          ┌─────────────────────────┐
          │ React + Vite Dashboard  │
          └─────────────────────────┘
```

---

## 4. What Is Implemented

### Backend

- FastAPI + Uvicorn application.
- FastAPI `APIRouter` API structure.
- Request IDs for analysis operations.
- Structured logging with `structlog`.
- CORS configuration for the local frontend.
- Automatic OpenAPI documentation.
- Audio validation and preprocessing.
- Temporary-file cleanup.
- SQLite persistence through `aiosqlite`.
- Speaker enrollment and verification.
- Explainable risk assessment.

### Voice Spoof Detection

The project integrates the pretrained **AASIST** architecture.

- Model: `SpeechAntiSpoofingBenchmarks/AASIST`
- Checkpoint: `AASIST.pth`
- Input: 16 kHz mono waveform
- Runtime: PyTorch
- Model loading: Hugging Face Hub with local caching

AASIST provides evidence used to classify supplied audio as:

```text
bona_fide
```

or

```text
spoof
```

### Speaker Verification

The project integrates **ECAPA-TDNN** through SpeechBrain.

- Model: `speechbrain/spkrec-ecapa-voxceleb`
- Embedding size: 192 dimensions
- Runtime: SpeechBrain + PyTorch
- Verification method: cosine similarity
- Current verification threshold: `0.65`
- Enrollment storage: `backend/data/enrollments/`

Speaker embeddings are stored locally as `.npy` files and are excluded from Git.

### Explainable Risk Engine

The Risk Engine combines:

- AASIST spoof/genuine classification.
- Speaker similarity when an enrolled identity is supplied.
- Audio-quality indicators such as RMS level, silence, and clipping.
- Confidence adjustments when speaker verification is unavailable or audio quality is poor.

Current risk levels:

| Score | Level | Typical action |
|---:|---|---|
| `< 0.35` | LOW | Accept with standard verification |
| `0.35–0.54` | MEDIUM | Additional verification recommended |
| `0.55–0.74` | HIGH | Review before trusting |
| `>= 0.75` | CRITICAL | Reject / treat as high-risk |

The system also considers the combination of **synthetic speech + strong enrolled-speaker similarity** as a possible impersonation scenario.

### Frontend Dashboard

The React dashboard provides:

- Audio file upload as the primary input.
- Browser microphone recording as a secondary input.
- WAV recording compatible with the backend.
- Speaker enrollment interface.
- Speaker verification through the analysis workflow.
- Risk score and risk-level display.
- AASIST prediction and score information.
- Speaker similarity information.
- Explainable evidence/factor breakdown.
- Transcript display.
- Audio waveform and playback.
- Recommended action.
- Technical details in an expandable section.

The interface is intentionally focused on the input → analysis → result workflow rather than presenting a generic operations dashboard.

---

## 5. API Endpoints

All application endpoints are under:

```text
/api/v1
```

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/health` | Service and model health status |
| `GET` | `/api/v1/models/status` | Detailed model loading/status information |
| `POST` | `/api/v1/analyze` | Analyze an uploaded audio file with optional speaker information |
| `POST` | `/api/v1/enroll` | Enroll a reference audio sample for a speaker ID |
| `POST` | `/api/v1/speakers/{speaker_id}/verify` | Verify an audio sample against an enrolled speaker |
| `GET` | `/api/v1/reports` | Retrieve paginated analysis history |
| `GET` | `/api/v1/reports/{request_id}` | Retrieve one stored analysis report |

FastAPI also provides:

```text
/docs
/redoc
/openapi.json
```

when the backend is running.

---

## 6. Technologies and Integrations

### Core Stack

- **Python**
- **FastAPI**
- **Uvicorn**
- **PyTorch**
- **TorchAudio**
- **SoundFile**
- **SpeechBrain**
- **Hugging Face Hub**
- **SQLite**
- **aiosqlite**
- **structlog**
- **React 18**
- **TypeScript**
- **Vite**
- **Lucide React**

### Machine Learning

#### AASIST

Used for voice anti-spoofing / synthetic speech detection.

```text
SpeechAntiSpoofingBenchmarks/AASIST
```

#### ECAPA-TDNN

Used for speaker enrollment and identity verification.

```text
speechbrain/spkrec-ecapa-voxceleb
```

#### Whisper

Used for speech transcription and semantic analysis.

The application loads the required pretrained models locally and does not require a separate hosted inference server.

### Browser Audio

The microphone workflow uses browser audio APIs to capture microphone input and encode it into a 16-bit PCM WAV payload before sending it to the backend.

---

## 7. Running the Project on a New Device

The repository is designed to run locally after cloning.

### Prerequisites

Install:

- Git
- Python 3.11+ recommended
- Node.js + npm
- Internet access for the first model download

### Step 1: Clone the Repository

```powershell
git clone https://github.com/Saqib-Hussain-xo/SIH26104-voice-security.git
cd SIH26104-voice-security
```

### Step 2: Set Up the Backend

```powershell
cd backend
python -m venv .venv
.\\.venv\\Scripts\\activate
pip install -r requirements.txt
```

### Step 3: Start the Backend

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

The first model operation may take longer because pretrained model files can need to be downloaded and cached.

### Step 4: Set Up the Frontend

Open another terminal from the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

### Step 5: Analyze Audio

1. Open the SUTRA dashboard.
2. Use **Upload File** as the primary input method.
3. Select a supported audio file.
4. Start the analysis.
5. Review the risk verdict and evidence.
6. Check the transcript and waveform when available.
7. For speaker verification, enroll a reference speaker first.
8. Supply the enrolled speaker ID during analysis.
9. Review the speaker similarity and combined risk result.

---

## 8. Production Deployment Guide

For a public demonstration, the general deployment architecture is:

```text
INTERNET
   │
   ▼ HTTPS
┌─────────────────────────────────┐
│ Production Frontend             │
│ React + Vite + TypeScript       │
└────────────────┬────────────────┘
                 │
                 ▼ HTTPS
┌─────────────────────────────────┐
│ FastAPI Backend                 │
│ PyTorch + AASIST + ECAPA-TDNN   │
└────────────────┬────────────────┘
                 │
       ┌─────────┼─────────┐
       ▼         ▼         ▼
    AASIST    ECAPA     SQLite
   Anti-Spoof  Speaker   Reports
```

Possible hosting options include a static frontend platform and a Python-capable backend host or VPS.

### Production Environment

Use environment variables rather than hardcoding deployment-specific values.

Example:

```text
APP_ENV=production
CORS_ORIGINS=https://your-frontend-domain.com
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
VITE_API_BASE_URL=https://your-backend-domain.com
```

### Production Server

Do not use `--reload` in production.

Example:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
```

Production deployment should also use HTTPS and restrict CORS to the actual frontend domain.

---

## 9. Running the Tests

From the `backend/` directory with the virtual environment active:

```powershell
.\\.venv\\Scripts\\pytest.exe -v
```

The backend test suite covers important application behavior including:

- Health endpoint.
- Model status.
- Audio analysis.
- Invalid requests.
- Report persistence.
- Report retrieval.
- Speaker enrollment.
- Speaker verification.
- Spoof-risk consistency.
- Microphone WAV payload handling.

The frontend production build can be checked with:

```powershell
cd frontend
npm run build
```

A successful build should complete without TypeScript or compilation errors.

---

## 10. Evaluation

The `evaluation/` directory contains:

```text
evaluation/evaluate_dataset.py
```

The script can run the AASIST pipeline over supplied audio samples and report information such as:

- Ground-truth label when supplied.
- AASIST prediction.
- Raw model scores.
- System risk score.
- Risk level.
- Processing time.

Run it from the `evaluation/` directory:

```powershell
cd evaluation
..\\backend\\.venv\\Scripts\\python.exe evaluate_dataset.py
```

The repository also contains validation and reproduction material under:

```text
docs/
evidence/
```

These are useful when verifying that the implemented pipeline was actually exercised rather than relying only on documentation claims.

---

## 11. Validation Status

The current implementation has been exercised end-to-end with:

- **10/10 backend integration tests passing**.
- **Frontend production build passing with 0 errors**.
- Real AASIST inference.
- Real ECAPA-TDNN speaker enrollment and verification.
- Same-speaker verification checks.
- Different-speaker verification checks.
- Browser microphone WAV analysis.
- SQLite report persistence.
- Benchmark spoof-sample evaluation.
- Regression coverage for earlier spoof-risk logic.

The repository contains captured validation outputs under:

```text
evidence/
```

and detailed written evidence under:

```text
docs/EVIDENCE.md
```

These results demonstrate that the application pipeline is operational.

They should **not** be interpreted as a universal accuracy guarantee for every voice, language, recording device, codec, or attack type.

---

## 12. Security and Data Handling

The current MVP follows a local-processing approach.

### Audio

- Uploaded audio is written to temporary UUID-based files during processing.
- Temporary analysis files are removed after processing.
- Raw audio is not intended to be stored permanently as part of the analysis database.

### Reports

SQLite stores analysis metadata and results for report/history functionality.

### Speaker Enrollment

Speaker enrollment embeddings are stored locally under:

```text
backend/data/enrollments/
```

These generated files are excluded from Git.

### Model Files

Downloaded model checkpoints are cached locally and are not committed to the repository.

### Git Hygiene

`.gitignore` excludes generated/runtime material such as:

- Python virtual environments.
- Node modules.
- SQLite databases.
- Temporary audio.
- Speaker enrollment embeddings.
- Downloaded model assets.

### Important Scope Boundary

SUTRA does **not** intercept, tap, or inspect ordinary cellular calls at the GSM, PSTN, VoLTE, or baseband/network layer.

It currently analyzes supplied audio files and browser microphone recordings.

---

## 13. Scope and Limitations

This is a working MVP and demonstration system, not a production telecommunications or banking security appliance.

### Current Limitations

- The system processes supplied audio rather than directly intercepting phone calls.
- AASIST is based on anti-spoofing benchmark data, so performance can vary outside its training/evaluation distribution.
- Heavy background noise can affect model performance.
- Telephony compression and low-bandwidth audio can affect model performance.
- Different accents and languages may produce different results.
- Multilingual performance requires additional evaluation before making strong claims.
- CPU inference can be slower than a production GPU deployment.
- Model scores are evidence/signals and should not be interpreted as calibrated probabilities of fraud.
- The current WebRTC microphone workflow is browser-based rather than continuous telephony interception.
- The risk engine is an explainable decision layer, not a formally calibrated fraud model.

### Important Interpretation

A result such as:

```text
Risk Score: 0.80
```

does **not** mean:

```text
80% probability of fraud
```

The risk score is a normalized application-level decision signal derived from multiple pieces of evidence.

Similarly, a speaker match does not prove that an audio recording is genuine. Synthetic speech can potentially resemble a real speaker, which is why spoof detection and speaker verification are evaluated together.

---

## 14. Repository Structure

```text
SIH26104-voice-security/
│
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI routes
│   │   ├── models/           # AASIST + ECAPA-TDNN integrations
│   │   ├── schemas/          # Request/data schemas
│   │   ├── services/         # Audio, database, risk engine
│   │   └── utils/            # Logging utilities
│   │
│   ├── tests/                # Backend integration tests
│   ├── requirements.txt
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── components/       # Dashboard UI components
│   │   └── services/         # Backend API client
│   ├── package.json
│   └── README.md
│
├── evaluation/
│   ├── evaluate_dataset.py   # Evaluation script
│   └── README.md
│
├── docs/
│   ├── API.md                # API documentation
│   ├── ARCHITECTURE.md       # Architecture notes
│   ├── DATA_SOURCES.md       # Data/model sources
│   ├── DEMO_SCRIPT.md        # Demo workflow
│   ├── EVALUATION_PROTOCOL.md
│   ├── EVIDENCE.md           # Validation evidence
│   ├── FINAL_REPRODUCTION.md # Reproduction steps
│   ├── FRONTEND_HANDOFF.md   # Frontend/backend integration notes
│   └── KNOWN_LIMITATIONS.md  # Current limitations
│
├── evidence/
│   ├── api/                  # Captured API responses
│   ├── speaker/              # Speaker verification evidence
│   ├── tests/                # Test evidence
│   └── *.json                # Additional validation outputs
│
├── scripts/
│   └── README.md             # Utility-script directory notes
│
├── .env.example
├── .gitignore
└── README.md
```

---

## The SIH Solution in One Sentence

**SUTRA turns an audio clip into a security decision by combining acoustic spoof detection, speaker identity verification, audio-quality checks, transcription/context signals, and explainable risk scoring in one FastAPI + React system.**
```
