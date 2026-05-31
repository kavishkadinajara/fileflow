"""
Deterministic PDF structure extraction engine.

Reconstructs the logical document structure (headings, paragraphs, lists,
tables, reading order) from a PDF's raw glyph geometry — no AI, no LLM. The goal
is *accuracy*: instead of the naive "split text by newline + title-case = heading"
heuristic, this analyses the actual visual layout the way a human reader's eye
does, using the font metrics and positions PyMuPDF exposes per span.

Pipeline
--------
1. Span harvest          — every glyph run with size, font, weight, colour, bbox.
2. Font-size modelling    — char-weighted histogram → body size; rarer larger
                            sizes become heading tiers (H1…H6) by rank.
3. Column segmentation    — recursive XY-cut on the whitespace projection profile
                            to detect multi-column layouts and fix reading order.
4. Line reconstruction    — spans grouped into lines by shared baseline, lines
                            grouped into blocks by vertical gap; hyphen/®soft
                            line-breaks merged back into flowing sentences.
5. Block classification    — heading tier / paragraph / list item, from the font
                            model + indentation + leading-glyph geometry.
6. Table detection         — ruled tables via vector graphics; emitted as GFM.
7. Markdown emission       — assembled in corrected reading order.

Each stage is pure and independently testable. The only dependencies are
PyMuPDF (fitz) and the standard library.
"""

from __future__ import annotations

import re
import statistics
from dataclasses import dataclass, field
from typing import Iterable

# PyMuPDF span "flags" bitfield — see fitz docs.
_FLAG_SUPERSCRIPT = 1 << 0
_FLAG_ITALIC = 1 << 1
_FLAG_SERIF = 1 << 2
_FLAG_MONOSPACE = 1 << 3
_FLAG_BOLD = 1 << 4

# Tunables — chosen from typographic norms, not magic guesses.
_BASELINE_TOL_RATIO = 0.40   # spans within 40% of font-size share a baseline.
_PARA_GAP_RATIO = 0.75       # vertical gap > 0.75× line-height starts a new block.
_COLUMN_MIN_GAP_RATIO = 0.06  # a column gutter must be ≥6% of page width.
_HEADING_SIZE_MARGIN = 1.10   # a tier must be ≥10% larger than the one below it.
_LIST_BULLETS = "•‣◦⁃∙-*·▪●․"

# Pre-compiled regexes — these run per line, so compile once at import, not in
# the hot loop. The ordered-list pattern matches "1." "12)" "a." "iv)" markers.
_RE_ORDERED_MARKER = re.compile(r"^(\d{1,3}|[a-zA-Z]|[ivxIVX]{1,4})[.)]\s+\S")
_RE_ORDERED_STRIP = re.compile(r"^(\d{1,3}|[a-zA-Z]|[ivxIVX]{1,4})[.)]\s+")
_RE_TRAILING_WS = re.compile(r"[ \t]+\n")
_RE_BLANK_RUN = re.compile(r"\n{3,}")


# ──────────────────────────────────────────────────────────────────────────────
# Stage 1 — span harvesting
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class Span:
    text: str
    size: float
    font: str
    flags: int
    color: int
    x0: float
    y0: float
    x1: float
    y1: float
    origin_y: float  # text baseline (more stable than bbox for grouping)

    @property
    def bold(self) -> bool:
        return bool(self.flags & _FLAG_BOLD) or "bold" in self.font.lower() or "black" in self.font.lower()

    @property
    def italic(self) -> bool:
        return bool(self.flags & _FLAG_ITALIC) or "italic" in self.font.lower() or "oblique" in self.font.lower()

    @property
    def mono(self) -> bool:
        return bool(self.flags & _FLAG_MONOSPACE) or "mono" in self.font.lower() or "courier" in self.font.lower()

    @property
    def char_count(self) -> int:
        return len(self.text.strip())


def harvest_spans(page) -> list[Span]:
    """Pull every visible text span on a page with its full geometry + style."""
    spans: list[Span] = []
    raw = page.get_text("dict")
    for block in raw.get("blocks", []):
        if block.get("type") != 0:  # 0 = text, 1 = image
            continue
        for line in block.get("lines", []):
            for s in line.get("spans", []):
                text = s.get("text", "")
                if not text.strip():
                    continue
                bbox = s["bbox"]
                origin = s.get("origin", (bbox[0], bbox[3]))
                spans.append(
                    Span(
                        text=text,
                        size=round(float(s.get("size", 0.0)), 2),
                        font=str(s.get("font", "")),
                        flags=int(s.get("flags", 0)),
                        color=int(s.get("color", 0)),
                        x0=bbox[0], y0=bbox[1], x1=bbox[2], y1=bbox[3],
                        origin_y=float(origin[1]),
                    )
                )
    return spans


# ──────────────────────────────────────────────────────────────────────────────
# Stage 2 — font-size model (the heart of heading detection)
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class FontModel:
    body_size: float
    # Maps a rounded font size → heading level (1..6). Sizes ≤ body are absent.
    size_to_level: dict[float, int] = field(default_factory=dict)

    def level_for(self, span: Span) -> int:
        """Heading level for a span, or 0 if it is body text.

        A span is promoted only if its size is a known heading tier. Bold body-
        sized text is *not* treated as a heading (it is emphasis) unless it is
        also a short stand-alone line — that case is handled by the classifier.
        """
        return self.size_to_level.get(round(span.size, 2), 0)


def build_font_model(spans: Iterable[Span]) -> FontModel:
    """Derive body text size and heading tiers from the size distribution.

    Body size = the size carrying the most *characters* (not the most spans — a
    document has few big-title spans but they shouldn't dominate). Heading tiers
    are the distinct sizes meaningfully larger than the body, collapsed so that
    near-identical sizes (e.g. 15.9 vs 16.0) map to one level, then ranked
    largest→smallest into H1, H2, ….
    """
    weight: dict[float, int] = {}
    for s in spans:
        weight[round(s.size, 2)] = weight.get(round(s.size, 2), 0) + s.char_count
    if not weight:
        return FontModel(body_size=12.0)

    body_size = max(weight, key=lambda k: weight[k])

    # Candidate heading sizes: strictly larger than body and not vanishingly rare.
    total_chars = sum(weight.values())
    larger = sorted(
        (sz for sz, w in weight.items()
         if sz > body_size * _HEADING_SIZE_MARGIN and w >= 1 and w / total_chars < 0.5),
        reverse=True,
    )

    # Collapse sizes that are within the heading margin of each other into one
    # tier (handles sub-pixel size jitter across a heading run).
    tiers: list[float] = []
    for sz in larger:
        if not tiers or sz < tiers[-1] / _HEADING_SIZE_MARGIN:
            tiers.append(sz)

    size_to_level: dict[float, int] = {}
    # Assign every larger-than-body size to the nearest tier's level.
    for sz in larger:
        level = 1 + min(range(len(tiers)), key=lambda i: abs(tiers[i] - sz)) if tiers else 1
        size_to_level[sz] = min(level, 6)

    return FontModel(body_size=body_size, size_to_level=size_to_level)


# ──────────────────────────────────────────────────────────────────────────────
# Stage 3 — region segmentation (true recursive XY-cut)
# ──────────────────────────────────────────────────────────────────────────────

def _largest_gap(intervals: list[tuple[float, float]], min_gap: float) -> float | None:
    """Find the midpoint of the widest empty band between occupied ranges.

    `intervals` are the occupied (start, end) ranges along one axis. We merge them
    and scan the holes between consecutive occupied ranges; the widest hole wider
    than `min_gap` is where we cut. Returns None if no qualifying gap exists.
    """
    if not intervals:
        return None
    merged: list[list[float]] = []
    for a, b in sorted(intervals):
        if merged and a <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], b)
        else:
            merged.append([a, b])

    best_gap = 0.0
    best_mid: float | None = None
    for (a1, b1), (a2, b2) in zip(merged, merged[1:]):
        gap = a2 - b1
        if gap > best_gap and gap >= min_gap:
            best_gap = gap
            best_mid = (b1 + a2) / 2
    return best_mid


def _straddles_like_table(spans: list[Span], cut_x: float, body_size: float) -> bool:
    """True if the region is a table body rather than side-by-side text columns.

    Both a table and a two-column layout have rows with text either side of the
    vertical gap, so straddling alone can't tell them apart. The reliable signal
    is the *number of gap-separated cells per row*: a table row breaks into several
    short cells (Region | Sales | Growth), while a text-column row is one long run
    of words per side. We split each baseline-row at wide gaps (the same cell logic
    the table emitter uses) and call it table-like when most rows yield ≥3 cells,
    or yield 2 cells that are both short (a genuine two-column *table*).
    """
    rows: dict[float, list[Span]] = {}
    for s in spans:
        key = round(s.origin_y / 3.0)  # ~3pt baseline buckets
        rows.setdefault(key, []).append(s)
    straddling = [r for r in rows.values()
                  if any(s.x1 <= cut_x for s in r) and any(s.x0 >= cut_x for s in r)]
    if len(straddling) < 2:
        return False

    gap_threshold = max(body_size * 1.6, 12.0)
    region_w = max(1.0, max(s.x1 for s in spans) - min(s.x0 for s in spans))
    table_like = 0
    for row in straddling:
        cells = _split_row_at_gaps(row, gap_threshold)
        if len(cells) >= 3:
            table_like += 1
        elif len(cells) == 2:
            # Two short clusters with wide whitespace between ⇒ table, not columns.
            widths = [(c[-1].x1 - c[0].x0) for c in cells]
            if all(w < region_w * 0.30 for w in widths):
                table_like += 1
    return table_like >= len(straddling) * 0.6


def _split_row_at_gaps(spans: list[Span], gap_threshold: float) -> list[list[Span]]:
    """Cluster a row's spans into cells separated by gaps ≥ gap_threshold."""
    ordered = sorted(spans, key=lambda s: s.x0)
    cells: list[list[Span]] = [[ordered[0]]]
    for s in ordered[1:]:
        if s.x0 - cells[-1][-1].x1 >= gap_threshold:
            cells.append([s])
        else:
            cells[-1].append(s)
    return cells


def segment_regions(spans: list[Span], page_width: float, page_height: float,
                    depth: int = 0) -> list[list[Span]]:
    """Recursive XY-cut: split a span set into reading-order regions.

    Alternates between horizontal (Y) and vertical (X) cuts, each time cutting at
    the single most significant whitespace band. This is the correct fix for the
    full-width-title-over-two-columns case: the blank band *below* the title is a
    horizontal gap, so the Y-cut peels the title off as its own region BEFORE any
    vertical column split happens — instead of slicing the title down the middle.

    Reading order is preserved by concatenation order: Y-cut yields top→bottom,
    X-cut yields left→right. Recursion handles arbitrary nesting (title, then
    columns, then a sub-figure spanning one column, …).
    """
    if len(spans) < 4 or depth > 12:
        return [spans]

    min_v_gap = max(8.0, page_width * _COLUMN_MIN_GAP_RATIO)   # column gutter
    min_h_gap = max(6.0, page_height * 0.020)                  # paragraph/section band

    # Horizontal cut candidate: widest empty horizontal band (split top/bottom).
    y_intervals = [(s.y0, s.y1) for s in spans]
    y_lo, y_hi = min(s.y0 for s in spans), max(s.y1 for s in spans)
    h_cut = _largest_gap(y_intervals, min_h_gap)

    # A vertical (column) cut and a borderless table look identical to a raw
    # whitespace projection — both have an empty vertical gutter. We disambiguate
    # by *how many text rows straddle the gutter*: a real page column has the
    # gutter empty across nearly every line, whereas a table's gutter has a cell
    # on each side of (almost) every row. If most rows have content on both sides
    # of the widest vertical gap, this region is a table body, not columns — so we
    # suppress the vertical cut and let the table detector handle it downstream.
    x_intervals = [(s.x0, s.x1) for s in spans]
    x_lo, x_hi = min(s.x0 for s in spans), max(s.x1 for s in spans)
    v_cut = _largest_gap(x_intervals, min_v_gap)
    if v_cut is not None:
        local_body = statistics.median([s.size for s in spans]) if spans else 11.0
        if _straddles_like_table(spans, v_cut, local_body):
            v_cut = None

    # Measure each candidate's actual band width to decide which cut is stronger.
    def band_width(cut: float | None, intervals, axis_lo, axis_hi) -> float:
        if cut is None:
            return 0.0
        # Width of the hole the cut sits in.
        below = max((b for a, b in intervals if b <= cut), default=axis_lo)
        above = min((a for a, b in intervals if a >= cut), default=axis_hi)
        return above - below

    h_w = band_width(h_cut, y_intervals, y_lo, y_hi)
    v_w = band_width(v_cut, x_intervals, x_lo, x_hi)

    # Prefer a horizontal cut when it is at least as prominent as the vertical one.
    # This ordering is what protects full-width titles/footers from being split.
    if h_cut is not None and (v_cut is None or h_w >= v_w):
        top = [s for s in spans if (s.y0 + s.y1) / 2 < h_cut]
        bottom = [s for s in spans if (s.y0 + s.y1) / 2 >= h_cut]
        if top and bottom:
            return (segment_regions(top, page_width, page_height, depth + 1)
                    + segment_regions(bottom, page_width, page_height, depth + 1))

    if v_cut is not None:
        left = [s for s in spans if (s.x0 + s.x1) / 2 < v_cut]
        right = [s for s in spans if (s.x0 + s.x1) / 2 >= v_cut]
        if left and right:
            return (segment_regions(left, page_width, page_height, depth + 1)
                    + segment_regions(right, page_width, page_height, depth + 1))

    return [spans]


# ──────────────────────────────────────────────────────────────────────────────
# Stage 4 — line & block reconstruction
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class Line:
    spans: list[Span]

    @property
    def text(self) -> str:
        return "".join(s.text for s in self.spans).strip()

    @property
    def y(self) -> float:
        return statistics.median(s.origin_y for s in self.spans)

    @property
    def x0(self) -> float:
        return min(s.x0 for s in self.spans)

    @property
    def size(self) -> float:
        # Char-weighted dominant size of the line.
        weight: dict[float, int] = {}
        for s in self.spans:
            weight[s.size] = weight.get(s.size, 0) + max(1, s.char_count)
        return max(weight, key=lambda k: weight[k])

    @property
    def bold(self) -> bool:
        chars = sum(max(1, s.char_count) for s in self.spans)
        bold_chars = sum(max(1, s.char_count) for s in self.spans if s.bold)
        return bold_chars >= 0.6 * chars


def group_lines(spans: list[Span]) -> list[Line]:
    """Cluster spans into text lines by shared baseline, ordered top→bottom."""
    if not spans:
        return []
    ordered = sorted(spans, key=lambda s: (round(s.origin_y, 1), s.x0))
    lines: list[list[Span]] = []
    for s in ordered:
        placed = False
        tol = max(1.5, s.size * _BASELINE_TOL_RATIO)
        for ln in lines:
            if abs(ln[0].origin_y - s.origin_y) <= tol:
                ln.append(s)
                placed = True
                break
        if not placed:
            lines.append([s])
    out = [Line(sorted(ln, key=lambda s: s.x0)) for ln in lines]
    out.sort(key=lambda ln: ln.y)
    return out


@dataclass
class Block:
    lines: list[Line]

    @property
    def text(self) -> str:
        return " ".join(ln.text for ln in self.lines)


def group_blocks(lines: list[Line]) -> list[Block]:
    """Group consecutive lines into blocks (paragraphs).

    Two lines stay in the same block only if they are both vertically close AND
    typographically similar. A new block starts when either:
      • the vertical gap exceeds the local line-height (paragraph break), or
      • the dominant font size changes appreciably (a title and the section
        heading beneath it are different sizes and must not merge).
    The gap threshold is relative to line-height so it adapts to dense body text
    and spaced-out headings alike rather than using one fixed pixel gap.
    """
    if not lines:
        return []
    blocks: list[list[Line]] = [[lines[0]]]
    for prev, cur in zip(lines, lines[1:]):
        line_height = max(prev.size, cur.size)
        gap = cur.y - prev.y
        size_changed = abs(cur.size - prev.size) > min(prev.size, cur.size) * 0.10
        if gap > line_height * (1.0 + _PARA_GAP_RATIO) or size_changed:
            blocks.append([cur])
        else:
            blocks[-1].append(cur)
    return [Block(b) for b in blocks]


def merge_wrapped_text(lines: list[Line]) -> str:
    """Join lines of a paragraph into flowing text, healing PDF line-wraps.

    A trailing hyphen that splits a word across lines is removed (de-hyphenation);
    otherwise lines are joined with a space. This repairs the classic
    "sentence broken mid-line by extraction" defect.
    """
    parts: list[str] = []
    for ln in lines:
        t = ln.text
        if parts and parts[-1].endswith("-") and not parts[-1].endswith(("--",)):
            # Soft hyphen: glue without space and drop the hyphen.
            parts[-1] = parts[-1][:-1] + t
        elif parts:
            parts[-1] = parts[-1] + " " + t
        else:
            parts.append(t)
        if not parts:
            parts.append(t)
    return parts[0] if parts else ""


# ──────────────────────────────────────────────────────────────────────────────
# Stage 4b — borderless table detection (whitespace-aligned grids)
# ──────────────────────────────────────────────────────────────────────────────

def _row_cells(line: Line, body_size: float) -> list[tuple[float, str]] | None:
    """Split a line into (x_start, text) cells at wide intra-line gaps.

    A cell boundary is a horizontal gap between consecutive spans that is clearly
    wider than a normal inter-word space (≈ a few × the font size). Returns the
    cell list if the line has ≥2 cells, else None. This is the per-row signal a
    borderless table is built from — rows of a table have multiple text clusters
    separated by alignment whitespace, body paragraphs do not.
    """
    spans = sorted(line.spans, key=lambda s: s.x0)
    if len(spans) < 2:
        return None
    gap_threshold = max(body_size * 1.6, 12.0)
    cells: list[tuple[float, str]] = []
    cur_x = spans[0].x0
    cur_text = spans[0].text
    prev_x1 = spans[0].x1
    for s in spans[1:]:
        if s.x0 - prev_x1 >= gap_threshold:
            cells.append((cur_x, cur_text.strip()))
            cur_x, cur_text = s.x0, s.text
        else:
            cur_text += s.text
        prev_x1 = s.x1
    cells.append((cur_x, cur_text.strip()))
    return cells if len(cells) >= 2 else None


def detect_borderless_table(block: Block, body_size: float) -> list[list[str]] | None:
    """Recognise a borderless table from column alignment across the block's lines.

    Builds each line's cell list (via wide-gap splitting), then checks the rows
    share a consistent set of column x-anchors: the i-th cell of every row starts
    at roughly the same x. A block qualifies as a table when ≥2 rows align to the
    same ≥2 column anchors. Returns the cell matrix (rows × columns) or None.

    Deterministic and conservative — it requires real geometric alignment, so
    ordinary wrapped paragraphs (whose lines all start at the left margin with no
    interior gaps) are never misread as tables.
    """
    rows = [_row_cells(ln, body_size) for ln in block.lines]
    aligned = [r for r in rows if r is not None]
    if len(aligned) < 2:
        return None

    # Collect every cell x-start, then cluster them into column anchors.
    xs = sorted(x for row in aligned for (x, _) in row)
    tol = max(body_size * 0.8, 6.0)
    anchors: list[float] = []
    for x in xs:
        if not anchors or x - anchors[-1] > tol:
            anchors.append(x)
        else:
            anchors[-1] = (anchors[-1] + x) / 2  # running centroid
    if len(anchors) < 2:
        return None

    def col_of(x: float) -> int:
        return min(range(len(anchors)), key=lambda i: abs(anchors[i] - x))

    # Require that most rows actually populate ≥2 distinct columns aligned to the
    # anchors — otherwise it's not a grid.
    matrix: list[list[str]] = []
    well_aligned = 0
    for row in aligned:
        cells = [""] * len(anchors)
        cols_used = set()
        for (x, text) in row:
            c = col_of(x)
            cells[c] = (cells[c] + " " + text).strip() if cells[c] else text
            cols_used.add(c)
        if len(cols_used) >= 2:
            well_aligned += 1
        matrix.append(cells)

    if well_aligned < 2 or well_aligned < len(aligned) * 0.6:
        return None
    return matrix


# ──────────────────────────────────────────────────────────────────────────────
# Stage 5 — block classification
# ──────────────────────────────────────────────────────────────────────────────

def _list_marker(text: str) -> str | None:
    """Return 'ul' / 'ol' if the line begins with a list marker, else None."""
    stripped = text.lstrip()
    if not stripped:
        return None
    if stripped[0] in _LIST_BULLETS and (len(stripped) == 1 or stripped[1] == " "):
        return "ul"
    # Ordered: "1." "1)" "a." "iv)" — keep it tight to avoid false positives.
    if _RE_ORDERED_MARKER.match(stripped):
        return "ol"
    return None


def classify_block(block: Block, fm: FontModel, body_left: float) -> dict:
    """Classify a block and return an emission descriptor.

    Heading: a short block whose dominant size maps to a heading tier, OR a short
    bold stand-alone line clearly above body size visually. Paragraphs and list
    items fall out from the marker test and font model.
    """
    first = block.lines[0]
    text = block.text.strip()

    # Heading by font tier.
    level = fm.size_to_level.get(round(first.size, 2), 0)
    if level and len(block.lines) <= 2 and len(text) < 200:
        return {"kind": "heading", "level": level, "text": " ".join(l.text for l in block.lines)}

    # Heading by stand-alone bold short line at body size (sub-headings that share
    # the body size but are visually emphasised).
    if (
        first.bold
        and len(block.lines) == 1
        and len(text) < 80
        and not text.endswith((".", ",", ";"))
    ):
        return {"kind": "heading", "level": min(6, len(fm.size_to_level) + 1 or 3), "text": text}

    # List: every line carries a marker. We keep each item's own ordered/unordered
    # flag so a block mixing "- " bullets and "1. " items renders each correctly
    # instead of forcing the whole block to the first item's type.
    marks = [_list_marker(ln.text) for ln in block.lines]
    if marks and all(m is not None for m in marks):
        items = [{"text": ln.text.strip(), "ordered": m == "ol"} for ln, m in zip(block.lines, marks)]
        return {"kind": "list", "items": items}

    # Borderless table: a multi-line block whose lines align into a column grid.
    # Checked after lists (so a marked list isn't mistaken for a table) and before
    # the paragraph fallback.
    if len(block.lines) >= 2:
        grid = detect_borderless_table(block, fm.body_size)
        if grid:
            return {"kind": "table", "rows": grid}

    return {"kind": "paragraph", "text": merge_wrapped_text(block.lines)}


# ──────────────────────────────────────────────────────────────────────────────
# Stage 6 — table detection
# ──────────────────────────────────────────────────────────────────────────────

def extract_tables(page) -> list[dict]:
    """Detect ruled tables via PyMuPDF's vector-graphics table finder.

    Returns each table as {bbox, rows} where rows is a list of cell-string lists.
    Borderless tables are out of scope here (kept deterministic + precise rather
    than guessing column boundaries from whitespace, which is error-prone).
    """
    tables: list[dict] = []
    try:
        found = page.find_tables()
    except Exception:
        return tables
    for t in getattr(found, "tables", []):
        try:
            rows = t.extract()
        except Exception:
            continue
        if not rows or not any(any(c for c in r) for r in rows):
            continue
        tables.append({"bbox": tuple(t.bbox), "rows": rows})
    return tables


def table_to_markdown(rows: list[list]) -> str:
    """Render a table's cell matrix as GitHub-flavoured Markdown."""
    norm = [[(c or "").replace("\n", " ").strip() for c in r] for r in rows]
    width = max(len(r) for r in norm)
    norm = [r + [""] * (width - len(r)) for r in norm]
    header = norm[0]
    sep = ["---"] * width
    body = norm[1:] if len(norm) > 1 else []
    lines = ["| " + " | ".join(header) + " |", "| " + " | ".join(sep) + " |"]
    for r in body:
        lines.append("| " + " | ".join(r) + " |")
    return "\n".join(lines)


# ──────────────────────────────────────────────────────────────────────────────
# Orchestration
# ──────────────────────────────────────────────────────────────────────────────

def _spans_outside_tables(spans: list[Span], table_bboxes: list[tuple]) -> list[Span]:
    """Drop spans that fall inside a detected table region (avoid double output)."""
    if not table_bboxes:
        return spans
    def inside(s: Span) -> bool:
        cx, cy = (s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2
        for (x0, y0, x1, y1) in table_bboxes:
            if x0 <= cx <= x1 and y0 <= cy <= y1:
                return True
        return False
    return [s for s in spans if not inside(s)]


def extract_structure(data: bytes) -> dict:
    """Full pipeline: PDF bytes → {md, plain} with accurate structure.

    Reading order is corrected per page via column segmentation; tables are
    interleaved with text by their vertical position on the page.
    """
    import fitz

    doc = fitz.open(stream=data, filetype="pdf")
    try:
        # First pass over the whole document to build a stable, global font model
        # (so heading sizes are consistent across pages). The model is fed EVERY
        # span — including text inside tables — because table cells are body-sized
        # and excluding them can starve the model on table-heavy pages, making it
        # mistake a lone title for body text.
        model_spans: list[Span] = []
        per_page: list[tuple[list[Span], list[dict]]] = []
        for page in doc:
            tables = extract_tables(page)
            spans = harvest_spans(page)
            model_spans.extend(spans)
            text_spans = _spans_outside_tables(spans, [t["bbox"] for t in tables])
            per_page.append((text_spans, tables))

        fm = build_font_model(model_spans)

        md_parts: list[str] = []
        plain_parts: list[str] = []

        for page_idx, (text_spans, tables) in enumerate(per_page):
            page = doc[page_idx]
            body_left = _estimate_body_left(text_spans, fm)
            regions = segment_regions(text_spans, page.rect.width, page.rect.height)

            # Emission items carry a sort key of (region_index, y). Sorting by this
            # key — NOT by y alone — is what preserves the XY-cut reading order:
            # within a region we order top→bottom, but regions stay in the order the
            # recursive cut produced (title, then left column, then right column).
            # A naive global y-sort would re-interleave the columns and undo the cut.
            items: list[tuple[tuple[int, float], str, str]] = []

            region_bounds: list[tuple[float, float, float, float]] = []  # per region bbox
            for ri, region in enumerate(regions):
                if region:
                    region_bounds.append((
                        min(s.x0 for s in region), min(s.y0 for s in region),
                        max(s.x1 for s in region), max(s.y1 for s in region),
                    ))
                else:
                    region_bounds.append((0, 0, 0, 0))
                lines = group_lines(region)
                blocks = group_blocks(lines)
                for blk in blocks:
                    desc = classify_block(blk, fm, body_left)
                    md, plain = _emit(desc)
                    if md:
                        items.append(((ri, blk.lines[0].y), md, plain))

            # Assign each table to the region whose bbox contains its centre, so it
            # interleaves at the right place in that column rather than globally.
            for tbl in tables:
                tx = (tbl["bbox"][0] + tbl["bbox"][2]) / 2
                ty = (tbl["bbox"][1] + tbl["bbox"][3]) / 2
                ri = _region_for_point(region_bounds, tx, ty)
                md = table_to_markdown(tbl["rows"])
                plain = "\n".join("\t".join((c or "").strip() for c in r) for r in tbl["rows"])
                items.append(((ri, tbl["bbox"][1]), md, plain))

            items.sort(key=lambda it: it[0])
            for _, md, plain in items:
                md_parts.append(md)
                plain_parts.append(plain)

        md_text = _tidy("\n\n".join(p for p in md_parts if p))
        plain_text = "\n\n".join(p for p in plain_parts if p).strip()
        return {"md": md_text, "plain": plain_text}
    finally:
        doc.close()


def _region_for_point(bounds: list[tuple[float, float, float, float]], x: float, y: float) -> int:
    """Index of the region whose bbox contains (x, y); nearest by centre if none."""
    for i, (x0, y0, x1, y1) in enumerate(bounds):
        if x0 <= x <= x1 and y0 <= y <= y1:
            return i
    # Fall back to the region whose centre is closest (table sitting in a gutter).
    best, best_d = 0, float("inf")
    for i, (x0, y0, x1, y1) in enumerate(bounds):
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        d = (cx - x) ** 2 + (cy - y) ** 2
        if d < best_d:
            best, best_d = i, d
    return best


def _estimate_body_left(spans: list[Span], fm: FontModel) -> float:
    """The dominant left margin of body-sized text (baseline for indent tests)."""
    xs = [s.x0 for s in spans if abs(s.size - fm.body_size) < 0.5]
    if not xs:
        xs = [s.x0 for s in spans] or [0.0]
    try:
        return statistics.median(xs)
    except statistics.StatisticsError:
        return min(xs) if xs else 0.0


def _emit(desc: dict) -> tuple[str, str]:
    """Render a classified block descriptor to (markdown, plain)."""
    kind = desc["kind"]
    if kind == "heading":
        hashes = "#" * max(1, min(6, desc["level"]))
        text = desc["text"].strip()
        return f"{hashes} {text}", text
    if kind == "list":
        out_md: list[str] = []
        out_plain: list[str] = []
        ordinal = 0  # restarts whenever the run switches away from ordered
        for item in desc["items"]:
            body = _strip_list_marker(item["text"])
            if item["ordered"]:
                ordinal += 1
                out_md.append(f"{ordinal}. {body}")
            else:
                ordinal = 0
                out_md.append(f"- {body}")
            out_plain.append(body)
        return "\n".join(out_md), "\n".join(out_plain)
    if kind == "table":
        md = table_to_markdown(desc["rows"])
        plain = "\n".join("\t".join((c or "").strip() for c in r) for r in desc["rows"])
        return md, plain
    if kind == "paragraph":
        text = desc["text"].strip()
        return text, text
    return "", ""


def _strip_list_marker(text: str) -> str:
    s = text.lstrip()
    if s and s[0] in _LIST_BULLETS:
        return s[1:].strip()
    return _RE_ORDERED_STRIP.sub("", s).strip()


def _tidy(md: str) -> str:
    """Collapse runaway blank lines, trim trailing whitespace per line."""
    md = _RE_TRAILING_WS.sub("\n", md)
    md = _RE_BLANK_RUN.sub("\n\n", md)
    return md.strip()
