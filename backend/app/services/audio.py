import os
import torch
import torchaudio
import soundfile as sf
import numpy as np
from typing import Tuple, Dict, Any
from app.utils.logging import get_logger

logger = get_logger(__name__)

SUPPORTED_FORMATS = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".webm"}
MAX_FILE_SIZE = 50 * 1024 * 1024


class AudioValidationError(Exception):
    pass


class AudioProcessor:
    def __init__(
        self,
        target_sample_rate: int = 16000,
        max_duration_sec: int = 30,
        min_duration_sec: float = 0.5,
    ):
        self.target_sample_rate = target_sample_rate
        self.max_duration_sec = max_duration_sec
        self.min_duration_sec = min_duration_sec

    def validate_file(self, file_path: str, original_filename: str):
        ext = os.path.splitext(original_filename)[1].lower()
        if ext not in SUPPORTED_FORMATS:
            raise AudioValidationError(
                f"Unsupported file format: {ext}. Supported: {', '.join(SUPPORTED_FORMATS)}"
            )

        file_size = os.path.getsize(file_path)
        if file_size > MAX_FILE_SIZE:
            raise AudioValidationError(f"File size {file_size} bytes exceeds maximum of {MAX_FILE_SIZE} bytes")

        if file_size == 0:
            raise AudioValidationError("Empty file")

    def load_audio(self, file_path: str) -> Tuple[torch.Tensor, int]:
        try:
            waveform, sample_rate = sf.read(file_path)
            if waveform.ndim == 1:
                waveform = waveform.reshape(1, -1)
            else:
                waveform = waveform.T
            waveform = torch.from_numpy(waveform.astype(np.float32))
            return waveform, sample_rate
        except Exception as e:
            raise AudioValidationError(f"Failed to load audio: {str(e)}")

    def resample(self, waveform: torch.Tensor, orig_sr: int) -> torch.Tensor:
        if orig_sr != self.target_sample_rate:
            waveform = self._resample_torch(waveform, orig_sr, self.target_sample_rate)
        return waveform

    def _resample_torch(self, waveform: torch.Tensor, orig_sr: int, target_sr: int) -> torch.Tensor:
        if orig_sr == target_sr:
            return waveform
        
        ratio = target_sr / orig_sr
        n_samples = int(waveform.shape[1] * ratio)
        
        indices = torch.arange(n_samples, dtype=torch.float32) / ratio
        indices_floor = indices.floor().long()
        indices_ceil = (indices_floor + 1).clamp(max=waveform.shape[1] - 1)
        weights = indices - indices_floor.float()
        
        resampled = waveform[:, indices_floor] * (1 - weights) + waveform[:, indices_ceil] * weights
        return resampled

    def to_mono(self, waveform: torch.Tensor) -> torch.Tensor:
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)
        return waveform

    def trim_silence(self, waveform: torch.Tensor, threshold: float = 0.01) -> torch.Tensor:
        if waveform.numel() == 0:
            return waveform

        energy = waveform.abs().mean(dim=0)
        above_threshold = energy > threshold

        if not above_threshold.any():
            return waveform[:, :1]

        first = above_threshold.nonzero()[0].item()
        last = above_threshold.nonzero()[-1].item() + 1

        return waveform[:, first:last]

    def normalize(self, waveform: torch.Tensor, target_rms: float = 0.1) -> torch.Tensor:
        rms = torch.sqrt(torch.mean(waveform ** 2))
        if rms > 0:
            waveform = waveform * (target_rms / rms)
        return waveform.clamp(-1.0, 1.0)

    def validate_duration(self, waveform: torch.Tensor) -> float:
        duration = waveform.shape[1] / self.target_sample_rate
        if duration < self.min_duration_sec:
            raise AudioValidationError(
                f"Audio too short: {duration:.2f}s (minimum {self.min_duration_sec}s)"
            )
        if duration > self.max_duration_sec:
            raise AudioValidationError(
                f"Audio too long: {duration:.2f}s (maximum {self.max_duration_sec}s)"
            )
        return duration

    def detect_silence(self, waveform: torch.Tensor, threshold: float = 0.001) -> bool:
        rms = torch.sqrt(torch.mean(waveform ** 2))
        return rms.item() < threshold

    def get_quality_metrics(self, waveform: np.ndarray) -> Dict[str, Any]:
        if isinstance(waveform, torch.Tensor):
            waveform = waveform.numpy()

        rms = float(np.sqrt(np.mean(waveform ** 2)))
        peak = float(np.max(np.abs(waveform)))
        dynamic_range = peak / (rms + 1e-10)

        return {
            "rms": rms,
            "peak": peak,
            "dynamic_range": dynamic_range,
            "is_silent": rms < 0.001,
            "is_clipped": peak >= 0.99,
        }

    def process(self, file_path: str, original_filename: str = None) -> np.ndarray:
        if original_filename is None:
            original_filename = os.path.basename(file_path)

        self.validate_file(file_path, original_filename)

        waveform, sample_rate = self.load_audio(file_path)

        waveform = self.resample(waveform, sample_rate)
        waveform = self.to_mono(waveform)
        waveform = self.trim_silence(waveform)

        duration = self.validate_duration(waveform)

        if self.detect_silence(waveform):
            raise AudioValidationError("Audio appears to be silent or near-silent")

        waveform = self.normalize(waveform)

        return waveform.squeeze().numpy().astype(np.float32)