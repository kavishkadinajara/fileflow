#!/usr/bin/env python3
"""
ConvertBench fixture generator — Gap 1, Priority 6 (companion to benchmark.py).

Reads .md and .html source files from fixtures/ and generates derived
.docx, .pdf, and .txt versions by calling the Next.js /api/convert endpoint.

This script is separate from the benchmark runner so that:
  1. Binary fixtures (.docx, .pdf) do not need to be committed to git.
  2. Fixtures can be regenerated any time the conversion pipeline changes.
  3. benchmark.py can use --no-convert mode against pre-generated fixtures.

Usage:
    python scripts/generate_fixtures.py [--fixtures FIXTURES_DIR] [--formats docx pdf txt]

Requirements: requests (pip install requests)

Both the Next.js server (localhost:3000) must be running.
"""

from __future__ import annotations

import argparse
import base64
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: 'requests' not installed. Run: pip install requests", file=sys.stderr)
    sys.exit(1)

NEXTJS_URL   = "http://localhost:3000"
DEFAULT_FIXTURES = Path(__file__).parent.parent / "fixtures"

# MIME types for output files
MIME: dict[str, str] = {
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "pdf":  "application/pdf",
    "html": "text/html",
    "txt":  "text/plain",
    "md":   "text/plain",
}

# Conversions to generate: (source_ext, target_ext)
GENERATE_PAIRS: list[tuple[str, str]] = [
    ("md",   "docx"),
    ("md",   "pdf"),
    ("md",   "html"),
    ("md",   "txt"),
    ("html", "docx"),
    ("html", "pdf"),
    ("html", "md"),
    ("html", "txt"),
]


def convert(data: bytes, filename: str, from_fmt: str, to_fmt: str) -> bytes | None:
    b64 = base64.b64encode(data).decode()
    try:
        resp = requests.post(
            f"{NEXTJS_URL}/api/convert",
            json={
                "fileBase64": b64,
                "fileName":   filename,
                "fromFormat": from_fmt,
                "toFormat":   to_fmt,
            },
            timeout=120,
        )
        resp.raise_for_status()
        body = resp.json()
        if not body.get("success") or not body.get("fileBase64"):
            print(f"    Conversion returned success=false: {body.get('error', '?')}", file=sys.stderr)
            return None
        return base64.b64decode(body["fileBase64"])
    except Exception as exc:
        print(f"    ERROR: {exc}", file=sys.stderr)
        return None


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate ConvertBench binary fixtures")
    parser.add_argument("--fixtures", default=str(DEFAULT_FIXTURES), help="Fixtures directory")
    parser.add_argument(
        "--formats", nargs="+", default=["docx", "pdf"],
        help="Target formats to generate (default: docx pdf)",
    )
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing files")
    args = parser.parse_args()

    fixtures_dir = Path(args.fixtures)
    target_fmts  = set(args.formats)

    # Health check
    try:
        requests.get(f"{NEXTJS_URL}/api/convert", timeout=5)
    except Exception:
        # 405 Method Not Allowed is expected for GET — server is up
        pass

    try:
        r = requests.post(f"{NEXTJS_URL}/api/convert", json={}, timeout=5)
        # 400 = server is up and validated our bad request
    except Exception:
        print(f"ERROR: Next.js server not reachable at {NEXTJS_URL}", file=sys.stderr)
        print("Start it with: npm run dev", file=sys.stderr)
        sys.exit(1)

    pairs = [(a, b) for (a, b) in GENERATE_PAIRS if b in target_fmts]

    source_files = [
        (p, p.suffix.lstrip(".").lower())
        for p in sorted(fixtures_dir.iterdir())
        if p.is_file() and p.suffix.lstrip(".").lower() in {"md", "html"}
    ]

    if not source_files:
        print(f"No .md or .html source files found in {fixtures_dir}")
        sys.exit(0)

    total = sum(1 for (_, ext) in source_files for (a, _) in pairs if a == ext)
    done  = skipped = errors = 0

    print(f"Generating {total} fixture file(s) from {len(source_files)} source(s)…\n")

    for src_path, src_ext in source_files:
        for (pair_src, pair_tgt) in pairs:
            if pair_src != src_ext:
                continue

            out_path = fixtures_dir / f"{src_path.stem}.{pair_tgt}"
            if out_path.exists() and not args.overwrite:
                print(f"  SKIP  {out_path.name}  (already exists, use --overwrite)")
                skipped += 1
                continue

            print(f"  {src_path.name}  →  {out_path.name} … ", end="", flush=True)
            t0 = time.perf_counter()

            data    = src_path.read_bytes()
            result  = convert(data, src_path.name, pair_src, pair_tgt)
            elapsed = round((time.perf_counter() - t0) * 1000)

            if result is None:
                print(f"FAIL  [{elapsed}ms]")
                errors += 1
            else:
                out_path.write_bytes(result)
                size_kb = round(len(result) / 1024, 1)
                print(f"OK  {size_kb} KB  [{elapsed}ms]")
                done += 1

    print(f"\nDone: {done} generated, {skipped} skipped, {errors} errors")
    if done > 0:
        print(f"Output directory: {fixtures_dir.resolve()}")
    if errors > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
