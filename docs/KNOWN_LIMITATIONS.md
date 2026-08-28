# SIH26104 Voice Security Platform — Scope Boundaries & Known Limitations

## Scope Boundaries

### 1. No Cellular Phone Call Interception
- The current MVP processes **uploaded audio files** (`.wav`, `.mp3`, `.m4a`, `.flac`, `.ogg`) and **browser microphone input**.
- It does **NOT** intercept, tap, or inspect cellular telephony (GSM/CDMA/VoLTE) calls directly at the network/base-band level.

### 2. Raw Model Scores ≠ Calibrated Fraud Probabilities
- **AASIST** returns raw classification logits on the ASVspoof2019 Logical Access benchmark.
- Softmax outputs represent model activation probabilities for the training domain and should **NOT** be interpreted as absolute "bank-grade fraud probabilities".
- System risk scores combine multiple heuristic factors (spoof logit, speaker verification similarity, and RMS volume audio quality metrics).

### 3. Model Domain & Multilingual Generalization
- AASIST was trained primarily on English ASVspoof2019 benchmark datasets.
- Highly noisy, telephony-compressed (8kHz G.711 / AMR), or heavily accented regional Indian language clips may exhibit higher classification variance.

### 4. Hardware Execution Latency
- On standard CPU execution, model inference takes ~500ms for AASIST and ~300ms for ECAPA-TDNN per 4-second audio segment.
- GPU acceleration (CUDA) reduces total processing time to <100ms.

### 5. WebRTC / Streaming Processing
- Real-time WebRTC chunked streaming analysis is planned for future post-MVP enterprise integration.
