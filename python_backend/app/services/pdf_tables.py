"""
Deterministic PDF → table extraction (PDF tables → Excel / CSV).

People pay AI/SaaS tools to turn PDF tables into spreadsheets; this does it with a
transparent, deterministic pipeline — no LLM, no per-call cost, and an accuracy you
can explain. It reuses the structure engine's two table detectors and adds
per-column type inference + spreadsheet export.

Pipeline
--------
1. Harvest      — every page's spans + a document-wide font model (reused).
2. Ruled tables — PyMuPDF's vector-graphics finder (high precision, has cell grid).
3. Borderless   — whitespace-aligned grids via column-anchor clustering, on the
                  spans NOT already inside a ruled table (avoids double extraction).
4. Normalise    — pad ragged rows to a rectangle, clean cell whitespace, drop empty
                  rows/cols, and detect a header row.
5. Type model   — per column, infer int / float / currency / percent / date / text
                  from the cell distribution, so the spreadsheet carries real typed
                  values (numbers sum, dates sort) instead of strings.
6. Export       — openpyxl XLSX (one styled sheet per table, typed cells) or CSV.

Each stage is pure and testable; the only deps are PyMuPDF and openpyxl.
"""

from __future__ import annotations

import io
import re
from dataclasses import dataclass, field

from app.services.pdf_structure import (
    build_font_model,
    detect_borderless_table,
    extract_tables,
    group_blocks,
    group_lines,
    harvest_spans,
    segment_regions,
    _spans_outside_tables,
)


@dataclass
class Table:
    """One extracted table, normalised to a rectangular cell matrix."""
    page: int                       # 0-based page index
    bbox: tuple                     # (x0, y0, x1, y1) in points
    rows: list[list[str]]           # rectangular: every row has n_cols cells
    source: str                     # "ruled" | "borderless"
    has_header: bool
    col_types: list[str] = field(default_factory=list)
    confidence: float = 1.0         # 0..1 extraction-quality estimate

    @property
    def n_rows(self) -> int:
        return len(self.rows)

    @property
    def n_cols(self) -> int:
        return len(self.rows[0]) if self.rows else 0

    def body_rows(self) -> list[list[str]]:
        """Data rows only (excludes the header row when one was detected)."""
        return self.rows[1:] if self.has_header else self.rows


# ──────────────────────────────────────────────────────────────────────────────
# Stage 1–4 — detection + normalisation
# ──────────────────────────────────────────────────────────────────────────────

def _normalise(rows: list[list]) -> list[list[str]]:
    """Pad ragged rows to a rectangle, clean whitespace, drop blank rows & columns."""
    cleaned = [[(c or "").replace("\n", " ").replace("\r", " ").strip() for c in r] for r in rows]
    if not cleaned:
        return []
    width = max((len(r) for r in cleaned), default=0)
    rect = [r + [""] * (width - len(r)) for r in cleaned]

    # Drop fully empty rows.
    rect = [r for r in rect if any(c for c in r)]
    if not rect:
        return []

    # Drop fully empty columns (keep alignment across rows).
    keep = [ci for ci in range(len(rect[0])) if any(r[ci] for r in rect)]
    rect = [[r[ci] for ci in keep] for r in rect]
    return rect


def _looks_like_header(rows: list[list[str]], col_types: list[str]) -> bool:
    """Heuristic: row 0 is a header if it is all-text while body columns are typed,
    or its cells are short label-like strings distinct from the rows below.

    A header row over numeric columns is text ("Q1 Sales") above numbers — so if any
    body column is numeric/date but its header cell is non-numeric text, that's a
    strong header signal. Falls back to "all non-empty and no pure numbers in row 0".
    """
    if len(rows) < 2:
        return False
    head = rows[0]
    typed_cols = [i for i, t in enumerate(col_types) if t in ("int", "float", "currency", "percent", "date")]
    if typed_cols:
        # Header cell over a typed column should itself be non-typed text.
        mism = sum(1 for i in typed_cols if head[i] and _cell_type(head[i]) == "text")
        if mism >= max(1, len(typed_cols) // 2):
            return True
    # Fallback: row 0 fully populated and contains no bare numbers.
    if all(c.strip() for c in head) and not any(_cell_type(c) in ("int", "float") for c in head):
        return True
    return False


def extract_tables_from_pdf(data: bytes) -> list[Table]:
    """Extract every table (ruled + borderless) from the PDF, normalised & typed.

    Mirrors the structure engine's table flow so the detection matches what the
    markdown extractor finds, but returns spreadsheet-ready Table objects instead of
    GFM. Borderless detection runs only on spans outside ruled tables.
    """
    import fitz

    doc = fitz.open(stream=data, filetype="pdf")
    try:
        # Document-wide font model from ALL spans (table cells included) so the body
        # size is stable on table-heavy pages.
        model_spans = []
        per_page = []
        for page in doc:
            ruled = extract_tables(page)
            spans = harvest_spans(page)
            model_spans.extend(spans)
            text_spans = _spans_outside_tables(spans, [t["bbox"] for t in ruled])
            per_page.append((text_spans, ruled))
        fm = build_font_model(model_spans)

        out: list[Table] = []
        for page_idx, (text_spans, ruled) in enumerate(per_page):
            page = doc[page_idx]

            # Ruled tables — high precision, take as-is.
            for t in ruled:
                rect = _normalise(t["rows"])
                if len(rect) >= 2 and len(rect[0]) >= 2:
                    out.append(_finalise_table(page_idx, tuple(t["bbox"]), rect, "ruled"))

            # Borderless tables — from whitespace-aligned blocks outside ruled areas.
            page_chars = _page_chars(page)
            regions = segment_regions(text_spans, page.rect.width, page.rect.height)
            for region in regions:
                lines = group_lines(region)
                for blk in group_blocks(lines):
                    if len(blk.lines) < 2:
                        continue
                    grid = detect_borderless_table(blk, fm.body_size)
                    if not grid:
                        continue
                    x0 = min(s.x0 for ln in blk.lines for s in ln.spans)
                    y0 = min(s.y0 for ln in blk.lines for s in ln.spans)
                    x1 = max(s.x1 for ln in blk.lines for s in ln.spans)
                    y1 = max(s.y1 for ln in blk.lines for s in ln.spans)
                    bbox = (x0, y0, x1, y1)
                    # Prefer accurate char-level reconstruction; fall back to the
                    # span-grid if it can't find column structure.
                    accurate = reconstruct_borderless(page, bbox, fm.body_size, page_chars)
                    rect = _normalise(accurate if accurate else grid)
                    if len(rect) < 2 or len(rect[0]) < 2:
                        continue
                    out.append(_finalise_table(page_idx, bbox, rect, "borderless"))

        # Reading order: by page, then top-to-bottom.
        out.sort(key=lambda t: (t.page, t.bbox[1]))
        return out
    finally:
        doc.close()


# ──────────────────────────────────────────────────────────────────────────────
# Accurate borderless reconstruction — char-level column projection
# ──────────────────────────────────────────────────────────────────────────────
#
# The structure engine detects WHICH blocks are borderless tables well, but its
# cell text merges adjacent columns when their gap is tight (numbers run together)
# and it can't split a header span that stretches across several columns. We fix
# both by reconstructing cells from CHARACTER geometry: find the column gutters
# (vertical bands where most rows have whitespace), then drop every character into
# the column its centre falls in. Data spans and merged header spans alike are then
# placed correctly, because the unit of assignment is the glyph, not the span.

def _page_chars(page) -> list[tuple]:
    """Every glyph on the page as (x0, x1, y_mid, char) via the raw char dict."""
    chars: list[tuple] = []
    raw = page.get_text("rawdict")
    for blk in raw.get("blocks", []):
        if blk.get("type") != 0:
            continue
        for line in blk.get("lines", []):
            for span in line.get("spans", []):
                for ch in span.get("chars", []):
                    x0, y0, x1, y1 = ch["bbox"]
                    chars.append((x0, x1, (y0 + y1) / 2, ch.get("c", "")))
    return chars


def _rows_from_chars(chars: list[tuple], body_size: float) -> list[list[tuple]]:
    """Cluster chars into rows by shared baseline, each row sorted left→right."""
    if not chars:
        return []
    tol = max(2.0, body_size * 0.5)
    ordered = sorted(chars, key=lambda c: c[2])
    rows: list[list[tuple]] = []
    centres: list[float] = []
    for c in ordered:
        if rows and abs(centres[-1] - c[2]) <= tol:
            rows[-1].append(c)
        else:
            rows.append([c])
            centres.append(c[2])
    return [sorted(r, key=lambda c: c[0]) for r in rows]


def _column_gutters(rows: list[list[tuple]], body_size: float) -> list[float]:
    """Column boundary x-positions: centres of vertical bands clear in most rows.

    Scans x across the table's width; at each x, measures the fraction of rows that
    have NO glyph there. A run of mostly-clear x wider than a thin gutter is a column
    separator (its midpoint is the boundary). Header spans that cross columns don't
    hide a gutter because the gutter only needs to be clear in a MAJORITY of rows,
    and data rows expose it. Outer margins are ignored.
    """
    if len(rows) < 2:
        return []
    x_lo = min(c[0] for r in rows for c in r)
    x_hi = max(c[1] for r in rows for c in r)
    if x_hi - x_lo < 4:
        return []
    n = len(rows)
    intervals = [[(c[0], c[1]) for c in r] for r in rows]

    def clear_fraction(x: float) -> float:
        clear = 0
        for row in intervals:
            if not any(a <= x <= b for a, b in row):
                clear += 1
        return clear / n

    step = 1.0
    min_gutter = max(body_size * 0.45, 5.0)
    boundaries: list[float] = []
    run_start: float | None = None
    x = x_lo
    while x <= x_hi:
        if clear_fraction(x) >= 0.6:
            if run_start is None:
                run_start = x
        else:
            if run_start is not None:
                _emit_gutter(boundaries, run_start, x, x_lo, x_hi, min_gutter)
                run_start = None
        x += step
    if run_start is not None:
        _emit_gutter(boundaries, run_start, x_hi, x_lo, x_hi, min_gutter)
    return boundaries


def _emit_gutter(out: list[float], a: float, b: float, x_lo: float, x_hi: float, min_gutter: float) -> None:
    """Record an interior clear band [a, b] as a column boundary if it's wide enough."""
    if a <= x_lo + 1 or b >= x_hi - 1:   # skip the outer left/right margins
        return
    if b - a >= min_gutter:
        out.append((a + b) / 2)


def _row_words(row: list[tuple], body_size: float) -> list[tuple]:
    """Group a row's chars into words → list of (x0, x1, text).

    Split on whitespace glyphs and on any gap wider than a fraction of the body
    size (handles fonts that omit space glyphs). Word grouping is what lets column
    assignment keep each token whole — so a boundary never cuts through a word.
    """
    gap = max(body_size * 0.5, 4.0)
    words: list[tuple] = []
    cur: list[tuple] = []
    for c in row:
        x0, x1, _y, ch = c
        if ch.isspace():
            if cur:
                words.append(cur); cur = []
            continue
        if cur and x0 - cur[-1][1] > gap:
            words.append(cur); cur = []
        cur.append(c)
    if cur:
        words.append(cur)
    return [(w[0][0], w[-1][1], "".join(c[3] for c in w)) for w in words]


def _cells_by_columns(rows: list[list[tuple]], boundaries: list[float], body_size: float) -> list[list[str]]:
    """Assign each WORD to the column its centre lands in → a rectangular matrix.

    Word-level (not char-level) assignment guarantees a column boundary never
    splits a token, while a header word that belongs to a different column still
    lands correctly because each word is placed by its own centre.
    """
    edges = [-1e9, *sorted(boundaries), 1e9]

    def col_of(cx: float) -> int:
        for i in range(len(edges) - 1):
            if edges[i] <= cx < edges[i + 1]:
                return i
        return len(edges) - 2

    matrix: list[list[str]] = []
    for row in rows:
        cells = [""] * (len(edges) - 1)
        for wx0, wx1, text in _row_words(row, body_size):
            ci = col_of((wx0 + wx1) / 2)
            cells[ci] = (cells[ci] + " " + text) if cells[ci] else text
        matrix.append([c.strip() for c in cells])
    return matrix


def reconstruct_borderless(page, bbox: tuple, body_size: float, page_chars: list[tuple]) -> list[list[str]] | None:
    """Rebuild a borderless table's cells from char geometry within `bbox`.

    Returns a clean rectangular matrix, or None if no column structure is found
    (≥2 columns required). Far more accurate than span-gap splitting for tight
    numeric columns and column-spanning headers.
    """
    x0, y0, x1, y1 = bbox
    pad = 2.0
    region = [c for c in page_chars if x0 - pad <= (c[0] + c[1]) / 2 <= x1 + pad
              and y0 - pad <= c[2] <= y1 + pad]
    if len(region) < 4:
        return None
    rows = _rows_from_chars(region, body_size)
    if len(rows) < 2:
        return None
    boundaries = _column_gutters(rows, body_size)
    if not boundaries:
        return None
    matrix = _cells_by_columns(rows, boundaries, body_size)
    return matrix if matrix and len(matrix[0]) >= 2 else None


_RE_NUMTOKEN = re.compile(r"[-+]?\d[\d,]*(?:\.\d+)?%?")


def _table_confidence(rows: list[list[str]], col_types: list[str], source: str) -> float:
    """Estimate extraction quality 0..1 (1 = clean grid).

    Ruled tables start fully trusted. For borderless tables — where cells can merge
    when columns are tight — we penalise two tell-tale defects: (a) a numeric column
    whose cells hold MORE than one number (a merge artefact like "99.91%99.97%"), and
    (b) irregular row widths (ragged non-empty counts). The score lets the UI flag
    tables worth a human glance without hiding them.
    """
    if source == "ruled":
        base = 1.0
    else:
        base = 0.9
    if not rows:
        return 0.0

    body = rows[1:] if len(rows) > 1 else rows
    numeric_cols = [i for i, t in enumerate(col_types) if t in ("int", "float", "currency", "percent")]
    merged = total = 0
    for r in body:
        for ci in numeric_cols:
            if ci < len(r) and r[ci]:
                total += 1
                if len(_RE_NUMTOKEN.findall(r[ci])) > 1:
                    merged += 1
    merge_penalty = (merged / total) * 0.6 if total else 0.0

    # Row-width regularity: how consistent is the non-empty cell count per row.
    counts = [sum(1 for c in r if c) for r in rows]
    if counts:
        mode = max(set(counts), key=counts.count)
        irregular = sum(1 for c in counts if c != mode) / len(counts)
    else:
        irregular = 0.0
    irregular_penalty = irregular * 0.25

    return round(max(0.0, base - merge_penalty - irregular_penalty), 2)


def _finalise_table(page: int, bbox: tuple, rect: list[list[str]], source: str) -> Table:
    """Build a Table: detect the header, infer column types from the body, score it.

    Types come from the BODY rows (excluding the header) so a text header like
    "Sales" over numeric data doesn't drag the column to text.
    """
    tbl = Table(page=page, bbox=bbox, rows=rect, source=source, has_header=False)
    provisional = infer_column_types(rect)
    tbl.has_header = _looks_like_header(rect, provisional)
    tbl.col_types = infer_column_types(rect[1:]) if tbl.has_header else provisional
    tbl.confidence = _table_confidence(rect, tbl.col_types, source)
    return tbl


# ──────────────────────────────────────────────────────────────────────────────
# Stage 5 — per-column type inference
# ──────────────────────────────────────────────────────────────────────────────

_RE_INT = re.compile(r"^[-+]?\d{1,3}(,\d{3})+$|^[-+]?\d+$")
_RE_FLOAT = re.compile(r"^[-+]?\d{1,3}(,\d{3})*\.\d+$|^[-+]?\d*\.\d+$")
_RE_PERCENT = re.compile(r"^[-+]?\d+(\.\d+)?\s*%$")
_RE_CURRENCY = re.compile(r"^[$€£¥]\s?[-+]?\d{1,3}(,\d{3})*(\.\d+)?$|^(Rs\.?|USD|LKR|EUR|GBP)\s?[-+]?\d[\d,]*(\.\d+)?$", re.I)
_RE_DATE = re.compile(
    r"^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$"        # 12.03.2026 / 12/03/26
    r"|^\d{4}[./-]\d{1,2}[./-]\d{1,2}$"         # 2026-03-12
    r"|^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}$"     # 12 March 2026
    r"|^[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4}$",  # March 12, 2026
)


def _cell_type(cell: str) -> str:
    """Classify a single cell's value into a coarse type."""
    s = cell.strip()
    if not s:
        return "empty"
    if _RE_PERCENT.match(s):
        return "percent"
    if _RE_CURRENCY.match(s):
        return "currency"
    if _RE_DATE.match(s):
        return "date"
    if _RE_FLOAT.match(s):
        return "float"
    if _RE_INT.match(s):
        return "int"
    return "text"


def infer_column_types(rows: list[list[str]]) -> list[str]:
    """Infer each column's dominant type from its non-empty cells.

    A column is numeric/date only if a clear majority of its filled cells parse as
    that type — otherwise it falls back to text. Mixed int/float collapses to float
    so the whole column stays numeric. Empty cells don't vote.
    """
    if not rows:
        return []
    n_cols = max(len(r) for r in rows)
    types: list[str] = []
    for ci in range(n_cols):
        counts: dict[str, int] = {}
        filled = 0
        for r in rows:
            if ci >= len(r):
                continue
            t = _cell_type(r[ci])
            if t == "empty":
                continue
            filled += 1
            counts[t] = counts.get(t, 0) + 1
        if not filled:
            types.append("text")
            continue
        # Collapse int+float → float for a unified numeric column.
        if counts.get("int", 0) and counts.get("float", 0):
            counts["float"] = counts.get("float", 0) + counts.pop("int")
        dominant = max(counts, key=lambda k: counts[k])
        # Require a real majority to call a column typed; else text.
        types.append(dominant if counts[dominant] >= filled * 0.6 and dominant != "text" else "text")
    return types


# ──────────────────────────────────────────────────────────────────────────────
# Stage 6 — typed value coercion + export
# ──────────────────────────────────────────────────────────────────────────────

def _to_number(s: str) -> float | int | None:
    """Parse a numeric-ish string ('1,234.5', '12%', '$1,200') to a number, or None."""
    t = re.sub(r"[,\s$€£¥%]", "", s).strip()
    t = re.sub(r"^(Rs\.?|USD|LKR|EUR|GBP)", "", t, flags=re.I).strip()
    if not t:
        return None
    try:
        if "." in t:
            return float(t)
        return int(t)
    except ValueError:
        try:
            return float(t)
        except ValueError:
            return None


def _coerce(cell: str, col_type: str):
    """Coerce a cell string to a typed value for the spreadsheet, by column type."""
    s = cell.strip()
    if not s:
        return None
    if col_type in ("int", "float", "currency"):
        n = _to_number(s)
        return n if n is not None else s
    if col_type == "percent":
        n = _to_number(s)
        return (n / 100.0) if n is not None else s
    return s  # date kept as text (locale-safe); text as-is


def tables_to_xlsx(tables: list[Table]) -> bytes:
    """Render tables to an XLSX workbook — one styled sheet per table, typed cells.

    Header rows are bold on a tinted fill; numeric/currency/percent columns carry
    real numbers with a sensible number format so totals and sorting work in Excel.
    """
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter

    wb = Workbook()
    wb.remove(wb.active)  # drop the default empty sheet

    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill("solid", fgColor="2F5496")
    wrap = Alignment(vertical="top", wrap_text=True)

    NUM_FMT = {"int": "#,##0", "float": "#,##0.00", "currency": "#,##0.00", "percent": "0.0%"}

    if not tables:
        ws = wb.create_sheet("No tables found")
        ws["A1"] = "No tables were detected in this PDF."
        buf = io.BytesIO(); wb.save(buf); return buf.getvalue()

    used_names: set[str] = set()
    for idx, tbl in enumerate(tables, start=1):
        name = f"Table {idx} (p{tbl.page + 1})"[:31]
        while name in used_names:
            name = (name[:28] + f"_{idx}")[:31]
        used_names.add(name)
        ws = wb.create_sheet(name)

        start = 0
        if tbl.has_header:
            for ci, cell in enumerate(tbl.rows[0], start=1):
                c = ws.cell(row=1, column=ci, value=cell)
                c.font = header_font
                c.fill = header_fill
                c.alignment = wrap
            ws.freeze_panes = "A2"
            start = 1

        body = tbl.rows[start:]
        for ri, row in enumerate(body, start=start + 1):
            for ci, cell in enumerate(row, start=1):
                col_type = tbl.col_types[ci - 1] if ci - 1 < len(tbl.col_types) else "text"
                value = _coerce(cell, col_type)
                c = ws.cell(row=ri, column=ci, value=value)
                if col_type in NUM_FMT and isinstance(value, (int, float)):
                    c.number_format = NUM_FMT[col_type]
                c.alignment = wrap

        # Auto-ish column widths from the longest cell (capped).
        for ci in range(1, tbl.n_cols + 1):
            longest = max((len(str(r[ci - 1])) for r in tbl.rows if ci - 1 < len(r)), default=8)
            ws.column_dimensions[get_column_letter(ci)].width = min(max(longest + 2, 8), 48)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def tables_to_csv(tables: list[Table]) -> str:
    """Render tables to CSV. Multiple tables are stacked, separated by a blank line
    and a `# Table N (page X)` comment so a single file stays readable."""
    import csv

    out = io.StringIO()
    writer = csv.writer(out)
    for idx, tbl in enumerate(tables, start=1):
        if idx > 1:
            out.write("\n")
        out.write(f"# Table {idx} (page {tbl.page + 1}, {tbl.source})\n")
        for row in tbl.rows:
            writer.writerow(row)
    return out.getvalue()


def tables_summary(tables: list[Table]) -> list[dict]:
    """Lightweight JSON view of detected tables for the UI preview."""
    return [
        {
            "page": t.page,
            "rows": t.n_rows,
            "cols": t.n_cols,
            "source": t.source,
            "hasHeader": t.has_header,
            "colTypes": t.col_types,
            "confidence": t.confidence,
            "cells": t.rows,
        }
        for t in tables
    ]
