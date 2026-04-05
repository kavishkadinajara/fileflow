#!/usr/bin/env python3
"""
FileFlowOne SFI Benchmark Runner — Gap 1, Priority 5.

Runs SFI scoring across all fixture documents in a dataset directory and
produces a summary CSV + console report.

Usage:
    python scripts/benchmark.py [--dataset DATASET_DIR] [--backend URL] [--out OUT.csv]

Dataset layout expected:
    dataset/
      <name>.<ext>          (source files)

All supported conversion pairs are tested for each source file.
Results are written to benchmark_results.csv (or --out path).

Requirements: requests (pip install requests)
"""

from __future__ import annotations

import argparse
import csv
import io
import sys
import time
from pathlib import Path
from typing import Iterator

try:
    import requests
except ImportError:
    print("ERROR: 'requests' is not installed. Run: pip install requests", file=sys.stderr)
    sys.exit(1)

# ─── Constants ────────────────────────────────────────────────────────────────

DEFAULT_BACKEND = "http://localhost:8000"
DEFAULT_DATASET  = Path(__file__).parent.parent / "fixtures"

# Supported SFI conversion pairs (src_ext → tgt_ext)
CONVERSION_PAIRS: list[tuple[str, str]] = [
    ("md",   "html"),
    ("md",   "docx"),
    ("md",   "txt"),
    ("html", "md"),
    ("html", "docx"),
    ("html", "txt"),
    ("docx", "md"),
    ("docx", "html"),
    ("docx", "txt"),
    ("pdf",  "md"),
    ("pdf",  "html"),
    ("pdf",  "txt"),
]

# MIME types for each format
MIME: dict[str, str] = {
    "md":   "text/plain",
    "html": "text/html",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "pdf":  "application/pdf",
    "txt":  "text/plain",
}

SUPPORTED_EXTS = set(MIME.keys())

# Grade thresholds (must match sfi.py)
GRADE_THRESHOLDS = [
    (0.85, "A"),
    (0.70, "B"),
    (0.55, "C"),
    (0.40, "D"),
    (0.00, "F"),
]


def grade(sfi: float) -> str:
    for threshold, letter in GRADE_THRESHOLDS:
        if sfi >= threshold:
            return letter
    return "F"


# ─── Conversion via Next.js API ───────────────────────────────────────────────

NEXTJS_URL = "http://localhost:3000"


def convert_file(
    data: bytes,
    filename: str,
    from_fmt: str,
    to_fmt: str,
) -> bytes | None:
    """
    Calls the Next.js /api/convert endpoint to produce a converted file.
    Returns raw bytes of the converted file, or None on failure.
    """
    import base64, json

    b64 = base64.b64encode(data).decode()
    try:
        resp = requests.post(
            f"{NEXTJS_URL}/api/convert",
            json={
                "fileBase64": b64,
                "fileName": filename,
                "fromFormat": from_fmt,
                "toFormat": to_fmt,
            },
            timeout=120,
        )
        resp.raise_for_status()
        body = resp.json()
        if not body.get("success") or not body.get("fileBase64"):
            return None
        return base64.b64decode(body["fileBase64"])
    except Exception as exc:  # noqa: BLE001
        print(f"    [convert] {from_fmt}→{to_fmt} FAILED: {exc}", file=sys.stderr)
        return None


# ─── SFI scoring via Python backend ──────────────────────────────────────────

def score_pair(
    backend: str,
    original_data: bytes,
    original_name: str,
    converted_data: bytes,
    converted_name: str,
) -> dict | None:
    """POST to /api/slm-score on the Python backend. Returns parsed JSON or None."""
    try:
        resp = requests.post(
            f"{backend}/api/slm-score",
            files={
                "original_file":  (original_name,  io.BytesIO(original_data),  MIME.get(original_name.rsplit(".", 1)[-1], "text/plain")),
                "converted_file": (converted_name, io.BytesIO(converted_data), MIME.get(converted_name.rsplit(".", 1)[-1], "text/plain")),
            },
            timeout=180,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:  # noqa: BLE001
        print(f"    [score] FAILED: {exc}", file=sys.stderr)
        return None


# ─── Fixture discovery ────────────────────────────────────────────────────────

def iter_fixtures(dataset_dir: Path) -> Iterator[tuple[Path, str]]:
    """Yield (path, ext) for every supported source file in dataset_dir."""
    if not dataset_dir.exists():
        print(f"WARNING: Dataset directory not found: {dataset_dir}", file=sys.stderr)
        return
    for path in sorted(dataset_dir.iterdir()):
        if path.is_file():
            ext = path.suffix.lstrip(".").lower()
            if ext in SUPPORTED_EXTS:
                yield path, ext


# ─── Report helpers ───────────────────────────────────────────────────────────

CSV_FIELDS = [
    "file", "src_format", "tgt_format",
    "sfi_score", "grade",
    "structural", "semantic", "functional",
    "processing_ms", "error",
]


def print_summary(rows: list[dict]) -> None:
    ok_rows = [r for r in rows if not r["error"]]
    if not ok_rows:
        print("\nNo successful runs.")
        return

    # Per-pair averages
    from collections import defaultdict
    pair_scores: dict[str, list[float]] = defaultdict(list)
    for r in ok_rows:
        key = f"{r['src_format']}→{r['tgt_format']}"
        pair_scores[key].append(float(r["sfi_score"]))

    print("\n" + "─" * 60)
    print(f"{'Pair':<20} {'N':>4}  {'Mean SFI':>9}  {'Grade':>5}")
    print("─" * 60)
    for pair, scores in sorted(pair_scores.items()):
        mean = sum(scores) / len(scores)
        print(f"{pair:<20} {len(scores):>4}  {mean:>9.4f}  {grade(mean):>5}")
    print("─" * 60)

    total_mean = sum(float(r["sfi_score"]) for r in ok_rows) / len(ok_rows)
    print(f"{'OVERALL':<20} {len(ok_rows):>4}  {total_mean:>9.4f}  {grade(total_mean):>5}")
    print(f"\nErrors: {len(rows) - len(ok_rows)} / {len(rows)}")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="FileFlowOne SFI Benchmark Runner")
    parser.add_argument("--dataset", default=str(DEFAULT_DATASET), help="Path to fixture dataset directory")
    parser.add_argument("--backend", default=DEFAULT_BACKEND, help="Python backend URL (default: http://localhost:8000)")
    parser.add_argument("--out", default="benchmark_results.csv", help="Output CSV path")
    parser.add_argument("--no-convert", action="store_true",
                        help="Skip Next.js conversion step (expects pre-converted files named <stem>.<tgt_ext> alongside source)")
    args = parser.parse_args()

    dataset_dir = Path(args.dataset)
    backend_url = args.backend.rstrip("/")
    out_path    = Path(args.out)

    # Health check
    try:
        r = requests.get(f"{backend_url}/health", timeout=5)
        r.raise_for_status()
        print(f"Backend OK: {backend_url}")
    except Exception:
        print(f"ERROR: Python backend not reachable at {backend_url}", file=sys.stderr)
        print("Start it with: cd python_backend && python -m uvicorn app.main:app --reload", file=sys.stderr)
        sys.exit(1)

    fixtures = list(iter_fixtures(dataset_dir))
    if not fixtures:
        print(f"No supported fixture files found in: {dataset_dir}")
        print("Create fixtures/ directory with .md, .html, .docx, .pdf, or .txt files.")
        sys.exit(0)

    print(f"Found {len(fixtures)} fixture file(s) in {dataset_dir}")

    rows: list[dict] = []
    total = sum(1 for _, ext in fixtures for (a, _) in CONVERSION_PAIRS if a == ext)
    done  = 0

    with out_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=CSV_FIELDS)
        writer.writeheader()

        for src_path, src_ext in fixtures:
            src_data = src_path.read_bytes()
            src_name = src_path.name

            for (pair_src, pair_tgt) in CONVERSION_PAIRS:
                if pair_src != src_ext:
                    continue

                done += 1
                print(f"[{done}/{total}] {src_name}  {pair_src}→{pair_tgt} …", end=" ", flush=True)
                t0 = time.perf_counter()

                row: dict = {
                    "file": src_name, "src_format": pair_src, "tgt_format": pair_tgt,
                    "sfi_score": "", "grade": "", "structural": "", "semantic": "",
                    "functional": "", "processing_ms": "", "error": "",
                }

                # 1. Convert
                if args.no_convert:
                    # Look for pre-converted file alongside source
                    pre = src_path.with_suffix(f".{pair_tgt}")
                    if not pre.exists():
                        row["error"] = f"Pre-converted file not found: {pre.name}"
                        print(f"SKIP ({row['error']})")
                        rows.append(row)
                        writer.writerow(row)
                        continue
                    converted_data = pre.read_bytes()
                else:
                    converted_data = convert_file(src_data, src_name, pair_src, pair_tgt)
                    if converted_data is None:
                        row["error"] = "Conversion failed"
                        print("FAIL (convert)")
                        rows.append(row)
                        writer.writerow(row)
                        continue

                # 2. Score
                converted_name = f"{src_path.stem}.{pair_tgt}"
                result = score_pair(
                    backend_url,
                    src_data,  f"{src_path.stem}.{pair_src}",
                    converted_data, converted_name,
                )
                elapsed = round((time.perf_counter() - t0) * 1000)

                if result is None:
                    row["error"] = "Scoring failed"
                    print(f"FAIL (score)  [{elapsed}ms]")
                else:
                    row.update({
                        "sfi_score":     result.get("sfi_score", ""),
                        "grade":         result.get("grade", ""),
                        "structural":    result.get("breakdown", {}).get("structural", {}).get("score", ""),
                        "semantic":      result.get("breakdown", {}).get("semantic",   {}).get("score", ""),
                        "functional":    result.get("breakdown", {}).get("functional", {}).get("score", ""),
                        "processing_ms": result.get("processing_time_ms", elapsed),
                    })
                    print(f"SFI={row['sfi_score']}  {row['grade']}  [{elapsed}ms]")

                rows.append(row)
                writer.writerow(row)
                csv_file.flush()

    print_summary(rows)
    print(f"\nResults written to: {out_path.resolve()}")


if __name__ == "__main__":
    main()
