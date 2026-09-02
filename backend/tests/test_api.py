import os
import io
import struct
import pytest
import numpy as np
from fastapi.testclient import TestClient
from app.main import app
from app.services.semantic_analyzer import SemanticAnalyzer

TEST_AUDIO_PATH = os.path.join(os.path.dirname(__file__), "..", "test_audio.wav")


def create_sine_wav_bytes(duration_sec: float, sample_rate: int = 16000, freq: float = 440.0) -> bytes:
    num_samples = int(sample_rate * duration_sec)
    data_size = num_samples * 2
    buf = io.BytesIO()
    buf.write(b"RIFF")
    buf.write(struct.pack("<I", 36 + data_size))
    buf.write(b"WAVEfmt ")
    buf.write(struct.pack("<IHHIIHH", 16, 1, 1, sample_rate, sample_rate * 2, 2, 16))
    buf.write(b"data")
    buf.write(struct.pack("<I", data_size))
    for i in range(num_samples):
        sample = int(32767.0 * 0.3 * np.sin(2 * np.pi * freq * i / sample_rate))
        buf.write(struct.pack("<h", sample))
    buf.seek(0)
    return buf.read()


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] in ["healthy", "degraded"]
    assert "spoof_detector_loaded" in data
    assert data["spoof_detector_loaded"] is True
    assert "asr_transcriber_loaded" in data
    assert "semantic_analyzer_loaded" in data


def test_models_status(client):
    response = client.get("/api/v1/models/status")
    assert response.status_code == 200
    data = response.json()
    assert "spoof_detector" in data
    assert data["spoof_detector"]["loaded"] is True
    assert data["spoof_detector"]["model_name"] == "AASIST"
    assert "asr_transcriber" in data
    assert "semantic_analyzer" in data


def test_analyze_audio_success(client):
    assert os.path.exists(TEST_AUDIO_PATH), "test_audio.wav file missing"
    with open(TEST_AUDIO_PATH, "rb") as f:
        files = {"audio": ("test_audio.wav", f, "audio/wav")}
        response = client.post("/api/v1/analyze", files=files)

    assert response.status_code == 200
    data = response.json()
    assert "request_id" in data
    assert "spoof_detection" in data
    assert data["spoof_detection"]["model_name"] == "AASIST"
    assert "raw_score" in data["spoof_detection"]
    assert "label" in data["spoof_detection"]
    # Verify single-window response structure (no multi-window fields)
    assert "windows" not in data["spoof_detection"]
    assert "num_windows" not in data["spoof_detection"]
    assert "semantic_threat_analysis" in data
    assert "risk_assessment" in data


def test_single_window_audio_short(client):
    """Audio 2.0s triggers exactly one single AASIST inference."""
    wav_bytes = create_sine_wav_bytes(duration_sec=2.0)
    files = {"audio": ("short.wav", wav_bytes, "audio/wav")}
    res = client.post("/api/v1/analyze", files=files)
    assert res.status_code == 200
    data = res.json()
    assert "raw_score" in data["spoof_detection"]
    assert "windows" not in data["spoof_detection"]


def test_single_window_audio_four_seconds(client):
    """Audio 4.0s triggers exactly one single AASIST inference."""
    wav_bytes = create_sine_wav_bytes(duration_sec=4.0)
    files = {"audio": ("four_sec.wav", wav_bytes, "audio/wav")}
    res = client.post("/api/v1/analyze", files=files)
    assert res.status_code == 200
    data = res.json()
    assert "raw_score" in data["spoof_detection"]
    assert "windows" not in data["spoof_detection"]


def test_single_window_audio_ten_seconds_truncation(client):
    """Audio 10.0s is processed by AASIST using ONLY the first 64,600 samples (single inference, no sliding window)."""
    wav_bytes = create_sine_wav_bytes(duration_sec=10.0)
    files = {"audio": ("long10s.wav", wav_bytes, "audio/wav")}
    res = client.post("/api/v1/analyze", files=files)
    assert res.status_code == 200
    data = res.json()
    assert "raw_score" in data["spoof_detection"]
    assert "windows" not in data["spoof_detection"]
    assert "num_windows" not in data["spoof_detection"]


def test_semantic_analyzer_harmless_conversation():
    analyzer = SemanticAnalyzer()
    res = analyzer.analyze("Hello David, good morning. How are you doing today?")
    assert res["semantic_risk_score"] == 0.0
    assert res["threat_level"] == "LOW"


def test_semantic_analyzer_otp_request():
    analyzer = SemanticAnalyzer()
    res = analyzer.analyze("Please tell me your OTP code immediately to verify your account")
    assert res["semantic_risk_score"] > 0.3
    assert res["threat_level"] in ["MEDIUM", "HIGH", "CRITICAL"]


def test_speaker_enroll_and_verify(client):
    speaker_id = "test_user_revert_single_99"
    with open(TEST_AUDIO_PATH, "rb") as f:
        enroll_res = client.post(
            "/api/v1/enroll",
            data={"speaker_id": speaker_id},
            files={"audio": ("enroll.wav", f, "audio/wav")},
        )
    assert enroll_res.status_code == 200
    assert enroll_res.json()["status"] == "success"

    with open(TEST_AUDIO_PATH, "rb") as f:
        verify_res = client.post(
            "/api/v1/analyze",
            data={"speaker_id": speaker_id},
            files={"audio": ("test.wav", f, "audio/wav")},
        )
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["speaker_verification"]["enabled"] is True
    assert verify_data["speaker_verification"]["verified"] is True
