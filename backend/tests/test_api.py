import os
import io
import struct
import pytest
from fastapi.testclient import TestClient
from app.main import app

TEST_AUDIO_PATH = os.path.join(os.path.dirname(__file__), "..", "test_audio.wav")


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


def test_models_status(client):
    response = client.get("/api/v1/models/status")
    assert response.status_code == 200
    data = response.json()
    assert "spoof_detector" in data
    assert data["spoof_detector"]["loaded"] is True
    assert data["spoof_detector"]["model_name"] == "AASIST"


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
    assert data["spoof_detection"]["label"] in ["bona_fide", "spoof"]
    assert "risk_assessment" in data
    assert "risk_score" in data["risk_assessment"]
    assert "risk_level" in data["risk_assessment"]
    assert "recommended_action" in data["risk_assessment"]


def test_analyze_no_file(client):
    response = client.post("/api/v1/analyze")
    assert response.status_code in [400, 422]


def test_list_reports(client):
    with open(TEST_AUDIO_PATH, "rb") as f:
        client.post("/api/v1/analyze", files={"audio": ("test.wav", f, "audio/wav")})

    response = client.get("/api/v1/reports")
    assert response.status_code == 200
    data = response.json()
    assert "reports" in data
    assert "total" in data
    assert data["total"] > 0
    assert len(data["reports"]) > 0


def test_get_report_by_id(client):
    with open(TEST_AUDIO_PATH, "rb") as f:
        res = client.post("/api/v1/analyze", files={"audio": ("test.wav", f, "audio/wav")})
    req_id = res.json()["request_id"]

    response = client.get(f"/api/v1/reports/{req_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["request_id"] == req_id
    assert "spoof_score" in data
    assert "risk_level" in data


def test_get_report_not_found(client):
    response = client.get("/api/v1/reports/non-existent-id-12345")
    assert response.status_code == 404


def test_speaker_enroll_and_verify(client):
    speaker_id = "test_user_99"
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
    assert verify_data["speaker_verification"]["similarity"] > 0.9


def test_spoof_risk_consistency_regression(client):
    """Regression test: If AASIST predicts spoof, risk level must NOT be LOW or recommend ACCEPT."""
    speaker_id = "test_user_regression"
    with open(TEST_AUDIO_PATH, "rb") as f:
        client.post("/api/v1/enroll", data={"speaker_id": speaker_id}, files={"audio": ("enroll.wav", f, "audio/wav")})

    with open(TEST_AUDIO_PATH, "rb") as f:
        res = client.post("/api/v1/analyze", data={"speaker_id": speaker_id}, files={"audio": ("test.wav", f, "audio/wav")})

    data = res.json()
    if data["spoof_detection"]["label"] == "spoof":
        assert data["risk_assessment"]["risk_level"] in ["HIGH", "CRITICAL"]
        assert "ACCEPT" not in data["risk_assessment"]["recommended_action"]


def test_microphone_wav_payload_support(client):
    """Regression test: Ensure microphone WAV payloads process cleanly without format errors."""
    sample_rate = 16000
    duration_sec = 2.0
    num_samples = int(sample_rate * duration_sec)
    
    # Generate 440 Hz PCM16 WAV buffer
    buf = io.BytesIO()
    data_size = num_samples * 2
    buf.write(b"RIFF")
    buf.write(struct.pack("<I", 36 + data_size))
    buf.write(b"WAVEfmt ")
    buf.write(struct.pack("<IHHIIHH", 16, 1, 1, sample_rate, sample_rate * 2, 2, 16))
    buf.write(b"data")
    buf.write(struct.pack("<I", data_size))
    for i in range(num_samples):
        sample = int(32767.0 * 0.3 * (i % 36 / 36.0))
        buf.write(struct.pack("<h", sample))
    
    buf.seek(0)
    files = {"audio": ("mic_recording_12345.wav", buf.read(), "audio/wav")}
    res = client.post("/api/v1/analyze", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["spoof_detection"]["model_name"] == "AASIST"
    assert "risk_level" in data["risk_assessment"]
