"""
StockSense Pipeline Runner (Phase 8)
Runs all pipeline steps in order, printing step name and elapsed seconds.
Usage: python src/run_all.py
"""
import os
import sys
import time
import subprocess

STEPS = [
    ("make_dataset", "src/make_dataset.py"),
    ("clean",        "src/clean.py"),
    ("stats",        "src/stats.py"),
    ("features",     "src/features.py"),
    ("train",        "src/train.py"),
    ("explain",      "src/explain.py"),
    ("predict",      "src/predict.py"),
]

def run_step(name: str, script: str) -> float:
    t0 = time.time()
    result = subprocess.run(
        [sys.executable, script],
        capture_output=True,
        text=True
    )
    elapsed = time.time() - t0
    if result.returncode != 0:
        print(f"  [FAIL] {name} ({elapsed:.1f}s)")
        print(result.stderr[-400:] if result.stderr else result.stdout[-400:])
        sys.exit(1)
    print(f"  [PASS] {name:<20} {elapsed:.1f}s")
    return elapsed

if __name__ == "__main__":
    print("=== StockSense Pipeline ===")
    total = 0.0
    for name, script in STEPS:
        total += run_step(name, script)
    print(f"\nAll steps completed in {total:.1f}s total.")
