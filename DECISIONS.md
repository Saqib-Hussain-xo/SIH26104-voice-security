# Initial Architecture Decisions

## Context
This project targets SIH 2026 PS SIH26104 and must produce a working, credible MVP quickly.

## Delivery Priority
- We are prioritizing a simple, working MVP because the internal hackathon deadline is **August 30, 2026**.

## Decisions
1. **Single-repository MVP foundation first**
   - Keep backend, frontend, models, evaluation, and docs in one repository.
   - Reason: easier onboarding and faster collaboration for student teams.

2. **Pretrained-model-first approach**
   - Start with pretrained spoof detection and optional pretrained speaker verification.
   - Reason: realistic timeline; avoids costly and risky from-scratch model training.

3. **No heavy infrastructure at this stage**
   - Do not introduce microservices, Kubernetes, Redis, Kafka, Celery, or blockchain.
   - Reason: reduce operational complexity and keep focus on core detection MVP.

4. **Phased architecture and API definition**
   - Document architecture now; implement API contract after backend foundations are in place.
   - Reason: keeps implementation grounded in a clear system design while avoiding fake endpoints.

5. **Evaluation-aware planning from day one**
   - Define limitations and evaluation protocol early (language, accent, noise, telephony conditions).
   - Reason: prevent overclaiming model capability and improve technical credibility.
