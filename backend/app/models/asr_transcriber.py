import time
import numpy as np
from typing import Dict, Any
from app.utils.logging import get_logger

logger = get_logger(__name__)


class ASRTranscriber:
    def __init__(self, model_id: str = "openai/whisper-tiny"):
        self.model_id = model_id
        self.pipeline = None
        self.loaded = False

    async def load(self):
        try:
            from transformers import pipeline

            logger.info("Loading pretrained ASR model", model_id=self.model_id)
            self.pipeline = pipeline(
                "automatic-speech-recognition",
                model=self.model_id,
            )
            self.loaded = True
            logger.info("Pretrained ASR model loaded successfully", model_id=self.model_id)
        except Exception as e:
            logger.error("Failed to load ASR model", error=str(e))
            self.pipeline = None
            self.loaded = False

    def transcribe(self, waveform: np.ndarray, sampling_rate: int = 16000) -> Dict[str, Any]:
        start_time = time.perf_counter()
        
        if not self.loaded or self.pipeline is None:
            return {
                "transcript": "",
                "model_name": self.model_id,
                "inference_time_ms": 0,
                "available": False,
                "error": "ASR model not loaded",
            }

        try:
            # Pass 16kHz float numpy array directly to avoid ffmpeg system dependency
            result = self.pipeline({"raw": waveform, "sampling_rate": sampling_rate})
            transcript_text = result.get("text", "").strip()
            inference_time = (time.perf_counter() - start_time) * 1000

            return {
                "transcript": transcript_text,
                "model_name": self.model_id,
                "inference_time_ms": round(inference_time, 2),
                "available": True,
                "error": None,
            }
        except Exception as e:
            logger.error("ASR transcription error", error=str(e))
            inference_time = (time.perf_counter() - start_time) * 1000
            return {
                "transcript": "",
                "model_name": self.model_id,
                "inference_time_ms": round(inference_time, 2),
                "available": False,
                "error": str(e),
            }
