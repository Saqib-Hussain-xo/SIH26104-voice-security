# SIH26104 Voice Security Platform — Live Demonstration Script

## Demo Overview
This script guides evaluators through a step-by-step live demonstration of the **SIH26104 Voice Security MVP** for AI-Powered Real-Time Voice Cloning Detection.

---

## Step 1: Start the Application
1. Open terminal and start the backend:
   ```bash
   cd backend
   .\.venv\Scripts\activate
   uvicorn app.main:app --reload --port 8000
   ```
2. Start the frontend in a second terminal:
   ```bash
   cd frontend
   npm run dev
   ```
3. Open `http://localhost:5173`.

---

## Step 2: Voice Spoof Detection (Audio Upload)
1. Select the **Audio Upload** tab on the Dashboard.
2. Drag and drop `backend/test_audio.wav` (or pick any WAV/MP3 file).
3. Click **Analyze Audio**.
4. Observe real-time progress indicator.
5. Review the **System Risk Assessment Result**:
   - Risk Score Gauge & Badge (`MEDIUM` / `HIGH` / `CRITICAL` / `LOW`)
   - **Synthetic-Evidence Model (AASIST)** Logit Score (`-0.6990`), Softmax Bona Fide Probability (`38.82%`), Prediction (`spoof`)
   - Factor Explanation List detailing risk increase/decrease parameters
   - Recommended Action (`CAUTION: Uncertain result...` or `REJECT`)

---

## Step 3: Speaker Identity Verification & Enrollment
1. Select the **Speaker Enrollment** tab.
2. Enter Speaker ID `demo_user_01`.
3. Choose a reference audio clip and click **Enroll Speaker Identity**.
4. Switch back to **Audio Upload** tab.
5. Upload another clip, enter `demo_user_01` in the **Speaker ID** field, and click **Analyze Audio**.
6. Observe the **Speaker Verification (ECAPA-TDNN)** panel:
   - Cosine Similarity Score
   - Match Status (`Verified = True`)
   - Updated combined System Risk Score.

---

## Step 4: Live Microphone Analysis
1. Select the **Microphone** tab.
2. Click **Start Microphone Recording** and speak into your mic for 3-5 seconds.
3. Click **Stop Recording**.
4. Play back recorded audio, then click **Analyze Recording**.
5. Observe live real-time analysis output generated from browser audio.

---
