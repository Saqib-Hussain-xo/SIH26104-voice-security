import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import structlog

from app.config import settings
from app.utils.logging import configure_logging, get_logger
from app.services.database import init_db, close_db
from app.models.spoof_detector import SpoofDetector
from app.models.speaker_verifier import SpeakerVerifier
from app.api.routes import router as api_router

logger = get_logger(__name__)

spoof_detector: SpoofDetector | None = None
speaker_verifier: SpeakerVerifier | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global spoof_detector, speaker_verifier

    configure_logging()
    logger.info("Starting SIH26104 Voice Security Platform", version="0.1.0")

    await init_db()

    try:
        logger.info("Loading spoof detection model", model_id=settings.aasist_model_id)
        spoof_detector = SpoofDetector(model_id=settings.aasist_model_id, revision=settings.aasist_revision)
        await spoof_detector.load()
        logger.info("Spoof detection model loaded successfully")
    except Exception as e:
        logger.error("Failed to load spoof detection model", error=str(e))
        spoof_detector = None

    logger.info("Initializing speaker verification (SpeechBrain ECAPA-TDNN)")
    speaker_verifier = SpeakerVerifier()
    await speaker_verifier.load()
    logger.info("Speaker verification initialized")

    yield

    logger.info("Shutting down")
    await close_db()


app = FastAPI(
    title="SIH26104 Voice Security Platform",
    description="AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks",
    version="0.1.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def add_request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
    start_time = time.perf_counter()

    structlog.contextvars.bind_contextvars(request_id=request_id)
    logger.info("Request started", method=request.method, path=request.url.path)

    try:
        response = await call_next(request)
    except Exception as e:
        logger.error("Request failed", error=str(e), exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "request_id": request_id}
        )

    process_time = (time.perf_counter() - start_time) * 1000
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time-MS"] = f"{process_time:.2f}"

    logger.info("Request completed", status_code=response.status_code, process_time_ms=round(process_time, 2))
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "name": "SIH26104 Voice Security Platform",
        "version": "0.1.0",
        "description": "AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks",
        "docs": "/docs",
        "redoc": "/redoc",
        "openapi": "/openapi.json",
        "health": "/api/v1/health",
    }