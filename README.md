# SIH26104 Voice Security Platform

> A working MVP for detecting synthetic or cloned speech, verifying a claimed speaker identity, and turning those signals into an explainable risk decision.

## 1. Project Overview

This repository contains our implementation for **Smart India Hackathon 2026 Problem Statement SIH26104: "AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks."**

The problem is increasingly important because modern voice-cloning systems can produce speech that sounds convincing enough to impersonate a real person. A voice may therefore sound familiar while still being synthetic. A useful security system cannot rely on speaker identity alone. It needs to examine both **whether the speech itself appears genuine** and, when an identity is known, **whether the voice matches the claimed speaker**.

Our approach combines those two questions into one local, demo-ready security pipeline:

1. Accept an audio file or a browser microphone recording.
2. Normalize and validate the audio for model input.
3. Run a pretrained **AASIST** voice anti-spoofing model.
4. Optionally compare the voice against an enrolled identity using **ECAPA-TDNN** speaker embeddings.
5. Combine the evidence with audio-quality signals in an explainable **Risk Engine**.
6. Return a risk score, risk level, confidence, reasons, and recommended action.
7. Store the analysis report in SQLite so previous scans can be reviewed from the dashboard.

The result is not just a binary "fake/real" screen. It is a security workflow that can demonstrate the difference between **genuine speech**, **synthetic speech**, **speaker mismatch**, and the particularly important case of **synthetic speech that resembles an enrolled person**, which the risk engine treats as a possible voice-cloning impersonation attack.

## 2. Why We Built It This Way

The core challenge in voice-cloning impersonation is that **speaker recognition and spoof detection answer different questions**.

- **Spoof detection:** Does the acoustic signal resemble genuine human speech or synthetic/replayed/manipulated speech?
- **Speaker verification:** Does this speech resemble the enrolled voice associated with a particular identity?
- **Risk engine:** What should the system do when these signals agree or conflict?

For example, a high speaker similarity by itself should not automatically mean that an audio clip is safe. If the same clip is classified as spoofed, a strong identity match can actually make the situation more suspicious because it may indicate an attempt to imitate an enrolled person.

That context-aware combination is implemented in `backend/app/services/risk_engine.py`.

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

## 4. What Is Implemented

### Backend

- FastAPI + Uvicorn application.
- Standard FastAPI `APIRouter` API structure.
- Request IDs for analysis operations.
- Structured logging with `structlog`.
- CORS configuration for the local frontend.
- Automatic OpenAPI documentation through FastAPI.
- Audio validation and preprocessing.
- Temporary-file cleanup after processing.
- SQLite persistence through `aiosqlite`.
- Speaker enrollment and verification.
- Explainable risk assessment.

### Voice Spoof Detection

The project integrates the pretrained **AASIST** architecture using the checkpoint:

- Model: `SpeechAntiSpoofingBenchmarks/AASIST`
- Checkpoint: `AASIST.pth`
- Input: 16 kHz mono waveform
- Runtime: PyTorch
- Model loading: Hugging Face Hub download with local caching

AASIST produces model evidence used to classify the supplied audio as `bona_fide` or `spoof`.

### Speaker Verification

The project integrates **ECAPA-TDNN** through SpeechBrain:

- Model source: `speechbrain/spkrec-ecapa-voxceleb`
- Embedding size: 192 dimensions
- Runtime: SpeechBrain + PyTorch
- Verification method: cosine similarity
- Current verification threshold: `0.65`
- Enrollment: speaker embeddings are stored as `.npy` files under `backend/data/enrollments/`

### Explainable Risk Engine

The Risk Engine combines:

- AASIST spoof/genuine classification.
- Speaker similarity when an enrolled identity is supplied.
- Audio-quality indicators such as RMS level, silence, and clipping.
- Confidence adjustments when speaker verification is unavailable or audio quality is poor.

Risk levels are:

| Score | Level | Typical action |
|---:|---|---|
| `< 0.35` | LOW | Accept with standard verification |
| `0.35–0.54` | MEDIUM | Additional verification recommended |
| `0.55–0.74` | HIGH | Review before trusting |
| `>= 0.75` | CRITICAL | Reject / treat as high-risk |

The engine also detects the important combination of **synthetic speech + strong enrolled-speaker similarity** as an impersonation scenario and increases the risk accordingly.

### Frontend Dashboard

The React dashboard provides:

- Audio file upload.
- Browser microphone recording.
- WAV recording compatible with the backend audio parser.
- Speaker enrollment interface.
- Speaker verification through the analysis workflow.
- Risk score and risk-level display.
- AASIST prediction and score information.
- Speaker similarity information.
- Explainable factor breakdown.
- Recommended action.
- Historical scan table backed by SQLite reports.

## 5. API Endpoints

All application endpoints are under `/api/v1`.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/health` | Service and model health status |
| `GET` | `/api/v1/models/status` | Detailed model loading/status information |
| `POST` | `/api/v1/analyze` | Analyze an uploaded audio file, with optional `speaker_id` and `language_hint` |
| `POST` | `/api/v1/enroll` | Enroll a reference audio sample for a speaker ID |
| `POST` | `/api/v1/speakers/{speaker_id}/verify` | Verify an audio sample against an enrolled speaker |
| `GET` | `/api/v1/reports` | Paginated analysis history |
| `GET` | `/api/v1/reports/{request_id}` | Retrieve one stored analysis report |

FastAPI also exposes:

- `/docs` for Swagger UI.
- `/redoc` for ReDoc.
- `/openapi.json` for the OpenAPI schema.

## 6. Technologies and Integrations

### Core stack

- **Python**
- **FastAPI**
- **Uvicorn**
- **PyTorch / TorchAudio**
- **SoundFile**
- **SpeechBrain**
- **Hugging Face Hub**
- **SQLite / aiosqlite**
- **structlog**
- **React 18**
- **TypeScript**
- **Vite**
- **Lucide React**

### External model services/resources

The application retrieves pretrained model checkpoints from Hugging Face when they are first required. The application itself does not require a separate hosted inference server for these models.

### Browser APIs

The microphone workflow uses browser audio capabilities to capture the user's microphone input and encode it as a valid 16-bit PCM WAV payload before sending it to the backend.

## 7. Running the Project on a New Device

The repository is designed to be cloned and run locally. Model checkpoints, virtual environments, Node modules, generated databases, and temporary audio are not required to be committed to Git.

### Prerequisites

- Git
- Python 3.11+ recommended for the project environment
- Node.js + npm
- Internet access on the first model download

### Step 1: Clone

```powershell
git clone https://github.com/Saqib-Hussain-xo/SIH26104-voice-security.git
cd SIH26104-voice-security
```

### Step 2: Create the backend environment

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

### Step 3: Start the backend

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open the API documentation at:

```text
http://127.0.0.1:8000/docs
```

The first real model operation can download the required pretrained checkpoint(s), so the first run may take longer than subsequent runs.

### Step 4: Start the frontend

Open a second PowerShell window from the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Open the dashboard at:

```text
http://localhost:5173
```

### Step 5: Use the dashboard

1. Open **Audio Upload** and choose an audio file, or open **Microphone** and record your voice.
2. Submit the recording for analysis.
3. Read the AASIST prediction and risk result.
4. For identity verification, first use **Speaker Enrollment** to register a reference sample.
5. Supply the enrolled speaker ID during analysis to include ECAPA-TDNN speaker verification.
6. Review the factor breakdown and recommended action.
7. Use the history table to review previous analyses.

## 8. Running the Tests

From `backend/` with the virtual environment active:

```powershell
.\.venv\Scripts\pytest.exe -v
```

The current integration suite covers health/model status, successful analysis, invalid requests, report persistence/retrieval, speaker enrollment/verification, spoof-risk consistency, and microphone WAV payload handling.

## 9. Evaluation

The `evaluation/` directory contains `evaluate_dataset.py`, which can run the AASIST pipeline over supplied sample paths and report:

- Ground-truth label when supplied.
- AASIST prediction.
- Raw bona fide score.
- System risk score.
- Risk level.
- Processing time.

Example:

```powershell
cd evaluation
..\backend\.venv\Scripts\python.exe evaluate_dataset.py
```

The repository also contains empirical evidence and reproduction documentation under `evidence/` and `docs/`.

## 10. Validation Status

The current implementation has been exercised end-to-end with:

- **10/10 backend integration tests passing**.
- **Frontend production build passing with 0 errors**.
- Real microphone WAV analysis through the dashboard.
- Real speaker enrollment and speaker verification.
- Same-speaker and different-speaker verification checks.
- A benchmark spoof sample classified as `spoof`.
- Regression coverage for the earlier spoof-risk logic issue.

These results demonstrate that the application pipeline is operational. They should not be interpreted as a universal accuracy guarantee for every voice, language, recording device, codec, or attack type.

## 11. Security and Data Handling

- Uploaded audio is written to temporary UUID-based files during processing.
- Temporary analysis files are removed after processing.
- SQLite stores analysis metadata and results rather than serving as a permanent raw-audio store.
- Speaker enrollment embeddings are stored locally under `backend/data/enrollments/`.
- `.gitignore` excludes virtual environments, Node modules, databases, temporary audio, enrollment embeddings, and downloaded model assets.
- No cellular/baseband interception is implemented.

## 12. Scope and Limitations

This is a working MVP and a local demonstration system, not a production telecommunications security appliance.

In particular:

- It analyzes supplied audio files and browser microphone recordings.
- It does **not** intercept ordinary GSM/PSTN cellular calls.
- AASIST was developed/evaluated around anti-spoofing benchmarks, so performance can vary with telephony compression, heavy noise, codecs, accents, languages, and attack types outside its training/evaluation distribution.
- CPU inference is practical for demonstration but can be slower than a production GPU deployment.
- Model scores and the application's risk score are decision-support signals, not calibrated probabilities of fraud.

## 13. Repository Structure

```text
SIH26104-voice-security/
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI routes
│   │   ├── models/           # AASIST + ECAPA-TDNN integration
│   │   ├── schemas/          # Request/data schemas
│   │   ├── services/         # Audio, database, risk engine
│   │   └── utils/             # Logging utilities
│   ├── tests/                # Backend integration tests
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/       # Dashboard UI components
│   │   └── services/         # Backend API client
│   ├── package.json
│   └── README.md
├── evaluation/
│   ├── evaluate_dataset.py
│   └── README.md
├── models/
│   └── README.md             # Model asset directory notes
├── scripts/
│   └── README.md             # Reserved utility-script directory
├── docs/                     # API, architecture, demo and evidence docs
├── evidence/                 # Captured validation outputs
├── .env.example
├── AGENTS.md
├── DECISIONS.md
└── README.md
```

## 14. The SIH Solution in One Sentence

**We turn an audio clip into a security decision by combining acoustic spoof detection, speaker identity verification, audio-quality checks, and explainable risk scoring in one FastAPI + React system.**

---

Built as an SIH26104 working MVP with a focus on a clear security pipeline, reproducible local execution, explainable results, and a practical demonstration workflow.
