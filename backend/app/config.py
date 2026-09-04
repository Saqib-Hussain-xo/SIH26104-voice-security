import os
from pathlib import Path
from typing import Optional, List
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Support loading .env from backend directory or project root
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")


class Settings:
    def __init__(self):
        self.base_dir = BASE_DIR
        self.app_env = os.getenv("APP_ENV", "development")
        self.backend_host = os.getenv("BACKEND_HOST", "127.0.0.1")
        self.backend_port = int(os.getenv("BACKEND_PORT", "8000"))
        self.frontend_port = int(os.getenv("FRONTEND_PORT", "5173"))

        self.max_upload_size_mb = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
        self.max_audio_duration_sec = int(os.getenv("MAX_AUDIO_DURATION_SEC", "30"))
        self.min_audio_duration_sec = float(os.getenv("MIN_AUDIO_DURATION_SEC", "0.5"))
        self.target_sample_rate = int(os.getenv("TARGET_SAMPLE_RATE", "16000"))

        self.aasist_model_id = os.getenv("AASIST_MODEL_ID", "SpeechAntiSpoofingBenchmarks/AASIST")
        self.aasist_revision = os.getenv("AASIST_REVISION")

        self.database_path = os.getenv("DATABASE_PATH", str(BASE_DIR / "data" / "analysis.db"))
        self.temp_dir = os.getenv("TEMP_DIR", str(BASE_DIR / "temp"))
        self.enrollment_dir = os.getenv("ENROLLMENT_DIR", str(BASE_DIR / "data" / "enrollments"))
        self.pretrained_models_dir = os.getenv("PRETRAINED_MODELS_DIR", str(BASE_DIR / "pretrained_models"))

        cors_origins = os.getenv("CORS_ORIGINS")
        if cors_origins:
            self.cors_origins = [o.strip() for o in cors_origins.split(",")]
        else:
            self.cors_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

        self.log_level = os.getenv("LOG_LEVEL", "INFO")


settings = Settings()

os.makedirs(os.path.dirname(settings.database_path), exist_ok=True)
os.makedirs(settings.temp_dir, exist_ok=True)
os.makedirs(settings.enrollment_dir, exist_ok=True)
os.makedirs(settings.pretrained_models_dir, exist_ok=True)