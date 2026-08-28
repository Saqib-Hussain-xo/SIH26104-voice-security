# Evaluation

The `evaluation/` directory contains the project's repeatable evaluation routine for the voice-spoof detection pipeline.

## Current Evaluation Tool

### `evaluate_dataset.py`

This script accepts one or more audio paths and runs them through:

```text
Audio file
   ↓
Audio preprocessing
   ↓
AASIST spoof detection
   ↓
Risk Engine
   ↓
Evaluation output
```

For each successfully processed sample, it reports:

- Filename.
- Ground-truth label when one is supplied.
- AASIST prediction (`bona_fide` or `spoof`).
- Raw bona fide score.
- System risk score.
- Risk level.
- Processing time.

## Running the Evaluation

From the repository root, with the backend virtual environment installed:

```powershell
cd evaluation
..\backend\.venv\Scripts\python.exe evaluate_dataset.py
```

The default script entry point evaluates the repository's `backend/test_audio.wav` sample.

## Supplying Additional Samples

The evaluation function can be called with a list of audio paths and an optional ground-truth mapping. Ground-truth labels are useful when calculating or comparing classification performance over a labelled dataset.

The script itself does not invent ground-truth labels. If labels are not supplied, it reports the model prediction and explicitly marks the ground truth as unavailable.

## What Has Been Validated

The evaluation workflow has been exercised with:

- A spoof benchmark sample.
- Genuine speech samples.
- Different recording conditions.
- Real microphone-captured WAV input through the application workflow.

The broader repository also contains validation outputs under `evidence/` and reproducibility documentation under `docs/`.

## Important Interpretation

A single sample is not a meaningful accuracy benchmark. The evaluation script is intended as a repeatable inference/evidence tool and as a foundation for larger labelled-dataset evaluation.

AASIST performance can vary with codec, sampling rate, noise, language, accent, recording device and attack type. Results should therefore be interpreted in the context of the evaluation data rather than as a universal authenticity guarantee.

## Related Documentation

- `../docs/EVALUATION_PROTOCOL.md` — evaluation criteria and protocol.
- `../docs/EVIDENCE.md` — recorded validation evidence.
- `../docs/FINAL_REPRODUCTION.md` — reproduction steps and final verification details.
- `../docs/KNOWN_LIMITATIONS.md` — current system limitations.
