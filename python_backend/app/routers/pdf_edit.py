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
from fastapi.responses import JSONResponse, Response

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
    replacements: str = Form(
        ...,
        description=(
            'JSON array of replacements. Each item: '
            '{"find": str, "replace": str, "occurrence"?: "all"|"first"|int, '
            '"matchCase"?: bool}. The new text is redrawn in the matched span\'s '
            "own font, size, and colour."
        ),
    ),
) -> Response:
    """Find/replace text on the original PDF, matching the replaced text's style.

    Reads each matched span's font family/weight/slant, size, and colour, then
    redraws the replacement in a matching base-14 font — so the edit blends in
    and images / surrounding text stay pixel-identical. Supports targeted
    replacement (first / n-th / all) and case-insensitive matching.
    """
    from app.services.pdf_overlay import Replacement, apply_replacements

    data = await file.read()
    if not data:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")

    try:
        pairs = json.loads(replacements)
        assert isinstance(pairs, list)
    except (json.JSONDecodeError, AssertionError) as exc:
        raise HTTPException(status_code=422, detail="`replacements` must be a JSON array.") from exc

    reps: list[Replacement] = []
    for pair in pairs:
        if not isinstance(pair, dict) or not str(pair.get("find", "")):
            continue
        occ = pair.get("occurrence", "all")
        # Normalise occurrence: accept "all" / "first" / a 1-based integer.
        if isinstance(occ, str) and occ not in ("all", "first"):
            occ = int(occ) if occ.isdigit() else "all"
        reps.append(Replacement(
            find=str(pair["find"]),
            replace=str(pair.get("replace", "")),
            occurrence=occ,
            match_case=bool(pair.get("matchCase", True)),
        ))

    if not reps:
        raise HTTPException(status_code=422, detail="No valid replacements supplied.")

    try:
        out = apply_replacements(data, reps)
    except Exception as exc:  # noqa: BLE001
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=422, detail=f"PDF overlay failed: {exc}") from exc

    return Response(content=out, media_type="application/pdf")


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


@router.post("/pdf-patch")
async def pdf_patch(
    file: UploadFile = File(..., description="Original PDF"),
    edited_text: str = Form(..., description="The edited text (as extracted, then changed)"),
) -> Response:
    """Surgically patch the PDF to reflect edited_text.

    Diffs the edited text against the text originally extracted from the PDF,
    isolates the minimal changed phrases, and patches ONLY those spots via the
    font-matching overlay — every untouched region stays pixel-identical. The
    number of patches applied is returned in the X-Patch-Count header.
    """
    from app.services.pdf_diff import patch_pdf

    data = await file.read()
    if not data:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")
    if not edited_text.strip():
        raise HTTPException(status_code=422, detail="edited_text is empty.")

    try:
        out, changes = patch_pdf(data, edited_text)
    except Exception as exc:  # noqa: BLE001
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=422, detail=f"PDF patch failed: {exc}") from exc

    return Response(
        content=out,
        media_type="application/pdf",
        headers={"X-Patch-Count": str(len(changes))},
    )


@router.post("/pdf-reflow-extract")
async def pdf_reflow_extract(
    file: UploadFile = File(..., description="Original PDF"),
) -> JSONResponse:
    """Extract the PDF as positioned, editable layout blocks (Smart Reflow).

    Each page returns its size (points) and every text line as a block with its
    absolute position and style. The UI lets the user edit block text; the edited
    layout is sent back to /pdf-reflow-render to produce layout-preserving HTML.
    """
    from app.services.pdf_reflow import extract_layout

    data = await file.read()
    if not data:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")
    try:
        pages = extract_layout(data)
    except Exception as exc:  # noqa: BLE001
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=422, detail=f"Layout extraction failed: {exc}") from exc
    return JSONResponse({"pages": pages})


@router.post("/pdf-reflow-render")
async def pdf_reflow_render(payload: dict) -> JSONResponse:
    """Render edited layout blocks to absolute-positioned HTML (Smart Reflow).

    Input: {"pages": [...]} (the layout from /pdf-reflow-extract, with edited
    block text). Output: {"html": "..."} which the Next.js side prints to PDF via
    the existing Puppeteer pipeline, preserving each block's original position.
    """
    from app.services.pdf_reflow import render_layout_html

    pages = payload.get("pages")
    if not isinstance(pages, list) or not pages:
        raise HTTPException(status_code=422, detail="`pages` must be a non-empty list.")
    try:
        html = render_layout_html(pages)
    except Exception as exc:  # noqa: BLE001
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=422, detail=f"Layout render failed: {exc}") from exc
    return JSONResponse({"html": html})
