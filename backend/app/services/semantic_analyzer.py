import re
from typing import List, Dict, Any


THREAT_PATTERNS: Dict[str, Dict[str, Any]] = {
    "otp_request": {
        "category": "OTP / One-Time Code Request",
        "weight": 0.35,
        "patterns": [
            r"\botp\b",
            r"\bone[- ]time password\b",
            r"\bverification code\b",
            r"\bsecurity code\b",
            r"\bcode bhejo\b",
            r"\bcode batao\b",
            r"\bshare.*code\b",
            r"\bpin number\b",
        ],
    },
    "financial_request": {
        "category": "Financial / Payment Request",
        "weight": 0.30,
        "patterns": [
            r"\btransfer.*money\b",
            r"\bsend.*money\b",
            r"\bbank account\b",
            r"\bupi\b",
            r"\bpaytm\b",
            r"\bgoogle pay\b",
            r"\bphonepe\b",
            r"\bwire transfer\b",
            r"\bpaise.*transfer\b",
            r"\bpaise.*bhejo\b",
            r"\brupaye\b",
            r"\brefund process\b",
        ],
    },
    "credential_request": {
        "category": "Credential / Password Request",
        "weight": 0.30,
        "patterns": [
            r"\bpassword\b",
            r"\bpasscode\b",
            r"\blogin details\b",
            r"\bnet banking password\b",
            r"\bsecret key\b",
            r"\bpassword batao\b",
            r"\bcredentials\b",
        ],
    },
    "sensitive_information": {
        "category": "Sensitive PII / Card Details Request",
        "weight": 0.25,
        "patterns": [
            r"\bcvv\b",
            r"\baadhaar\b",
            r"\bpan card\b",
            r"\bcard number\b",
            r"\bexpiry date\b",
            r"\baccount number\b",
            r"\bcard details\b",
        ],
    },
    "urgency": {
        "category": "High Urgency / Pressure Tactics",
        "weight": 0.20,
        "patterns": [
            r"\bimmediately\b",
            r"\burgent\b",
            r"\bhurry\b",
            r"\baccount.*blocked\b",
            r"\baccount.*freeze\b",
            r"\bpolice action\b",
            r"\bwithin 5 minutes\b",
            r"\bturant\b",
            r"\bjaldi\b",
            r"\babhi karo\b",
        ],
    },
    "authority_impersonation": {
        "category": "Authority Impersonation",
        "weight": 0.25,
        "patterns": [
            r"\bcalling from.*bank\b",
            r"\brbi officer\b",
            r"\bpolice officer\b",
            r"\bcbi officer\b",
            r"\btax department\b",
            r"\bcustomer support manager\b",
            r"\bbank manager\b",
            r"\bbank se bol raha\b",
            r"\bofficer speaking\b",
        ],
    },
    "verification_bypass": {
        "category": "Verification Bypass / Secrecy Request",
        "weight": 0.20,
        "patterns": [
            r"\bdon'?t tell anyone\b",
            r"\bkeep this secret\b",
            r"\bskip verification\b",
            r"\bdo not share with anyone else\b",
            r"\bkisi ko mat batana\b",
            r"\bsecret rakho\b",
        ],
    },
}


class SemanticAnalyzer:
    def __init__(self):
        self.threat_patterns = THREAT_PATTERNS

    def analyze(self, transcript: str) -> Dict[str, Any]:
        if not transcript or not transcript.strip():
            return {
                "transcript": "",
                "semantic_risk_score": 0.0,
                "threat_level": "LOW",
                "detected_indicators": [],
                "recommended_action": "No speech transcript available for semantic threat analysis.",
            }

        text_lower = transcript.lower()
        detected_indicators: List[Dict[str, Any]] = []
        total_weight = 0.0

        for key, info in self.threat_patterns.items():
            matched_terms = []
            for pat in info["patterns"]:
                matches = re.findall(pat, text_lower)
                if matches:
                    matched_terms.extend(matches)

            if matched_terms:
                unique_terms = list(set(matched_terms))
                total_weight += info["weight"]
                detected_indicators.append({
                    "indicator_type": key,
                    "category": info["category"],
                    "weight": info["weight"],
                    "matched_terms": unique_terms,
                    "snippet": f"Detected {info['category']} ({', '.join(unique_terms)})",
                })

        # Cap risk score between 0.0 and 1.0
        semantic_risk_score = min(1.0, round(total_weight, 2))

        if semantic_risk_score >= 0.7:
            threat_level = "CRITICAL"
            action = "HIGH RISK SCAM ATTEMPT DETECTED: Terminate call immediately. Do NOT provide requested credentials or funds."
        elif semantic_risk_score >= 0.4:
            threat_level = "HIGH"
            action = "SUSPICIOUS SOLICITATION: Verify caller identity through official channels before acting."
        elif semantic_risk_score >= 0.2:
            threat_level = "MEDIUM"
            action = "MODERATE THREAT INDICATORS: Exercise caution when sharing information."
        else:
            threat_level = "LOW"
            action = "NO THREAT INDICATORS DETECTED: Speech content appears standard."

        return {
            "transcript": transcript,
            "semantic_risk_score": semantic_risk_score,
            "threat_level": threat_level,
            "detected_indicators": detected_indicators,
            "recommended_action": action,
        }
