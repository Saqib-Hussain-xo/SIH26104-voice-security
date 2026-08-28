# Models

The top-level `models/` directory is reserved for model assets and documentation.

The **working model integrations are currently implemented inside `backend/app/models/`**, because the backend owns model loading and inference.

## Integrated Models

### AASIST: Voice Spoof Detection

Implemented in:

```text
backend/app/models/spoof_detector.py
```

Model source:

```text
SpeechAntiSpoofingBenchmarks/AASIST
```

Checkpoint:

```text
AASIST.pth
```

Purpose:

- Detect whether supplied speech is classified as `bona_fide` or `spoof`.
- Produce the raw model score used by the risk engine.
- Provide the primary synthetic/voice-spoof evidence in the system.

The checkpoint is retrieved through Hugging Face Hub when needed and is intentionally not stored in this repository.

### ECAPA-TDNN: Speaker Verification

Implemented in:

```text
backend/app/models/speaker_verifier.py
```

Model source:

```text
speechbrain/spkrec-ecapa-voxceleb
```

Purpose:

- Create a speaker embedding from an enrollment recording.
- Create an embedding from a verification recording.
- Compare the embeddings using cosine similarity.
- Determine whether the similarity crosses the configured verification threshold.

Current configuration:

```text
Embedding dimension: 192
Sample rate:         16 kHz
Verification threshold: 0.65
Runtime:              CPU
```

## How the Models Work Together

The two models provide complementary evidence:

```text
Audio
  │
  ├── AASIST ───────────────► genuine / spoof evidence
  │
  └── ECAPA-TDNN ──────────► speaker similarity (when enrolled)
                                  │
                                  ▼
                           Explainable Risk Engine
```

A strong speaker match does not automatically make a recording safe. If AASIST identifies synthetic speech while ECAPA-TDNN finds a strong match with an enrolled identity, the risk engine treats that combination as potential voice-cloning impersonation.

## Model Assets and Git

Downloaded model checkpoints and generated speaker embeddings are kept outside normal source control. This keeps the repository manageable and ensures a new machine can retrieve the required pretrained assets during setup.

The repository's `.gitignore` excludes downloaded model assets and local enrollment data.

## Validation

The integrated models have been exercised through the backend API and dashboard. Validation has included:

- AASIST inference on a spoof benchmark sample.
- Genuine speech classification checks.
- ECAPA-TDNN same-speaker verification.
- ECAPA-TDNN different-speaker mismatch testing.
- Combined spoof + speaker-match risk assessment.

Model behavior can vary with recording conditions, codecs, languages, accents, noise and attack types outside the model's evaluation distribution.
