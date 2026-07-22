"""
ConvertBench-lite — ground-truth table fixture generator.

Draws 6 PDF fixtures with PyMuPDF at exact coordinates, so the cell matrix is
known by construction (no annotation step). Covers the axes that separate
table extractors:

  T1 ruled grid, text cells            (the easy case — must be exact)
  T2 ruled grid, numeric + currency    (typed columns)
  T3 borderless, left-aligned text     (column projection required)
  T4 borderless, right-aligned numbers (alignment variance)
  T5 borderless, tight numeric columns (the known-hard case)
  T6 two tables + prose paragraphs     (detection precision: prose ≠ table)

Writes bench/tables/fixtures/*.pdf and fixtures.json (ground truth).

Run: python_backend/.venv/Scripts/python.exe bench/tables/make_fixtures.py
"""

from __future__ import annotations

import json
import pathlib

import fitz  # PyMuPDF

HERE = pathlib.Path(__file__).parent
OUT = HERE / "fixtures"
OUT.mkdir(exist_ok=True)

FONT = "helv"
BOLD = "hebo"
SIZE = 10.0
ROW_H = 15.0   # realistic row pitch for 10pt text; t7 tests an airy 24pt pitch


def draw_table(page: fitz.Page, x0: float, y0: float, col_widths: list[float],
               cells: list[list[str]], ruled: bool, align_right: set[int] | None = None,
               header_bold: bool = True) -> None:
    align_right = align_right or set()
    n_rows = len(cells)
    xs = [x0]
    for w in col_widths:
        xs.append(xs[-1] + w)
    ys = [y0 + r * ROW_H for r in range(n_rows + 1)]

    if ruled:
        for y in ys:
            page.draw_line(fitz.Point(xs[0], y), fitz.Point(xs[-1], y), width=0.7)
        for x in xs:
            page.draw_line(fitz.Point(x, ys[0]), fitz.Point(x, ys[-1]), width=0.7)

    for r, row in enumerate(cells):
        for c, text in enumerate(row):
            font = BOLD if (r == 0 and header_bold) else FONT
            fw = fitz.Font(font).text_length(text, fontsize=SIZE)
            if c in align_right and r > 0:
                x = xs[c + 1] - 6 - fw
            else:
                x = xs[c] + 6
            y = ys[r] + ROW_H - 7          # baseline near the bottom of the row
            page.insert_text(fitz.Point(x, y), text, fontname=font, fontsize=SIZE)


def prose(page: fitz.Page, x: float, y: float, width: float, text: str) -> float:
    rect = fitz.Rect(x, y, x + width, y + 300)
    page.insert_textbox(rect, text, fontname=FONT, fontsize=SIZE, lineheight=1.45)
    lines = max(1, int(fitz.Font(FONT).text_length(text, fontsize=SIZE) // (width - 10)) + 1)
    return y + lines * SIZE * 1.45 + 14


FIXTURES: list[dict] = []


def fixture(name: str, tables: list[list[list[str]]]) -> dict:
    fx = {"file": f"{name}.pdf", "tables": [{"page": 0, "cells": t} for t in tables]}
    FIXTURES.append(fx)
    return fx


# ── T1 ruled text ──────────────────────────────────────────────────────────────
T1 = [
    ["Division", "Lead", "Region", "Status"],
    ["Retail", "N. Perera", "Western", "On track"],
    ["Logistics", "S. Fernando", "Southern", "Watch"],
    ["Analytics", "M. Silva", "Central", "On track"],
    ["Exports", "K. Bandara", "Northern", "Behind"],
]
doc = fitz.open(); page = doc.new_page()
page.insert_text(fitz.Point(56, 50), "Quarterly divisional summary", fontname=BOLD, fontsize=13)
draw_table(page, 56, 80, [110, 120, 100, 90], T1, ruled=True)
doc.save(OUT / "t1_ruled_text.pdf"); doc.close()
fixture("t1_ruled_text", [T1])

# ── T2 ruled numeric ───────────────────────────────────────────────────────────
T2 = [
    ["Item", "Qty", "Unit Price", "Total"],
    ["Widget A", "12", "1,450.00", "17,400.00"],
    ["Widget B", "3", "22,000.00", "66,000.00"],
    ["Bracket", "140", "85.50", "11,970.00"],
    ["Fastener", "1,200", "2.25", "2,700.00"],
    ["Shipping", "1", "5,600.00", "5,600.00"],
]
doc = fitz.open(); page = doc.new_page()
page.insert_text(fitz.Point(56, 50), "Invoice 2026-118", fontname=BOLD, fontsize=13)
draw_table(page, 56, 80, [130, 70, 110, 110], T2, ruled=True, align_right={1, 2, 3})
doc.save(OUT / "t2_ruled_numeric.pdf"); doc.close()
fixture("t2_ruled_numeric", [T2])

# ── T3 borderless text ─────────────────────────────────────────────────────────
T3 = [
    ["Service", "Owner", "Tier"],
    ["Ingestion", "Platform", "Gold"],
    ["Conversion", "Documents", "Gold"],
    ["Scoring", "Research", "Silver"],
    ["Audit log", "Security", "Bronze"],
    ["Renderer", "Documents", "Silver"],
]
doc = fitz.open(); page = doc.new_page()
page.insert_text(fitz.Point(56, 50), "Service ownership register", fontname=BOLD, fontsize=13)
draw_table(page, 56, 80, [150, 140, 100], T3, ruled=False)
doc.save(OUT / "t3_borderless_text.pdf"); doc.close()
fixture("t3_borderless_text", [T3])

# ── T4 borderless right-aligned numbers ────────────────────────────────────────
T4 = [
    ["Month", "Orders", "Returns", "Net"],
    ["January", "4,120", "180", "3,940"],
    ["February", "3,890", "140", "3,750"],
    ["March", "4,505", "210", "4,295"],
    ["April", "4,010", "165", "3,845"],
]
doc = fitz.open(); page = doc.new_page()
page.insert_text(fitz.Point(56, 50), "Order volumes", fontname=BOLD, fontsize=13)
draw_table(page, 56, 80, [110, 100, 100, 100], T4, ruled=False, align_right={1, 2, 3})
doc.save(OUT / "t4_borderless_numbers.pdf"); doc.close()
fixture("t4_borderless_numbers", [T4])

# ── T5 borderless tight numeric ────────────────────────────────────────────────
T5 = [
    ["Run", "P50", "P95", "P99", "Err"],
    ["a1", "82", "141", "310", "0.2"],
    ["a2", "79", "150", "295", "0.1"],
    ["b1", "91", "160", "402", "0.4"],
    ["b2", "88", "155", "388", "0.3"],
]
doc = fitz.open(); page = doc.new_page()
page.insert_text(fitz.Point(56, 50), "Latency benchmarks (ms)", fontname=BOLD, fontsize=13)
draw_table(page, 56, 80, [70, 62, 62, 62, 56], T5, ruled=False, align_right={1, 2, 3, 4})
doc.save(OUT / "t5_tight_numeric.pdf"); doc.close()
fixture("t5_tight_numeric", [T5])

# ── T6 mixed page: prose + 2 tables ────────────────────────────────────────────
T6A = [
    ["Risk", "Severity", "Owner"],
    ["Vendor lock-in", "Medium", "Procurement"],
    ["Key-person loss", "High", "Engineering"],
    ["Cost overrun", "Medium", "Finance"],
]
T6B = [
    ["Milestone", "Due", "State"],
    ["Design freeze", "March", "Done"],
    ["Pilot rollout", "June", "Active"],
    ["Full launch", "October", "Planned"],
]
doc = fitz.open(); page = doc.new_page()
page.insert_text(fitz.Point(56, 50), "Programme status report", fontname=BOLD, fontsize=13)
y = prose(page, 56, 74, 480,
          "The programme remains within its approved envelope. Two workstreams closed their "
          "design phases this quarter, and the supplier onboarding backlog cleared after the "
          "second procurement round. Attention now shifts to the pilot sites, where training "
          "capacity is the binding constraint for the coming period.")
draw_table(page, 56, y + 8, [150, 90, 120], T6A, ruled=True)
y2 = y + 8 + ROW_H * len(T6A) + 26
y2 = prose(page, 56, y2, 480,
           "Milestone tracking continues on the standard cadence. Dates below reflect the "
           "re-baselined plan agreed at the last steering committee.")
draw_table(page, 56, y2 + 8, [150, 90, 100], T6B, ruled=False)
doc.save(OUT / "t6_mixed_page.pdf"); doc.close()
fixture("t6_mixed_page", [T6A, T6B])

# ── T7 airy borderless (row pitch 24pt — documents the pitch limitation) ──────
T7 = [
    ["Service", "Owner", "Tier"],
    ["Ingestion", "Platform", "Gold"],
    ["Conversion", "Documents", "Gold"],
    ["Scoring", "Research", "Silver"],
]
ROW_H = 24.0
doc = fitz.open(); page = doc.new_page()
page.insert_text(fitz.Point(56, 50), "Airy layout register", fontname=BOLD, fontsize=13)
draw_table(page, 56, 80, [150, 140, 100], T7, ruled=False)
doc.save(OUT / "t7_airy_borderless.pdf"); doc.close()
fixture("t7_airy_borderless", [T7])

(HERE / "fixtures.json").write_text(json.dumps(FIXTURES, indent=2), encoding="utf-8")
print(f"Wrote {len(FIXTURES)} fixtures -> {OUT}")
