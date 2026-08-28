from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from app.models.spoof_detector import SpoofDetectionResult
from app.models.speaker_verifier import SpeakerVerificationResult
from app.utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class RiskAssessment:
    score: float
    level: str
    confidence: float
    reasons: List[Dict[str, Any]]
    explanation: str
    recommended_action: str


class RiskEngine:
    def __init__(self):
        self.spoof_weight = 0.7
        self.speaker_weight = 0.3
        self.audio_quality_weight = 0.1

        self.speaker_high_threshold = 0.8
        self.speaker_medium_threshold = 0.6

        self.quality_min_rms = 0.005
        self.quality_max_rms = 0.8

        self.confidence_base = 0.9
        self.confidence_penalty_no_speaker = 0.15
        self.confidence_penalty_poor_quality = 0.1

    def assess(
        self,
        spoof_result: SpoofDetectionResult,
        speaker_result: Optional[SpeakerVerificationResult],
        audio_quality: Dict[str, Any],
    ) -> RiskAssessment:
        reasons = []
        risk_score = 0.0

        spoof_factor = self._assess_spoof(spoof_result, reasons)
        risk_score += spoof_factor * self.spoof_weight

        speaker_factor = 0.0
        if speaker_result and speaker_result.available:
            speaker_factor = self._assess_speaker(speaker_result, spoof_result.label if spoof_result else "unknown", reasons)
            risk_score += speaker_factor * self.speaker_weight
        else:
            reasons.append({
                "factor": "speaker_verification",
                "status": "skipped",
                "reason": "No enrolled speaker or model unavailable",
                "impact": "neutral",
            })

        quality_factor = self._assess_audio_quality(audio_quality, reasons)
        risk_score += quality_factor * self.audio_quality_weight

        risk_score = max(0.0, min(1.0, risk_score + 0.5))

        level = self._score_to_level(risk_score)
        confidence = self._calculate_confidence(spoof_result, speaker_result, audio_quality, reasons)
        explanation = self._generate_explanation(reasons, risk_score, level)
        recommended_action = self._recommend_action(level, confidence, reasons)

        return RiskAssessment(
            score=round(risk_score, 4),
            level=level,
            confidence=round(confidence, 4),
            reasons=reasons,
            explanation=explanation,
            recommended_action=recommended_action,
        )

    def _assess_spoof(self, result: SpoofDetectionResult, reasons: List[Dict]) -> float:
        if not result.available:
            reasons.append({
                "factor": "spoof_detection",
                "status": "unavailable",
                "reason": result.error or "Model not loaded",
                "impact": "increases_uncertainty",
                "value": 0.0,
            })
            return 0.0

        raw_score = result.raw_score  # bona_fide_logit

        if result.label == "bona_fide":
            if raw_score >= 1.0:
                reasons.append({
                    "factor": "spoof_detection",
                    "status": "bona_fide",
                    "reason": f"Strong bona fide score ({raw_score:.3f}) indicates genuine human speech",
                    "impact": "decreases_risk",
                    "value": raw_score,
                })
                return -0.8
            else:
                reasons.append({
                    "factor": "spoof_detection",
                    "status": "bona_fide",
                    "reason": f"Bona fide score ({raw_score:.3f}) indicates genuine human speech",
                    "impact": "decreases_risk",
                    "value": raw_score,
                })
                return -0.4
        else:
            # result.label == "spoof" (bona_fide_logit < spoof_logit)
            if raw_score <= -1.0:
                reasons.append({
                    "factor": "spoof_detection",
                    "status": "spoof",
                    "reason": f"Strong spoof evidence (bona fide logit {raw_score:.3f}) indicates synthetic/cloned speech",
                    "impact": "increases_risk",
                    "value": raw_score,
                })
                return 0.8
            else:
                reasons.append({
                    "factor": "spoof_detection",
                    "status": "spoof",
                    "reason": f"Spoof evidence detected (bona fide logit {raw_score:.3f}) indicates synthetic/cloned speech",
                    "impact": "increases_risk",
                    "value": raw_score,
                })
                return 0.5

    def _assess_speaker(self, result: SpeakerVerificationResult, spoof_label: str, reasons: List[Dict]) -> float:
        if not result.available:
            return 0.0

        similarity = result.similarity

        if similarity >= self.speaker_high_threshold:
            if spoof_label == "spoof":
                reasons.append({
                    "factor": "speaker_verification",
                    "status": "impersonation_target",
                    "reason": f"High speaker identity match ({similarity:.3f}) combined with synthetic speech detection indicates active voice cloning impersonation attack",
                    "impact": "increases_risk",
                    "value": similarity,
                })
                return 0.6
            else:
                reasons.append({
                    "factor": "speaker_verification",
                    "status": "verified",
                    "reason": f"High speaker similarity ({similarity:.3f}) matches enrolled genuine speaker",
                    "impact": "decreases_risk",
                    "value": similarity,
                })
                return -0.6
        elif similarity >= self.speaker_medium_threshold:
            if spoof_label == "spoof":
                reasons.append({
                    "factor": "speaker_verification",
                    "status": "possible_impersonation",
                    "reason": f"Moderate speaker match ({similarity:.3f}) with synthetic audio detected",
                    "impact": "increases_risk",
                    "value": similarity,
                })
                return 0.3
            else:
                reasons.append({
                    "factor": "speaker_verification",
                    "status": "possible_match",
                    "reason": f"Moderate speaker similarity ({similarity:.3f}), partial match",
                    "impact": "slightly_decreases_risk",
                    "value": similarity,
                })
                return -0.2
        else:
            reasons.append({
                "factor": "speaker_verification",
                "status": "mismatch",
                "reason": f"Low speaker similarity ({similarity:.3f}) does not match enrolled speaker",
                "impact": "increases_risk",
                "value": similarity,
            })
            return 0.4

    def _assess_audio_quality(self, quality: Dict[str, Any], reasons: List[Dict]) -> float:
        rms = quality.get("rms", 0.0)
        is_clipped = quality.get("is_clipped", False)
        is_silent = quality.get("is_silent", False)

        if is_silent:
            reasons.append({
                "factor": "audio_quality",
                "status": "silent",
                "reason": "Audio is near-silent, unreliable for analysis",
                "impact": "increases_uncertainty",
                "value": rms,
            })
            return 0.5

        if is_clipped:
            reasons.append({
                "factor": "audio_quality",
                "status": "clipped",
                "reason": "Audio appears clipped/distorted, may affect model accuracy",
                "impact": "increases_uncertainty",
                "value": rms,
            })
            return 0.3

        if rms < self.quality_min_rms:
            reasons.append({
                "factor": "audio_quality",
                "status": "low_volume",
                "reason": f"Low audio level (RMS={rms:.4f}), may affect detection accuracy",
                "impact": "increases_uncertainty",
                "value": rms,
            })
            return 0.2

        reasons.append({
            "factor": "audio_quality",
            "status": "good",
            "reason": f"Audio quality acceptable (RMS={rms:.4f})",
            "impact": "neutral",
            "value": rms,
        })
        return 0.0

    def _calculate_confidence(
        self,
        spoof_result: SpoofDetectionResult,
        speaker_result: Optional[SpeakerVerificationResult],
        audio_quality: Dict[str, Any],
        reasons: List[Dict],
    ) -> float:
        confidence = self.confidence_base

        if not spoof_result.available:
            confidence -= 0.3

        if not speaker_result or not speaker_result.available:
            confidence -= self.confidence_penalty_no_speaker

        if audio_quality.get("is_silent") or audio_quality.get("is_clipped") or audio_quality.get("rms", 1.0) < self.quality_min_rms:
            confidence -= self.confidence_penalty_poor_quality

        return max(0.1, min(1.0, confidence))

    def _score_to_level(self, score: float) -> str:
        if score >= 0.75:
            return "CRITICAL"
        elif score >= 0.55:
            return "HIGH"
        elif score >= 0.35:
            return "MEDIUM"
        else:
            return "LOW"

    def _generate_explanation(
        self,
        reasons: List[Dict],
        risk_score: float,
        level: str,
    ) -> str:
        factors = [r for r in reasons if r["impact"] != "neutral"]
        if not factors:
            return f"Risk level: {level}. No significant risk factors detected."

        risk_increasing = [r for r in factors if "increases" in r["impact"]]
        risk_decreasing = [r for r in factors if "decreases" in r["impact"]]
        uncertainty = [r for r in factors if "uncertainty" in r["impact"]]

        parts = [f"Risk level: {level} (score: {risk_score:.2f})."]

        if risk_increasing:
            parts.append("Risk-increasing factors: " + "; ".join(r["reason"] for r in risk_increasing))

        if risk_decreasing:
            parts.append("Risk-decreasing factors: " + "; ".join(r["reason"] for r in risk_decreasing))

        if uncertainty:
            parts.append("Uncertainty factors: " + "; ".join(r["reason"] for r in uncertainty))

        return " ".join(parts)

    def _recommend_action(self, level: str, confidence: float, reasons: List[Dict]) -> str:
        if level == "CRITICAL":
            return "REJECT: High confidence voice cloning/spoofing detected. Do not trust this audio."
        elif level == "HIGH":
            return "REVIEW: Likely spoofed audio. Require additional verification before trusting."
        elif level == "MEDIUM":
            return "CAUTION: Uncertain result. Consider additional verification steps."
        else:
            return "ACCEPT: Audio appears genuine. Standard verification sufficient."