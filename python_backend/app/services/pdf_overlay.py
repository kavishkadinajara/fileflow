"""
Font-matching PDF overlay editing (PyMuPDF / fitz).

The previous overlay redrew every replacement in black Helvetica at a guessed
size — so edited text stood out from the original. This engine instead reads the
*style of the exact span being replaced* (font family, weight, slant, size, and
colour) and redraws the new text in a matching style, so the edit blends in and
the rest of the page stays pixel-identical.

Capabilities
------------
- **Style matching** — serif/sans/mono + bold + italic mapped to the right
  base-14 font; original font size and RGB colour reused.
- **Targeted replacement** — replace the first match, the n-th match, or all
  matches; optional case-insensitive matching. Fixes the "replacing 'the'
  rewrites the whole page" problem.
- **Overflow handling** — if the replacement is wider than the original span,
  the font is shrunk to fit the available width instead of spilling over
  neighbouring text.

Everything operates on an in-memory copy; the caller's file is never mutated.
"""

from __future__ import annotations

from dataclasses import dataclass

# PyMuPDF span flag bits.
_FLAG_ITALIC = 1 << 1
_FLAG_SERIF = 1 << 2
_FLAG_MONOSPACE = 1 << 3
_FLAG_BOLD = 1 << 4

# Base-14 font matrix: (serif, mono) → [regular, bold, italic, bold-italic].
# These insert without an embedded font file, so they always render.
_FONT_MATRIX = {
    ("sans", False): ["helv", "hebo", "heit", "hebi"],
    ("serif", False): ["tiro", "tibo", "tiit", "tibi"],
    ("mono", True): ["cour", "cobo", "coit", "cobi"],
}


@dataclass
class SpanStyle:
    font: str          # base-14 fontname to insert with
    size: float
    color: tuple       # (r, g, b) in 0..1
    origin_y: float    # baseline of the original span


def _decode_color(c: int) -> tuple:
    """PyMuPDF stores span colour as a packed sRGB int → (r, g, b) in 0..1."""
    r = ((c >> 16) & 255) / 255.0
    g = ((c >> 8) & 255) / 255.0
    b = (c & 255) / 255.0
    return (r, g, b)


def _pick_base_font(span: dict) -> str:
    """Map a span's family/weight/slant to the closest insertable base-14 font."""
    flags = int(span.get("flags", 0))
    name = str(span.get("font", "")).lower()

    bold = bool(flags & _FLAG_BOLD) or "bold" in name or "black" in name or "heavy" in name
    italic = bool(flags & _FLAG_ITALIC) or "italic" in name or "oblique" in name
    mono = bool(flags & _FLAG_MONOSPACE) or "mono" in name or "courier" in name or "consol" in name
    serif = bool(flags & _FLAG_SERIF) or any(k in name for k in ("times", "georgia", "serif", "garamond", "minion"))

    if mono:
        family = "mono"
    elif serif:
        family = "serif"
    else:
        family = "sans"

    key = (family, family == "mono")
    variants = _FONT_MATRIX.get(key, _FONT_MATRIX[("sans", False)])
    idx = (2 if italic else 0) + (1 if bold else 0)
    return variants[idx]


def _style_at(page, rect) -> SpanStyle | None:
    """Find the source span whose bbox contains the match rect's centre, and
    return its insertable style. Returns None if no span matches (rare)."""
    import fitz

    cx = (rect.x0 + rect.x1) / 2
    cy = (rect.y0 + rect.y1) / 2
    for blk in page.get_text("dict").get("blocks", []):
        for line in blk.get("lines", []):
            for s in line.get("spans", []):
                x0, y0, x1, y1 = s["bbox"]
                if x0 <= cx <= x1 and y0 <= cy <= y1:
                    origin = s.get("origin", (x0, y1))
                    return SpanStyle(
                        font=_pick_base_font(s),
                        size=float(s.get("size", rect.height * 0.8)),
                        color=_decode_color(int(s.get("color", 0))),
                        origin_y=float(origin[1]),
                    )
    return None


def _fit_font_size(text: str, fontname: str, target_size: float, max_width: float) -> float:
    """Shrink the font size until `text` fits within `max_width`, never below 4pt.

    Uses the base-14 font's own glyph metrics for an exact width, so the edit
    never overruns the space the original occupied.
    """
    import fitz

    if not text or max_width <= 0:
        return target_size
    font = fitz.Font(fontname)
    size = target_size
    while size > 4.0:
        if font.text_length(text, fontsize=size) <= max_width:
            return size
        size -= 0.5
    return 4.0


@dataclass
class Replacement:
    find: str
    replace: str
    # "all" | "first" | int (1-based n-th occurrence)
    occurrence: object = "all"
    match_case: bool = True


def _iter_matches(page, find: str, match_case: bool):
    """Yield match rects for `find` on a page, honouring case sensitivity."""
    import fitz

    flags = 0
    if not match_case:
        # TEXT_IGNORECASE keeps search case-insensitive at the MuPDF level.
        flags = getattr(fitz, "TEXT_IGNORECASE", 0)
    try:
        return page.search_for(find, flags=flags) if flags else page.search_for(find)
    except TypeError:
        # Older PyMuPDF without the flags kwarg.
        return page.search_for(find)


def apply_replacements(data: bytes, replacements: list[Replacement]) -> bytes:
    """Run all replacements across the document, matching original text style.

    Two-phase per page: (1) collect match rects + their source style and mark
    redactions, respecting each replacement's occurrence selector; (2) apply
    redactions once, then redraw the replacements in matching style.
    """
    import fitz

    doc = fitz.open(stream=data, filetype="pdf")
    try:
        # Occurrence counters are document-wide so "3rd occurrence" spans pages.
        counters = {id(r): 0 for r in replacements}

        for page in doc:
            draws: list[tuple] = []  # (rect, text, SpanStyle)

            for r in replacements:
                if not r.find:
                    continue
                rects = _iter_matches(page, r.find, r.match_case)
                for rect in rects:
                    counters[id(r)] += 1
                    n = counters[id(r)]
                    if not _selected(r.occurrence, n):
                        continue
                    style = _style_at(page, rect)
                    page.add_redact_annot(rect, fill=(1, 1, 1))
                    if r.replace and style is not None:
                        draws.append((rect, r.replace, style))

            if not draws and not any(page.search_for(r.find) for r in replacements if r.find):
                continue

            page.apply_redactions()

            for rect, text, style in draws:
                width = rect.x1 - rect.x0
                size = _fit_font_size(text, style.font, style.size, width)
                page.insert_text(
                    fitz.Point(rect.x0, style.origin_y),
                    text,
                    fontsize=size,
                    fontname=style.font,
                    color=style.color,
                )

        out = doc.tobytes(deflate=True, garbage=3)
        return out
    finally:
        doc.close()


def _selected(occurrence: object, n: int) -> bool:
    """Decide whether the n-th (1-based) match is selected for replacement."""
    if occurrence == "all":
        return True
    if occurrence == "first":
        return n == 1
    if isinstance(occurrence, int):
        return n == occurrence
    return True
