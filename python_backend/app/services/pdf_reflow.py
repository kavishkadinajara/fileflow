"""
Smart Reflow — layout-preserving editable PDF reconstruction.

This is the middle ground between the two existing rebuild modes:
  - Patch keeps the layout perfectly but only does find/replace edits.
  - Rebuild lets you edit anything but re-flows the page from scratch (layout lost).
Smart Reflow lets you edit any block of text while keeping it at the *exact*
position, font, size, and colour it had in the original — so the rebuilt PDF is
visually near-identical to the source, yet fully editable.

How it works
------------
1. extract_layout  — for every page, capture its size (points) and every text
   line as a positioned block: text + absolute (x, y, w, h) + style (font→base-14,
   size, colour, weight, slant). Reuses the structure engine's span harvest and
   baseline line-grouping, so blocks match what the reader sees.
2. (the user edits block .text values in the browser)
3. render_layout_html — emit one absolutely-positioned <div> per block at its
   original point coordinates inside an @page-sized canvas. Because PDF bbox y and
   CSS `top` both grow downward and PDF user-space units are points (= CSS pt),
   the mapping is 1:1 — no coordinate gymnastics.
4. The HTML is printed to PDF by the existing Puppeteer pipeline (styled mode).

Deterministic; no AI. Reuses pdf_structure (harvest/group) and pdf_overlay's
font model.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict

from app.services.pdf_overlay import _decode_color, _pick_base_font
from app.services.pdf_structure import group_lines, harvest_spans

# CSS font-family for each base-14 font the style mapper can return.
_FONT_CSS = {
    "helv": "Helvetica, Arial, sans-serif", "hebo": "Helvetica, Arial, sans-serif",
    "heit": "Helvetica, Arial, sans-serif", "hebi": "Helvetica, Arial, sans-serif",
    "tiro": "'Times New Roman', Times, serif", "tibo": "'Times New Roman', Times, serif",
    "tiit": "'Times New Roman', Times, serif", "tibi": "'Times New Roman', Times, serif",
    "cour": "'Courier New', monospace", "cobo": "'Courier New', monospace",
    "coit": "'Courier New', monospace", "cobi": "'Courier New', monospace",
}


@dataclass
class Block:
    """A positioned, editable text block (one source line)."""
    id: str
    text: str
    x: float          # left, in points
    y: float          # top, in points
    w: float          # width, in points
    h: float          # height, in points
    size: float       # font size, points
    font: str         # CSS font-family
    color: str        # CSS colour (#rrggbb)
    bold: bool
    italic: bool


@dataclass
class PageLayout:
    width: float      # points
    height: float     # points
    blocks: list[Block]


def _rgb_to_hex(rgb: tuple) -> str:
    r, g, b = (max(0, min(255, round(c * 255))) for c in rgb)
    return f"#{r:02x}{g:02x}{b:02x}"


def extract_layout(data: bytes) -> list[dict]:
    """Extract every page as a positioned, editable layout (list of dicts)."""
    import fitz

    doc = fitz.open(stream=data, filetype="pdf")
    try:
        pages: list[dict] = []
        for pi, page in enumerate(doc):
            spans = harvest_spans(page)
            blocks: list[Block] = []
            for li, line in enumerate(group_lines(spans)):
                if not line.text:
                    continue
                # Line geometry from its spans.
                x0 = min(s.x0 for s in line.spans)
                y0 = min(s.y0 for s in line.spans)
                x1 = max(s.x1 for s in line.spans)
                y1 = max(s.y1 for s in line.spans)
                # Dominant span (most chars) drives the style.
                dom = max(line.spans, key=lambda s: max(1, s.char_count))
                base_font = _pick_base_font({"flags": dom.flags, "font": dom.font})
                blocks.append(
                    Block(
                        id=f"p{pi}l{li}",
                        text=line.text,
                        x=round(x0, 2), y=round(y0, 2),
                        w=round(x1 - x0, 2), h=round(y1 - y0, 2),
                        size=round(dom.size, 2),
                        font=_FONT_CSS.get(base_font, "Helvetica, Arial, sans-serif"),
                        color=_rgb_to_hex(_decode_color(dom.color)),
                        bold=dom.bold,
                        italic=dom.italic,
                    )
                )
            pages.append({
                "width": round(page.rect.width, 2),
                "height": round(page.rect.height, 2),
                "blocks": [asdict(b) for b in blocks],
            })
        return pages
    finally:
        doc.close()


def render_visual_pages(data: bytes, dpi: int = 144) -> list[dict]:
    """Render every page as a background image plus its editable text blocks.

    This powers the WYSIWYG fill-in surface: the UI paints each page exactly as it
    looks (logo, colour bands, dotted form lines — everything), then overlays a
    transparent, editable field on top of each text block at its real position. The
    user sees the actual form and types straight into it.

    For every page we return:
      - width / height — page size in **points** (the coordinate space the blocks
        live in), so the front end can position fields against the image precisely.
      - image_w / image_h — the rendered PNG's pixel size, so the field layer can be
        scaled to whatever width the page image is displayed at.
      - image — a base64 PNG (data-URI body, no prefix) of the page.
      - blocks — the same positioned, editable blocks as extract_layout.

    The render DPI trades sharpness for payload size; 144 (2× the 72-pt base) keeps
    text crisp on screen without bloating the JSON.
    """
    import fitz

    doc = fitz.open(stream=data, filetype="pdf")
    try:
        # Reuse the layout pass for blocks so positions match the patch/diff path
        # exactly — the editor and the download patcher agree on every line.
        layouts = extract_layout(data)
        zoom = dpi / 72.0
        matrix = fitz.Matrix(zoom, zoom)
        pages: list[dict] = []
        for pi, page in enumerate(doc):
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            import base64

            png_b64 = base64.b64encode(pix.tobytes("png")).decode("ascii")
            layout = layouts[pi] if pi < len(layouts) else {"width": page.rect.width,
                                                             "height": page.rect.height, "blocks": []}
            pages.append({
                "width": layout["width"],
                "height": layout["height"],
                "image_w": pix.width,
                "image_h": pix.height,
                "image": png_b64,
                "blocks": layout["blocks"],
            })
        return pages
    finally:
        doc.close()


def _esc(s: str) -> str:
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def render_layout_html(pages: list[dict]) -> str:
    """Render positioned pages to absolute-layout HTML for Puppeteer printing.

    Each page becomes an @page-sized canvas; each block is an absolutely-positioned
    div at its original point coordinates. Editing only changed the `text` of
    blocks — every position/style is carried straight through, so the printed PDF
    matches the original layout.
    """
    page_css: list[str] = []
    body: list[str] = []

    for i, page in enumerate(pages):
        w, h = page["width"], page["height"]
        page_css.append(
            f"@page page{i} {{ size: {w}pt {h}pt; margin: 0; }}"
        )
        block_html: list[str] = []
        for b in page["blocks"]:
            weight = "700" if b.get("bold") else "400"
            style_attr = "italic" if b.get("italic") else "normal"
            block_html.append(
                f'<div class="blk" style="'
                f"left:{b['x']}pt; top:{b['y']}pt; "
                f"font-size:{b['size']}pt; "
                f"font-family:{b['font']}; "
                f"color:{b['color']}; "
                f"font-weight:{weight}; font-style:{style_attr};"
                f'">{_esc(b["text"])}</div>'
            )
        body.append(
            f'<section class="page" style="width:{w}pt; height:{h}pt; '
            f'page: page{i};">{"".join(block_html)}</section>'
        )

    return f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  {' '.join(page_css)}
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; padding: 0; }}
  .page {{ position: relative; overflow: hidden; page-break-after: always; }}
  .page:last-child {{ page-break-after: auto; }}
  .blk {{
    position: absolute;
    margin: 0;
    line-height: 1;
    white-space: pre;
  }}
</style>
</head><body>
{''.join(body)}
</body></html>"""
