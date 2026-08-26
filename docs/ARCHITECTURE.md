# Architecture (Initial)

```text
[Audio Input: Upload / Browser Mic]
                |
                v
      [Audio Preprocessing]
                |
                v
[Pretrained Voice Spoof Detection]
                |
                v
[Optional Speaker Verification]
                |
                v
   [Explainable Risk Engine]
                |
                v
         [Backend API]
                |
                v
      [Frontend Dashboard]
                |
                v
 [Minimal Database / Reporting]
```

Notes:
- This is the initial MVP architecture plan.
- No production-grade telephony interception is implemented in this stage.
