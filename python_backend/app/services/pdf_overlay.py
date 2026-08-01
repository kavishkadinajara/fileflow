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


def _decode_color(c) -> tuple:
    """Span colour → (r, g, b) in 0..1, robust to PyMuPDF's colour encodings.

    `color` is normally a packed sRGB int, but a span can also carry a tuple
    (already-normalised components) for non-RGB colourspaces. We handle:
      • int            → unpack as 0xRRGGBB
      • 3-tuple        → treat as RGB (clamp to 0..1)
      • 1-tuple/float  → treat as grayscale
      • 4-tuple        → treat as CMYK → RGB
    Falls back to black on anything unexpected, so an edit is never invisible.
    """
    try:
        if isinstance(c, (int,)):
            r = ((c >> 16) & 255) / 255.0
            g = ((c >> 8) & 255) / 255.0
            b = (c & 255) / 255.0
            return (r, g, b)
        if isinstance(c, float):
            return (c, c, c)
        if isinstance(c, (tuple, list)):
            if len(c) == 3:
                return tuple(max(0.0, min(1.0, float(v))) for v in c)  # type: ignore[return-value]
            if len(c) == 1:
                v = max(0.0, min(1.0, float(c[0])))
                return (v, v, v)
            if len(c) == 4:  # CMYK → RGB
                cc, m, y, k = (max(0.0, min(1.0, float(v))) for v in c)
                return ((1 - cc) * (1 - k), (1 - m) * (1 - k), (1 - y) * (1 - k))
    except (TypeError, ValueError):
        pass
    return (0.0, 0.0, 0.0)


def _apply_redactions_keep_graphics(page) -> None:
    """Apply the page's redactions while preserving images and vector graphics.

    PyMuPDF's redaction, by default, also deletes any image or drawing overlapping
    a redaction box. On a form that would erase logos, photos, table rules and the
    dotted fill-in lines — changing the layout. We pass the *keep* flags so only the
    covered text glyphs are removed; everything drawn stays put. Older PyMuPDF
    builds without these kwargs fall back to a plain call.
    """
    import fitz

    img_keep = getattr(fitz, "PDF_REDACT_IMAGE_NONE", None)
    art_keep = getattr(fitz, "PDF_REDACT_LINE_ART_NONE", None)
    try:
        if img_keep is not None and art_keep is not None:
            page.apply_redactions(images=img_keep, graphics=art_keep)
        else:
            page.apply_redactions()
    except TypeError:
        # Signature without images/graphics kwargs.
        page.apply_redactions()


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


def _span_style(s: dict) -> SpanStyle:
    """Build an insertable SpanStyle from a PyMuPDF span dict."""
    x0, y0, x1, y1 = s["bbox"]
    origin = s.get("origin", (x0, y1))
    return SpanStyle(
        font=_pick_base_font(s),
        size=float(s.get("size", (y1 - y0) * 0.8)),
        color=_decode_color(int(s.get("color", 0))),
        origin_y=float(origin[1]),
    )


def _style_at(page, rect) -> SpanStyle | None:
    """Return the insertable style for the text at `rect`.

    Two-stage match so edits inherit the *exact* original style even when the
    match rect lands in awkward places:

    1. **Centre hit** — the span whose bbox contains the rect's centre. This is the
       common, precise case (replacing a word that sits squarely on one span).
    2. **Baseline fallback** — if no span contains the centre (e.g. the rect spans a
       gap, or the edit was typed into blank space on a form line), pick the span on
       the SAME text line — the one sharing the rect's vertical band and closest
       horizontally. This is what makes a second address line, or a value typed onto
       a dotted rule, inherit the size/font/colour of its row instead of defaulting
       to a guessed size.

    Returns None only if the page has no text spans near the rect at all.
    """
    cx = (rect.x0 + rect.x1) / 2
    cy = (rect.y0 + rect.y1) / 2

    candidates: list[tuple[float, dict]] = []  # (horizontal distance, span)
    for blk in page.get_text("dict").get("blocks", []):
        if blk.get("type") != 0:
            continue
        for line in blk.get("lines", []):
            for s in line.get("spans", []):
                if not s.get("text", "").strip():
                    continue
                x0, y0, x1, y1 = s["bbox"]
                # 1) Exact centre hit wins immediately.
                if x0 <= cx <= x1 and y0 <= cy <= y1:
                    return _span_style(s)
                # 2) Collect same-line spans (vertical bands overlap) for fallback.
                if y0 <= cy <= y1 or (cy - (y1 - y0) * 0.5 <= (y0 + y1) / 2 <= cy + (y1 - y0) * 0.5):
                    # Horizontal distance from the rect to this span (0 if overlapping).
                    dist = 0.0 if x0 <= cx <= x1 else min(abs(cx - x0), abs(cx - x1))
                    candidates.append((dist, s))

    if candidates:
        candidates.sort(key=lambda c: c[0])
        return _span_style(candidates[0][1])
    return None


def _available_width(page, rect, redacted: list) -> float:
    """Horizontal space the replacement may occupy before hitting an obstacle.

    The match rect is only as wide as the ORIGINAL word, but the original text
    usually had free space to its right (the rest of a form line, a dotted rule, or
    page margin). The replacement is entitled to that space, so shrinking it to the
    old word's width — the previous bug — needlessly miniaturised longer edits.

    We measure from the match's left edge to the nearest of:
      • the left edge of the next *kept* text span on the same line (so we never
        overrun neighbouring real text), excluding spans being redacted away, and
      • the page's right content margin (a small inset from the page edge).

    The match's own width is the floor, so a replacement never gets *less* room than
    the text it replaces.
    """
    cy = (rect.y0 + rect.y1) / 2
    band = max(2.0, (rect.y1 - rect.y0) * 0.6)
    right_limit = page.rect.width - 4.0  # small inset from the physical edge

    for blk in page.get_text("dict").get("blocks", []):
        if blk.get("type") != 0:
            continue
        for line in blk.get("lines", []):
            for s in line.get("spans", []):
                if not s.get("text", "").strip():
                    continue
                x0, y0, x1, y1 = s["bbox"]
                # Same visual line as the match?
                if abs((y0 + y1) / 2 - cy) > band:
                    continue
                # Only spans strictly to the right of the match constrain us.
                if x0 <= rect.x1:
                    continue
                # Ignore spans that will be redacted (they're disappearing too).
                if any(_rects_overlap(x0, y0, x1, y1, rr) for rr in redacted):
                    continue
                right_limit = min(right_limit, x0 - 1.0)

    return max(rect.x1 - rect.x0, right_limit - rect.x0)


def _rects_overlap(x0: float, y0: float, x1: float, y1: float, rect) -> bool:
    """True if the (x0,y0,x1,y1) span box overlaps a fitz.Rect being redacted."""
    return not (x1 < rect.x0 or x0 > rect.x1 or y1 < rect.y0 or y0 > rect.y1)


def _fit_font_size(text: str, fontname: str, target_size: float, max_width: float) -> float:
    """Largest size ≤ target at which `text` fits `max_width`; never below 4pt.

    Keeps the original size whenever the text fits the available space (the common
    case now that width is measured properly) and only shrinks when a genuinely
    longer edit would overrun a real neighbour. Uses the base-14 font's own glyph
    metrics for an exact width.
    """
    import fitz

    if not text or max_width <= 0:
        return target_size
    font = fitz.Font(fontname)
    if font.text_length(text, fontsize=target_size) <= max_width:
        return target_size  # fits at full size — no shrink (the normal path)
    size = target_size
    while size > 4.0:
        if font.text_length(text, fontsize=size) <= max_width:
            return size
        size -= 0.25
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
            redacted: list = []      # rects marked for redaction on this page

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
                    redacted.append(rect)
                    if r.replace and style is not None:
                        draws.append((rect, r.replace, style))

            if not draws and not redacted:
                continue

            # Measure each replacement's true available width BEFORE redacting, so
            # the page-text scan still sees the neighbouring spans that bound it.
            # The width budget runs from the match's left edge to the next *kept*
            # span on the same line (or the page margin) — not the old word's width.
            sized: list[tuple] = []  # (point, text, size, style)
            for rect, text, style in draws:
                avail = _available_width(page, rect, redacted)
                size = _fit_font_size(text, style.font, style.size, avail)
                sized.append((fitz.Point(rect.x0, style.origin_y), text, size, style))

            # Preserve images and vector/line art when removing the old glyphs.
            # Without these flags PyMuPDF strips any image or drawing that touches a
            # redaction box — which on a form would erase logos, photos, table rules,
            # and the dotted fill-in lines, visibly changing the layout. We only want
            # the text gone, so keep graphics untouched.
            _apply_redactions_keep_graphics(page)

            for point, text, size, style in sized:
                page.insert_text(
                    point,
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


# ──────────────────────────────────────────────────────────────────────────────
# Adding brand-new text boxes (click-anywhere fill-in)
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class TextBox:
    """A new text box to stamp onto the PDF at absolute page coordinates.

    Coordinates are in PDF points, top-left origin (same space as extract_layout
    blocks and the page image the UI shows), so the front end sends exactly where
    the user dropped/typed and it lands there.
    """
    page: int
    x: float            # left, points
    y: float            # top, points
    w: float            # box width, points (text wraps within this)
    h: float            # box height, points
    text: str
    size: float = 11.0
    color: tuple = (0.0, 0.0, 0.0)
    font: str = "helv"  # base-14 fontname
    align: int = 0      # 0=left, 1=centre, 2=right (PyMuPDF TEXT_ALIGN_*)


def _fit_box_size(page, rect, text: str, fontname: str, color: tuple, align: int, start_size: float) -> float:
    """Largest size ≤ start at which insert_textbox reports the text fits the rect.

    PyMuPDF's textbox layout (its own line-height, ascender/descender padding and
    wrapping) is hard to predict by hand, so we measure it directly: dry-run
    insert_textbox on a SCRATCH copy of the page — which returns the leftover
    vertical space, negative when it overflows — and shrink until it's ≥ 0. This is
    exact, so the real draw never silently drops the text. Floor 5pt.
    """
    import fitz

    if not text.strip():
        return start_size
    size = start_size
    while size >= 5.0:
        scratch = fitz.open()
        sp = scratch.new_page(width=page.rect.width, height=page.rect.height)
        leftover = sp.insert_textbox(rect, text, fontsize=size, fontname=fontname,
                                     color=color, align=align)
        scratch.close()
        if leftover >= 0:
            return size
        size -= 0.5
    return 5.0


def stamp_text_boxes(data: bytes, boxes: list[TextBox]) -> bytes:
    """Draw new text boxes onto the PDF at absolute coordinates.

    For fields the user *added* (clicking an empty area — a dotted form line, a
    blank cell) rather than editing existing text. Each box is auto-fit (measured
    against PyMuPDF's real textbox layout) so the text wraps and shrinks to stay
    inside, then drawn with insert_textbox so multi-line content lays out cleanly.
    If even 5pt can't fit the given height, the box is grown downward just enough to
    hold the text rather than dropping it. Nothing existing is touched.
    """
    import fitz

    doc = fitz.open(stream=data, filetype="pdf")
    try:
        for box in boxes:
            if box.page < 0 or box.page >= doc.page_count:
                continue
            if not box.text.strip():
                continue
            page = doc[box.page]
            rect = fitz.Rect(box.x, box.y, box.x + box.w, box.y + box.h)
            size = _fit_box_size(page, rect, box.text, box.font, box.color, box.align, box.size)

            # Final draw. If it still reports overflow at the floor size, grow the
            # rect downward (bounded by the page) until the text fits, so a user's
            # added text is never silently lost.
            leftover = page.insert_textbox(rect, box.text, fontsize=size,
                                           fontname=box.font, color=box.color, align=box.align)
            if leftover < 0:
                grow = rect.height
                while leftover < 0 and rect.y1 < page.rect.height - 2:
                    grow += max(size, 8.0)
                    rect = fitz.Rect(rect.x0, rect.y0, rect.x1, min(box.y + grow, page.rect.height - 2))
                    leftover = page.insert_textbox(rect, box.text, fontsize=size,
                                                   fontname=box.font, color=box.color, align=box.align)
        return doc.tobytes(deflate=True, garbage=3)
    finally:
        doc.close()


def apply_edits(data: bytes, replacements: list[Replacement], boxes: list[TextBox]) -> bytes:
    """Apply both edit kinds in one pass: font-matched replacements + new boxes.

    Replacements (existing-text edits) run first so their redactions are measured
    against the untouched page; added boxes are then stamped on top. Returns the
    final PDF bytes. Either list may be empty.
    """
    out = data
    if replacements:
        out = apply_replacements(out, replacements)
    if boxes:
        out = stamp_text_boxes(out, boxes)
    return out
