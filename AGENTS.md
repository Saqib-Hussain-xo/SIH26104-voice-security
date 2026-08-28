# AGENTS.md - SIH26104 Voice Security Platform

## Project Overview
Smart India Hackathon 2026 Problem Statement SIH26104: "AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks." Building an MVP for voice spoof/deepfake detection.

**Deadline: August 30, 2026** - prioritize simple working MVP.

## Tech Stack (Planned)
- **Backend**: Python + FastAPI
- **Frontend**: React + Vite + TypeScript
- **Models**: Pretrained (AASIST for spoof detection, ECAPA-TDNN/WavLM for speaker verification)
- **No heavy infra**: No microservices, K8s, Redis, Kafka, Celery

## Repository Structure
`
/ (root)
├── backend/      # FastAPI service (empty, planned)
├── frontend/     # React + Vite + TS (empty, planned)
├── models/       # Model integration assets (empty, planned)
├── evaluation/   # Evaluation scripts (empty, planned)
├── docs/         # Architecture, API, evaluation protocol
├── scripts/      # Utility scripts (empty, planned)
├── .env.example  # Environment template
└── DECISIONS.md  # Architecture decisions
`

## Key Constraints
- Single repository for easier student team collaboration
- Pretrained-model-first approach (no from-scratch training)
- Does NOT intercept cellular calls
- Model scores ≠ calibrated fraud probabilities
- Multilingual support limited initially

## Development Commands (when implemented)
`ash
# Backend (from backend/)
# python -m venv .venv && source .venv/bin/activate
# pip install -r requirements.txt
# uvicorn main:app --reload

# Frontend (from frontend/)
# npm install
# npm run dev
`

## Environment Variables
Copy .env.example to .env and fill values:
- APP_ENV=development
- BACKEND_HOST=127.0.0.1
- BACKEND_PORT=8000
- FRONTEND_PORT=5173

## Architecture Flow
Audio Input → Preprocessing → Spoof Detection → Speaker Verification (optional) → Risk Engine → Backend API → Frontend Dashboard → Database/Reporting

## Documentation References
- docs/ARCHITECTURE.md - System architecture diagram
- docs/API.md - API contract (planned)
- docs/EVALUATION_PROTOCOL.md - Evaluation criteria (languages, accents, noise, compression)
- docs/DATA_SOURCES.md - Data licensing requirements
- DECISIONS.md - Architecture decisions
- KNOWN_LIMITATIONS.md - Current scope boundaries

## Implementation Priority
1. Backend foundations + FastAPI setup
2. Pretrained model inference pipeline integration
3. API contract definition
4. Frontend dashboard structure
5. Evaluation workflow implementation
