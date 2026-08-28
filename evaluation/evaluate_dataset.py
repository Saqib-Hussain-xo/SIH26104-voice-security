import os
import sys
import time
import asyncio
from typing import List, Dict

# Ensure backend app is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.models.spoof_detector import SpoofDetector
from app.services.audio import AudioProcessor
from app.services.risk_engine import RiskEngine

async def evaluate_samples(sample_paths: List[str], ground_truth: Dict[str, str] = None):
    print("==================================================")
    print("SIH26104 Voice Security MVP — Evaluation Routine")
    print("==================================================")
    
    if ground_truth is None:
        ground_truth = {}
        print("Note: Ground truth labels not supplied for samples. Reporting scores & predictions.")

    audio_processor = AudioProcessor()
    detector = SpoofDetector()
    risk_engine = RiskEngine()
    
    print("Loading pretrained AASIST model...")
    await detector.load()
    
    results = []
    
    for path in sample_paths:
        if not os.path.exists(path):
            print(f"File not found: {path}")
            continue
            
        filename = os.path.basename(path)
        start_time = time.perf_counter()
        
        try:
            waveform = audio_processor.process(path, filename)
            spoof_result = await detector.detect(waveform)
            risk = risk_engine.assess(
                spoof_result=spoof_result,
                speaker_result=None,
                audio_quality=audio_processor.get_quality_metrics(waveform),
            )
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            
            label_gt = ground_truth.get(filename, "Ground truth unavailable")
            
            item = {
                "file": filename,
                "ground_truth": label_gt,
                "prediction": spoof_result.label,
                "raw_bona_fide_score": round(spoof_result.raw_score, 4),
                "risk_score": risk.score,
                "risk_level": risk.level,
                "processing_time_ms": round(elapsed_ms, 2)
            }
            results.append(item)
            
            print(f"Sample: {filename}")
            print(f"  - Ground Truth: {label_gt}")
            print(f"  - AASIST Prediction: {spoof_result.label} (Bona fide logit: {spoof_result.raw_score:.4f})")
            print(f"  - System Risk: {risk.level} ({risk.score*100:.1f}%)")
            print(f"  - Processing Time: {elapsed_ms:.2f} ms\n")
            
        except Exception as e:
            print(f"Error processing {filename}: {e}\n")

    print("==================================================")
    print(f"Evaluated {len(results)} sample(s).")
    print("==================================================")
    return results

if __name__ == "__main__":
    test_audio = os.path.join(os.path.dirname(__file__), "..", "backend", "test_audio.wav")
    asyncio.run(evaluate_samples([test_audio]))
