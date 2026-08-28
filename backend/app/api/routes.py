import time
import uuid
import os
from fastapi import APIRouter, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse
import structlog

from app.config import settings
from app.utils.logging import get_logger
from app.services.audio import AudioProcessor, AudioValidationError
from app.models.spoof_detector import SpoofDetector, SpoofDetectionError
from app.models.speaker_verifier import SpeakerVerifier, SpeakerVerificationError
from app.services.risk_engine import RiskEngine, RiskAssessment
from app.services.database import (
    save_analysis_report,
    get_reports,
    get_report_by_id,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1")

audio_processor = AudioProcessor(
    target_sample_rate=settings.target_sample_rate,
    max_duration_sec=settings.max_audio_duration_sec,
    min_duration_sec=settings.min_audio_duration_sec,
)

risk_engine = RiskEngine()


@router.get("/health")
async def health_check():
    from app.main import spoof_detector, speaker_verifier

    return JSONResponse({
        "status": "healthy" if spoof_detector and spoof_detector.is_loaded else "degraded",
        "spoof_detector_loaded": spoof_detector.is_loaded if spoof_detector else False,
        "speaker_verifier_loaded": speaker_verifier.is_loaded if speaker_verifier else False,
        "version": "0.1.0",
    })


@router.get("/models/status")
async def models_status():
    from app.main import spoof_detector, speaker_verifier

    spoof_info = None
    if spoof_detector and spoof_detector.is_loaded:
        spoof_info = {
            "model_name": spoof_detector.model_name,
            "model_version": spoof_detector.model_version,
            "sample_rate": spoof_detector.sample_rate,
            "input_format": spoof_detector.input_format,
            "loaded": True,
        }
    else:
        spoof_info = {"loaded": False, "error": "Model not loaded"}

    speaker_info = speaker_verifier.get_status() if speaker_verifier else {
        "model_name": "ECAPA-TDNN",
        "loaded": False,
        "error": "Speaker verifier not initialized",
    }

    return JSONResponse({
        "spoof_detector": spoof_info,
        "speaker_verifier": speaker_info,
    })


@router.post("/analyze")
async def analyze_audio(
    audio: UploadFile = File(...),
    speaker_id: str | None = Form(None),
    language_hint: str | None = Form(None),
):
    request_id = str(uuid.uuid4())
    start_time = time.perf_counter()

    structlog.contextvars.bind_contextvars(request_id=request_id)

    from app.main import spoof_detector, speaker_verifier

    if not spoof_detector or not spoof_detector.is_loaded:
        return JSONResponse(
            status_code=503,
            content={"error": "Spoof detection model not available", "request_id": request_id}
        )

    try:
        if not audio or not audio.filename:
            return JSONResponse(
                status_code=400,
                content={"error": "No audio file provided", "request_id": request_id}
            )

        filename = audio.filename
        logger.info("Analysis request received", filename=filename, speaker_id=speaker_id)

        content = await audio.read()
        if len(content) > settings.max_upload_size_mb * 1024 * 1024:
            logger.warning("File too large", size=len(content), max_mb=settings.max_upload_size_mb)
            return JSONResponse(
                status_code=413,
                content={"error": f"File size exceeds maximum of {settings.max_upload_size_mb} MB", "request_id": request_id}
            )

        temp_path = os.path.join(settings.temp_dir, f"{request_id}_{filename}")
        with open(temp_path, "wb") as f:
            f.write(content)

        logger.info("Audio file saved temporarily", path=temp_path, size=len(content))

        try:
            waveform = audio_processor.process(temp_path, filename)
            logger.info("Audio preprocessed", duration_sec=len(waveform) / settings.target_sample_rate)

            spoof_result = await spoof_detector.detect(waveform)
            logger.info("Spoof detection completed", score=spoof_result.raw_score, label=spoof_result.label)

            speaker_result = None
            if speaker_verifier and speaker_id:
                try:
                    speaker_result = await speaker_verifier.verify(waveform, speaker_id)
                    logger.info("Speaker verification completed", similarity=speaker_result.similarity, verified=speaker_result.verified)
                except SpeakerVerificationError as e:
                    logger.warning("Speaker verification failed", error=str(e))

            risk_assessment = risk_engine.assess(
                spoof_result=spoof_result,
                speaker_result=speaker_result,
                audio_quality=audio_processor.get_quality_metrics(waveform),
            )
            logger.info("Risk assessment completed", level=risk_assessment.level, score=risk_assessment.score)

            processing_time_ms = (time.perf_counter() - start_time) * 1000

            report = await save_analysis_report(
                request_id=request_id,
                filename=filename,
                duration_sec=len(waveform) / settings.target_sample_rate,
                spoof_result=spoof_result,
                speaker_result=speaker_result,
                risk_assessment=risk_assessment,
                processing_time_ms=processing_time_ms,
            )

            response_data = {
                "request_id": request_id,
                "timestamp": report["timestamp"],
                "spoof_detection": {
                    "model_name": spoof_result.model_name,
                    "model_version": spoof_result.model_version,
                    "raw_score": spoof_result.raw_score,
                    "score_type": spoof_result.score_type,
                    "interpretation": spoof_result.interpretation,
                    "label": spoof_result.label,
                    "inference_time_ms": spoof_result.inference_time_ms,
                    "available": spoof_result.available,
                    "error": spoof_result.error,
                },
                "speaker_verification": {
                    "enabled": speaker_result is not None,
                    "model_name": speaker_result.model_name if speaker_result else None,
                    "model_version": speaker_result.model_version if speaker_result else None,
                    "similarity": speaker_result.similarity if speaker_result else None,
                    "threshold": speaker_result.threshold if speaker_result else None,
                    "verified": speaker_result.verified if speaker_result else None,
                    "inference_time_ms": speaker_result.inference_time_ms if speaker_result else None,
                    "available": speaker_result.available if speaker_result else False,
                    "error": speaker_result.error if speaker_result else None,
                },
                "risk_assessment": {
                    "risk_score": risk_assessment.score,
                    "risk_level": risk_assessment.level,
                    "confidence": risk_assessment.confidence,
                    "reasons": risk_assessment.reasons,
                    "recommended_action": risk_assessment.recommended_action,
                },
                "processing_time_ms": round(processing_time_ms, 2),
            }

            logger.info("Analysis completed successfully", request_id=request_id, risk_level=risk_assessment.level)
            return JSONResponse(response_data)

        except AudioValidationError as e:
            logger.warning("Audio validation failed", error=str(e))
            return JSONResponse(
                status_code=400,
                content={"error": str(e), "request_id": request_id}
            )
        except SpoofDetectionError as e:
            logger.error("Spoof detection failed", error=str(e))
            return JSONResponse(
                status_code=500,
                content={"error": f"Spoof detection failed: {str(e)}", "request_id": request_id}
            )
        except Exception as e:
            logger.error("Analysis failed", error=str(e), exc_info=True)
            return JSONResponse(
                status_code=500,
                content={"error": f"Analysis failed: {str(e)}", "request_id": request_id}
            )
        finally:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                    logger.debug("Temporary file cleaned up", path=temp_path)
                except Exception as e:
                    logger.warning("Failed to clean up temp file", path=temp_path, error=str(e))

    except Exception as e:
        logger.error("Request parsing failed", error=str(e), exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": f"Request parsing failed: {str(e)}", "request_id": request_id}
        )


@router.get("/reports")
async def list_reports(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    reports, total = await get_reports(limit=limit, offset=offset)
    return JSONResponse({
        "reports": reports,
        "total": total,
        "limit": limit,
        "offset": offset,
    })


@router.get("/reports/{request_id}")
async def get_report(request_id: str):
    report = await get_report_by_id(request_id)
    if not report:
        return JSONResponse(
            status_code=404,
            content={"error": "Report not found"}
        )
    return JSONResponse(report)


@router.post("/enroll")
async def enroll_speaker(
    speaker_id: str = Form(...),
    audio: UploadFile = File(...),
):
    from app.main import speaker_verifier
    if not speaker_verifier:
        return JSONResponse(status_code=503, content={"error": "Speaker verifier not available"})

    request_id = str(uuid.uuid4())
    filename = audio.filename or "enroll.wav"
    temp_path = os.path.join(settings.temp_dir, f"enroll_{request_id}_{filename}")
    content = await audio.read()
    with open(temp_path, "wb") as f:
        f.write(content)

    try:
        waveform = audio_processor.process(temp_path, filename)
        await speaker_verifier.enroll(speaker_id, waveform)
        return JSONResponse({
            "status": "success",
            "speaker_id": speaker_id,
            "message": f"Speaker {speaker_id} successfully enrolled",
        })
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": f"Enrollment failed: {str(e)}"})
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


@router.post("/speakers/{speaker_id}/verify")
async def verify_speaker_endpoint(
    speaker_id: str,
    audio: UploadFile = File(...),
):
    from app.main import speaker_verifier
    if not speaker_verifier:
        return JSONResponse(status_code=503, content={"error": "Speaker verifier not available"})

    request_id = str(uuid.uuid4())
    filename = audio.filename or "verify.wav"
    temp_path = os.path.join(settings.temp_dir, f"verify_{request_id}_{filename}")
    content = await audio.read()
    with open(temp_path, "wb") as f:
        f.write(content)

    try:
        waveform = audio_processor.process(temp_path, filename)
        res = await speaker_verifier.verify(waveform, speaker_id)
        return JSONResponse({
            "speaker_id": speaker_id,
            "verified": res.verified,
            "similarity": res.similarity,
            "threshold": res.threshold,
            "model_name": res.model_name,
            "inference_time_ms": res.inference_time_ms,
            "error": res.error,
        })
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": f"Verification failed: {str(e)}"})
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass