# Scripts

The `scripts/` directory is reserved for project-level utility scripts.

At the current MVP stage, the main executable evaluation routine lives in `evaluation/evaluate_dataset.py`, while application logic is kept inside the backend and frontend directories.

## Current Status

There are currently no required runtime or setup scripts in this directory.

That is intentional: the project can be started directly with the documented Python/FastAPI and npm commands in the root README.

## Where the Active Utilities Live

- `evaluation/evaluate_dataset.py` — runs AASIST evaluation over supplied audio samples and reports predictions, risk scores and processing time.
- `backend/tests/test_api.py` — automated backend integration and regression tests.

## Future Use

This directory can hold reusable project utilities such as:

- Cross-platform setup helpers.
- Dataset preparation tools.
- Demo-data preparation.
- Reproducible validation commands.
- Maintenance utilities.

No script in this directory is required to operate the current MVP.
