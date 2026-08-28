import os
import time
import torch
import numpy as np
from dataclasses import dataclass
from typing import Optional, Dict
from app.utils.logging import get_logger

logger = get_logger(__name__)

ENROLLMENT_DIR = "data/enrollments"
os.makedirs(ENROLLMENT_DIR, exist_ok=True)


class SpeakerVerificationError(Exception):
    pass


@dataclass
class SpeakerVerificationResult:
    model_name: str
    model_version: str
    similarity: float
    threshold: float
    verified: bool
    inference_time_ms: float
    available: bool
    speaker_id: str
    error: Optional[str] = None


class SpeakerVerifier:
    def __init__(self):
        self.is_loaded = False
        self._loading = False
        self._load_attempted = False
        self._load_error: Optional[str] = None
        self.model_name = "ECAPA-TDNN"
        self.model_version = "VoxCeleb1+2 (SpeechBrain)"
        self.embedding_dim = 192
        self.sample_rate = 16000
        self.threshold = 0.65
        self._enrolled_embeddings: Dict[str, torch.Tensor] = {}
        self._classifier = None
        self._verification = None

    async def load(self):
        """Synchronous load for backward compatibility - just initializes enrollments."""
        if self._load_attempted and not self.is_loaded:
            return
        await self._load_enrollments()

    async def _ensure_loaded(self):
        """Lazily load SpeechBrain model on first actual use."""
        if self.is_loaded:
            return True
        
        if self._loading:
            import asyncio
            while self._loading:
                await asyncio.sleep(0.1)
            return self.is_loaded
        
        if self._load_attempted and not self.is_loaded:
            return False
        
        self._loading = True
        self._load_attempted = True
        
        try:
            logger.info("Lazy-loading speaker verification model (SpeechBrain ECAPA-TDNN)")
            try:
                from speechbrain.inference.speaker import EncoderClassifier, SpeakerRecognition
            except ImportError:
                from speechbrain.pretrained import EncoderClassifier, SpeakerRecognition

            self._classifier = EncoderClassifier.from_hparams(
                source="speechbrain/spkrec-ecapa-voxceleb",
                run_opts={"device": "cpu"},
            )

            self._verification = SpeakerRecognition.from_hparams(
                source="speechbrain/spkrec-ecapa-voxceleb",
                run_opts={"device": "cpu"},
            )

            self.is_loaded = True
            self.model_version = "VoxCeleb1+2 (SpeechBrain)"
            logger.info("Speaker verification model loaded successfully")
            return True

        except ImportError:
            error_msg = "SpeechBrain not installed"
            self._load_error = error_msg
            logger.warning("Speaker verification unavailable: SpeechBrain not installed")
            return False
        except Exception as e:
            error_msg = f"Failed to load speaker verification model: {str(e)}"
            self._load_error = error_msg
            logger.error("Speaker verification model load failed", error=str(e))
            return False
        finally:
            self._loading = False

    async def _load_enrollments(self):
        for filename in os.listdir(ENROLLMENT_DIR):
            if filename.endswith(".npy"):
                speaker_id = filename[:-4]
                embedding = torch.from_numpy(np.load(os.path.join(ENROLLMENT_DIR, filename)))
                self._enrolled_embeddings[speaker_id] = embedding.squeeze()
        logger.info("Loaded speaker enrollments", count=len(self._enrolled_embeddings))

    async def enroll(self, speaker_id: str, waveform: np.ndarray) -> bool:
        loaded = await self._ensure_loaded()
        if not loaded or self._classifier is None:
            error = self._load_error or "Speaker verification model not loaded"
            logger.warning("Enrollment failed: speaker verification unavailable", error=error)
            raise SpeakerVerificationError(error)

        try:
            input_tensor = self._prepare_input(waveform)

            with torch.no_grad():
                embedding = self._classifier.encode_batch(input_tensor).squeeze()

            embedding = embedding / (torch.norm(embedding) + 1e-10)
            self._enrolled_embeddings[speaker_id] = embedding

            save_path = os.path.join(ENROLLMENT_DIR, f"{speaker_id}.npy")
            np.save(save_path, embedding.cpu().numpy())

            logger.info("Speaker enrolled", speaker_id=speaker_id)
            return True

        except Exception as e:
            logger.error("Speaker enrollment failed", speaker_id=speaker_id, error=str(e))
            raise SpeakerVerificationError(f"Enrollment failed: {str(e)}")

    def _prepare_input(self, waveform: np.ndarray) -> torch.Tensor:
        if waveform.ndim > 1:
            waveform = waveform.mean(axis=0)
        tensor = torch.from_numpy(waveform.astype(np.float32)).unsqueeze(0)
        return tensor

    async def verify(self, waveform: np.ndarray, speaker_id: str) -> SpeakerVerificationResult:
        loaded = await self._ensure_loaded()
        
        if not loaded or self._classifier is None or self._verification is None:
            error = self._load_error or "Speaker verification model not loaded"
            return SpeakerVerificationResult(
                model_name=self.model_name,
                model_version=self.model_version,
                similarity=0.0,
                threshold=self.threshold,
                verified=False,
                inference_time_ms=0.0,
                available=False,
                speaker_id=speaker_id,
                error=error,
            )

        if speaker_id not in self._enrolled_embeddings:
            return SpeakerVerificationResult(
                model_name=self.model_name,
                model_version=self.model_version,
                similarity=0.0,
                threshold=self.threshold,
                verified=False,
                inference_time_ms=0.0,
                available=True,
                speaker_id=speaker_id,
                error=f"Speaker {speaker_id} not enrolled",
            )

        start_time = time.perf_counter()

        try:
            input_tensor = self._prepare_input(waveform)
            enrolled_embedding = self._enrolled_embeddings[speaker_id].squeeze()

            with torch.no_grad():
                test_embedding = self._classifier.encode_batch(input_tensor).squeeze()
                test_embedding = test_embedding / (torch.norm(test_embedding) + 1e-10)

                similarity = torch.nn.functional.cosine_similarity(
                    test_embedding,
                    enrolled_embedding,
                    dim=0
                ).item()

            verified = float(similarity) >= self.threshold
            inference_time_ms = (time.perf_counter() - start_time) * 1000

            logger.info("Speaker verification completed",
                       speaker_id=speaker_id,
                       similarity=round(similarity, 4),
                       verified=verified)

            return SpeakerVerificationResult(
                model_name=self.model_name,
                model_version=self.model_version,
                similarity=round(float(similarity), 4),
                threshold=self.threshold,
                verified=verified,
                inference_time_ms=round(inference_time_ms, 2),
                available=True,
                speaker_id=speaker_id,
                error=None,
            )

        except Exception as e:
            logger.error("Speaker verification failed", speaker_id=speaker_id, error=str(e), exc_info=True)
            inference_time_ms = (time.perf_counter() - start_time) * 1000
            return SpeakerVerificationResult(
                model_name=self.model_name,
                model_version=self.model_version,
                similarity=0.0,
                threshold=self.threshold,
                verified=False,
                inference_time_ms=round(inference_time_ms, 2),
                available=False,
                speaker_id=speaker_id,
                error=str(e),
            )

    def list_enrolled(self) -> list:
        return list(self._enrolled_embeddings.keys())

    def get_status(self) -> Dict:
        if self.is_loaded:
            return {
                "model_name": self.model_name,
                "model_version": self.model_version,
                "embedding_dim": self.embedding_dim,
                "loaded": True,
            }
        elif self._loading:
            return {
                "model_name": self.model_name,
                "loaded": False,
                "loading": True,
                "error": None,
            }
        elif self._load_attempted:
            return {
                "model_name": self.model_name,
                "loaded": False,
                "loading": False,
                "load_attempted": True,
                "error": self._load_error,
            }
        else:
            return {
                "model_name": self.model_name,
                "loaded": False,
                "loading": False,
                "load_attempted": False,
                "error": "Not yet initialized (lazy load on first use)",
            }