# Frontend

The `frontend/` directory contains the working browser dashboard for the SIH26104 Voice Security Platform.

It is built with **React 18, TypeScript, Vite and Lucide React** and communicates with the FastAPI backend through the configured `/api` proxy.

## What the Dashboard Provides

### Audio Upload

Users can drag and drop or select an audio file for analysis. The UI accepts the formats supported by the backend, including:

- `.wav`
- `.mp3`
- `.m4a`
- `.flac`
- `.ogg`

The selected audio is sent to `POST /api/v1/analyze`.

### Browser Microphone

The Microphone tab lets the user record speech directly in the browser. The recording component converts captured microphone samples into a valid **16 kHz, 16-bit mono PCM WAV** payload before sending it to the backend.

This avoids the common browser issue where a WebM/Opus recording is incorrectly labelled as a WAV file.

### Speaker Enrollment

The dashboard includes a speaker-enrollment workflow. A reference recording can be associated with a speaker ID and sent to:

```text
POST /api/v1/enroll
```

Once enrolled, the speaker ID can be supplied during analysis so ECAPA-TDNN speaker verification is included in the risk assessment.

### Analysis Results

The result view displays the backend's actual analysis output, including:

- AASIST model result.
- Bona fide/spoof classification.
- Raw spoof-detection score.
- Risk score and risk level.
- Confidence.
- Speaker similarity when verification is enabled.
- Verification threshold and result.
- Explainable risk factors.
- Recommended action.
- Processing time.

The UI does not manufacture its own prediction. It renders the response returned by the backend analysis pipeline.

### Report History

The history table reads stored reports from:

```text
GET /api/v1/reports
```

It displays previous analysis records, including timestamp, filename, duration, AASIST score, prediction, risk score and risk level.

## Application Structure

```text
frontend/
├── src/
│   ├── components/
│   │   ├── AnalysisResult.tsx    # Analysis result display
│   │   ├── AudioUpload.tsx       # File upload UI
│   │   ├── Header.tsx            # Dashboard header
│   │   ├── MicRecorder.tsx       # Browser microphone recording
│   │   └── ReportHistory.tsx     # SQLite report history UI
│   ├── services/
│   │   └── api.ts                # Backend API client
│   ├── App.tsx                   # Main dashboard
│   ├── index.css                 # Application styling
│   ├── main.tsx                  # React entry point
│   └── types.ts                  # Frontend data types
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Backend Connection

During development, Vite proxies `/api` requests to the local FastAPI server. The normal local setup is:

```text
Browser
   │
   ▼
http://localhost:5173
   │
   │ /api proxy
   ▼
http://127.0.0.1:8000
   │
   ▼
FastAPI + AASIST + ECAPA-TDNN
```

The backend must be running for analysis, enrollment, verification and report-history requests to work.

## Setup

From the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Production Build

```powershell
npm run build
```

The project currently builds successfully with TypeScript checking followed by Vite production bundling.

For a local production preview:

```powershell
npm run preview
```

## Typical Demo Flow

1. Start the FastAPI backend.
2. Start the Vite frontend.
3. Open the dashboard.
4. Upload a known genuine or spoof sample, or record your own voice.
5. Run analysis and inspect the AASIST result and risk assessment.
6. Enroll a reference speaker when demonstrating identity verification.
7. Analyze another recording with that speaker ID.
8. Show the risk factors and the historical report entry.

## Important Scope Boundary

The frontend is a browser-based interface for supplied audio and microphone recordings. It does **not** intercept ordinary cellular phone calls.
