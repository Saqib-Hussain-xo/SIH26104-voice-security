import aiosqlite
import json
from datetime import datetime
from typing import List, Optional, Tuple
from app.config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)

DB_PATH = settings.database_path


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS analysis_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id TEXT UNIQUE NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                filename TEXT,
                duration_sec REAL,
                spoof_model_name TEXT,
                spoof_model_version TEXT,
                spoof_score REAL,
                spoof_label TEXT,
                spoof_interpretation TEXT,
                speaker_id TEXT,
                speaker_model_name TEXT,
                speaker_model_version TEXT,
                speaker_similarity REAL,
                speaker_verified BOOLEAN,
                risk_score REAL,
                risk_level TEXT,
                confidence REAL,
                explanation TEXT,
                recommended_action TEXT,
                processing_time_ms INTEGER,
                model_versions TEXT
            )
        """)
        await db.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON analysis_records(timestamp)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_request_id ON analysis_records(request_id)")
        await db.commit()
    logger.info("Database initialized", path=DB_PATH)


async def close_db():
    pass


async def save_analysis_report(
    request_id: str,
    filename: str,
    duration_sec: float,
    spoof_result,
    speaker_result,
    risk_assessment,
    processing_time_ms: float,
):
    model_versions = json.dumps({
        "spoof": f"{spoof_result.model_name}-{spoof_result.model_version}",
        "speaker": f"{speaker_result.model_name}-{speaker_result.model_version}" if speaker_result else None,
    })

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO analysis_records (
                request_id, filename, duration_sec,
                spoof_model_name, spoof_model_version, spoof_score, spoof_label, spoof_interpretation,
                speaker_id, speaker_model_name, speaker_model_version, speaker_similarity, speaker_verified,
                risk_score, risk_level, confidence, explanation, recommended_action,
                processing_time_ms, model_versions
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            request_id,
            filename,
            duration_sec,
            spoof_result.model_name,
            spoof_result.model_version,
            spoof_result.raw_score,
            spoof_result.label,
            spoof_result.interpretation,
            speaker_result.speaker_id if speaker_result else None,
            speaker_result.model_name if speaker_result else None,
            speaker_result.model_version if speaker_result else None,
            speaker_result.similarity if speaker_result else None,
            speaker_result.verified if speaker_result else None,
            risk_assessment.score,
            risk_assessment.level,
            risk_assessment.confidence,
            risk_assessment.explanation,
            risk_assessment.recommended_action,
            int(processing_time_ms),
            model_versions,
        ))
        await db.commit()

    logger.info("Analysis report saved", request_id=request_id)

    return await get_report_by_id(request_id)


async def get_reports(limit: int = 50, offset: int = 0) -> Tuple[List[dict], int]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        cursor = await db.execute("SELECT COUNT(*) FROM analysis_records")
        total = (await cursor.fetchone())[0]

        cursor = await db.execute("""
            SELECT request_id, timestamp, filename, duration_sec,
                   spoof_score, spoof_label, risk_level, risk_score
            FROM analysis_records
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
        """, (limit, offset))
        rows = await cursor.fetchall()

    reports = [dict(row) for row in rows]
    return reports, total


async def get_report_by_id(request_id: str) -> Optional[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM analysis_records WHERE request_id = ?", (request_id,))
        row = await cursor.fetchone()

    if not row:
        return None

    return dict(row)