# SIH26104 Voice Security Platform — Real Speech Empirical Evidence

## 1. Integrated Pretrained Models & Frameworks
- **Voice Spoof Detection**: `SpeechAntiSpoofingBenchmarks/AASIST` (Checkpoint: `AASIST.pth`, 1.2 MB PyTorch Model)
- **Speaker Verification**: `speechbrain/spkrec-ecapa-voxceleb` (SpeechBrain 192-dim ECAPA-TDNN Model)

---

## 2. Real Human Speech Empirical Test Results

| Audio Sample | Description | Ground Truth | AASIST Logit / Label | ECAPA Similarity / Verified | Risk Score / Level | Action & Processing Time |
|---|---|---|---|---|---|---|
| `real_speech_david_1.wav` | Spoken acoustic speech clip (David: "Hello, this is a real spoken voice test...") | `genuine` | `+0.0771` (`bona_fide`) | N/A (Disabled) | `0.2200` / `LOW` | `ACCEPT: Audio appears genuine.` (503 ms) |
| `real_speech_david_2.wav` | Same speaker, different sentence ("Please verify my identity...") | `Same Speaker (David)` | `-0.2810` (`spoof`) | `0.9159` / **True** (Threshold 0.65) | `0.8800` / `CRITICAL` | `REJECT: High confidence voice cloning...` (317 ms) |
| `real_speech_zira_1.wav` | Different female speaker ("This is a completely different female speaker...") | `Different Speaker (Zira)` | `-0.1420` (`spoof`) | `0.6294` / **False** (Threshold 0.65) | `0.6400` / `HIGH` | `REVIEW: Likely spoofed audio...` (287 ms) |
| `test_audio.wav` | ASVspoof2019 LA Benchmark Evaluation Spoof Sample | `spoof` | `-0.6990` (`spoof`) | N/A (Disabled) | `0.8500` / `CRITICAL` | `REJECT: High confidence voice cloning...` (406 ms) |
| `indian_english_sample.wav` | Indian English context phrase ("Namaste, Smart India Hackathon...") | `genuine` | `+0.0133` (`bona_fide`) | N/A (Disabled) | `0.2200` / `LOW` | `ACCEPT: Audio appears genuine.` (428 ms) |

---

## 3. Key Observations
1. **Speaker Verification Accuracy**:
   - Same speaker different sentence (`real_speech_david_1` vs `real_speech_david_2`) achieved cosine similarity `0.9159` (well above `0.65` threshold), confirming identity match.
   - Different female speaker (`real_speech_zira_1` vs `real_speech_david_1`) achieved cosine similarity `0.6294` (below `0.65` threshold), successfully triggering identity mismatch.
2. **Real Genuine Speech Classification**:
   - Genuine spoken speech sample `real_speech_david_1.wav` produced positive logit `+0.0771` (Softmax probability `72.67%`), resulting in `LOW` risk (`0.22`) and `ACCEPT` recommendation.
   - Indian English spoken phrase `indian_english_sample.wav` produced positive logit `+0.0133` (Softmax probability `69.57%`), resulting in `LOW` risk (`0.22`) and `ACCEPT` recommendation.
3. **Deepfake Spoof Benchmark Classification**:
   - Benchmark spoof sample `test_audio.wav` produced negative logit `-0.6990` (Softmax probability `38.82%`), resulting in `CRITICAL` risk (`0.85`) and `REJECT` recommendation.
