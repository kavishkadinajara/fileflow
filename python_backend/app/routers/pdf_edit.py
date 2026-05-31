"""
True PDF editing endpoints (PyMuPDF / fitz).

Unlike pdf_extract (which throws away layout), these edit the *original* PDF
in place and return a new PDF that preserves fonts, images, and positioning.

POST /api/pdf-overlay   — find/replace text spans in the original PDF.
POST /api/pdf-decorate  — stamp header / footer / page numbers onto every page.

Both return application/pdf bytes. The caller's original file is never mutated;
PyMuPDF works on an in-memory copy.
"""

from __future__ import annotations

import io
import json

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

router = APIRouter(prefix="/api", tags=["PDF Edit"])


def _open_doc(data: bytes):
    """Open a PDF from bytes, raising a clean 422 on failure."""
    import fitz  # PyMuPDF

    try:
        return fitz.open(stream=data, filetype="pdf")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=422, detail=f"Could not open PDF: {exc}") from exc


@router.post("/pdf-overlay")
async def pdf_overlay(
    file: UploadFile = File(..., description="Original PDF"),
    replacements: str = Form(..., description='JSON array: [{"find": "...", "replace": "..."}]'),
) -> Response:
    """Find/replace text on every page while preserving layout via redaction.

    For each match we redact (erase) the original span and draw the replacement
    text in its place using the span's own font size — keeping images and the
    rest of the page pixel-identical.
    """
    import fitz

    data = await file.read()
    if not data:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")

    try:
        pairs = json.loads(replacements)
        assert isinstance(pairs, list)
    except (json.JSONDecodeError, AssertionError) as exc:
        raise HTTPException(status_code=422, detail="`replacements` must be a JSON array.") from exc

    doc = _open_doc(data)

    for page in doc:
        # Capture match rectangles BEFORE redacting — once text is erased,
        # search_for can no longer find it. Each entry: (rect, replacement).
        draws: list[tuple] = []
        for pair in pairs:
            find = str(pair.get("find", ""))
            replace = str(pair.get("replace", ""))
            if not find:
                continue
            for rect in page.search_for(find):
                page.add_redact_annot(rect, fill=(1, 1, 1))
                if replace:
                    draws.append((rect, replace))

        # Erase all matched spans in one pass.
        page.apply_redactions()

        # Draw the replacement text where the originals were. We anchor at the
        # baseline (bottom-left of the original span) with insert_text rather
        # than insert_textbox — a textbox clips/silently drops text when the
        # original rect is too tight for the font, whereas insert_text always
        # renders. Font size is derived from the original line height.
        for rect, replace in draws:
            font_size = max(6.0, min(rect.height * 0.78, 24.0))
            # rect.y1 is the bottom of the span; nudge up slightly to sit on the baseline.
            page.insert_text(
                fitz.Point(rect.x0, rect.y1 - rect.height * 0.18),
                replace,
                fontsize=font_size,
                fontname="helv",
                color=(0, 0, 0),
            )

    out = io.BytesIO()
    doc.save(out)
    doc.close()
    return Response(content=out.getvalue(), media_type="application/pdf")


@router.post("/pdf-decorate")
async def pdf_decorate(
    file: UploadFile = File(..., description="Original PDF"),
    options: str = Form(..., description='JSON: {"headerText","footerText","addPageNumbers"}'),
) -> Response:
    """Stamp header / footer / page numbers onto an existing PDF.

    Content is left untouched — decorations are drawn in the top and bottom
    margins of every page.
    """
    import fitz

    data = await file.read()
    if not data:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")

    try:
        opts = json.loads(options)
        assert isinstance(opts, dict)
    except (json.JSONDecodeError, AssertionError) as exc:
        raise HTTPException(status_code=422, detail="`options` must be a JSON object.") from exc

    header_text = str(opts.get("headerText", "") or "")
    footer_text = str(opts.get("footerText", "") or "")
    add_page_numbers = bool(opts.get("addPageNumbers", False))

    doc = _open_doc(data)
    total = doc.page_count
    gray = (0.42, 0.45, 0.50)

    for i, page in enumerate(doc):
        width = page.rect.width
        height = page.rect.height

        if header_text:
            page.insert_text(
                fitz.Point(width - 40 - len(header_text) * 4.2, 28),
                header_text,
                fontsize=8,
                fontname="helv",
                color=gray,
            )

        footer_parts = []
        if footer_text:
            footer_parts.append(footer_text)
        if add_page_numbers:
            footer_parts.append(f"Page {i + 1} of {total}")
        if footer_parts:
            footer = "   ·   ".join(footer_parts)
            page.insert_text(
                fitz.Point(width / 2 - len(footer) * 2.1, height - 24),
                footer,
                fontsize=8,
                fontname="helv",
                color=gray,
            )

    out = io.BytesIO()
    doc.save(out)
    doc.close()
    return Response(content=out.getvalue(), media_type="application/pdf")
