# SIH26104 Voice Security Platform — Frontend Handoff Document

## Overview
The frontend is built with **React 18 + Vite 5 + TypeScript + Lucide Icons**.
It is located in `/frontend` and communicates with the FastAPI backend through the `/api/v1` base URL.

## Vite Dev Server Proxy Config
`frontend/vite.config.ts`:
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
```

## Running the Frontend
- **Development**: `npm run dev` (starts on `http://localhost:5173`)
- **Production Build**: `npm run build` (generates static SPA bundle in `frontend/dist/`)
- **Preview Build**: `npm run preview`

## Primary Views & Components
- `App.tsx`: Main dashboard container managing active tabs, global stats, health polling, and history refresh.
- `Header.tsx`: System header displaying backend connection status badge.
- `AudioUpload.tsx`: Drag & drop audio file upload zone.
- `MicRecorder.tsx`: Microphone live audio recording via WebRTC MediaRecorder.
- `AnalysisResult.tsx`: Display card for Risk Level, Synthetic Evidence Score, AASIST logit details, ECAPA-TDNN similarity, and factor explanation items.
- `ReportHistory.tsx`: Historical scans data table fetching records from `GET /api/v1/reports`.
