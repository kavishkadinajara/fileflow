"""
ConvertBench-lite — pdfplumber baseline extraction.

Runs pdfplumber's table extraction (default lattice-ish "lines" strategy first,
falling back to "text" strategy when no lines exist — its documented usage for
borderless tables) over every fixture PDF and writes the raw cell matrices to
pdfplumber_tables.json for the scorer.

Run: python_backend/.venv/Scripts/python.exe bench/tables/baseline_pdfplumber.py
"""

from __future__ import annotations

import json
import pathlib

import pdfplumber

HERE = pathlib.Path(__file__).parent
OUT = HERE / "fixtures"

results: dict[str, list[dict]] = {}

for pdf_path in sorted(OUT.glob("*.pdf")):
    tables: list[dict] = []
    with pdfplumber.open(pdf_path) as pdf:
        for pno, page in enumerate(pdf.pages):
            found = page.extract_tables()          # lines strategy (default)
            if not found:
                found = page.extract_tables({
                    "vertical_strategy": "text",
                    "horizontal_strategy": "text",
                })
            for t in found:
                cells = [[(c or "").strip() for c in row] for row in t]
                tables.append({"page": pno, "cells": cells})
    results[pdf_path.name] = tables
    print(f"{pdf_path.name}: {len(tables)} table(s)")

(HERE / "pdfplumber_tables.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
print("Wrote pdfplumber_tables.json")
