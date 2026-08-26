# SIH26104 Voice Security Platform

## What is SIH26104?
This repository is for **Smart India Hackathon 2026 Problem Statement SIH26104**:
**"AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks."**

## Project Intent
We are building a beginner-friendly but technically credible MVP focused on detecting potential voice-cloning impersonation risk from audio inputs.

## Planned MVP Architecture
```text
audio input
→ audio preprocessing
→ pretrained voice spoof detection
→ optional pretrained speaker verification
→ explainable risk engine
→ backend API
→ frontend dashboard
→ minimal database/reporting
```

### MVP Input Methods (Planned)
- Uploaded audio files.
- Browser microphone recording, if practical within MVP constraints.

### Scope Clarification
- **The MVP does NOT intercept ordinary cellular phone calls.**
- Future versions may integrate with **WebRTC, SIP/PBX, enterprise communication systems, and telecom infrastructure** where appropriate.

### Model Strategy (Planned)
- Use **pretrained models** rather than training large speech models from scratch.
- Candidate model categories:
  - Pretrained voice spoof/deepfake detector (for example, AASIST).
  - Pretrained speaker verification model (for example, ECAPA-TDNN or WavLM speaker-verification models).
- These models are **not integrated yet** in this initial setup.

## Status
### Planned
- Backend service in Python + FastAPI.
- Frontend dashboard in React + Vite + TypeScript.
- Evaluation workflow for multilingual and real-world robustness.

### Currently Implemented
- Initial repository structure.
- Foundation documentation and architecture planning artifacts.

### Future Work
- Implement backend and frontend code.
- Integrate pretrained model inference pipeline.
- Define API contract and evaluation benchmarks.

## Repository Structure
```text
/
├── README.md
├── DECISIONS.md
├── KNOWN_LIMITATIONS.md
├── .gitignore
├── .env.example
├── backend/
├── frontend/
├── models/
├── evaluation/
├── docs/
└── scripts/
```
