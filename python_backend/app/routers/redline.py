"""
Document Redline / Compare — POST /api/redline

Accepts two documents (PDF / DOCX / HTML / MD / TXT), extracts each to text, and
returns a semantic, multi-level redline: block-aligned changes (added / removed /
modified / moved), inline word diffs, and a quantified change magnitude.

Extraction reuses the SFI service's per-format extractors so behaviour is
consistent with the rest of the platform.
"""

from __future__ import annotations

import time

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.routers.sfi import _detect_format, extract
from app.services.redline import build_redline

router = APIRouter(prefix="/api", tags=["Redline"])


def _extract_structured(data: bytes, fmt: str) -> str:
    """Extract text while PRESERVING block boundaries (blank lines), which the
    redline block segmenter needs.

    The SFI extractors flatten all whitespace to single spaces — perfect for
    embedding similarity, fatal for block-level diffing (the whole document
    becomes one block). So for the text-native formats we keep the original line
    structure; for PDF/DOCX we use the structure engine, which emits markdown with
    real paragraph breaks.
    """
    if fmt in ("md", "txt"):
        return data.decode("utf-8", errors="replace")
    if fmt == "html":
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(data, "html.parser")
        # Block-level tags become their own lines separated by blank lines.
        parts: list[str] = []
        for el in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "tr", "blockquote"]):
            t = el.get_text(" ", strip=True)
            if t:
                parts.append(t)
        if parts:
            return "\n\n".join(parts)
        return soup.get_text("\n", strip=True)
    if fmt == "pdf":
        # Structure engine → markdown with paragraph/heading breaks preserved.
        from app.services.pdf_structure import extract_structure
        try:
            return extract_structure(data)["md"]
        except Exception:
            text, _ = extract(data, fmt)
            return text
    if fmt == "docx":
        # python-docx paragraphs already carry block boundaries — one per line,
        # joined with blank lines so the segmenter treats each as a block.
        from docx import Document
        import io as _io
        doc = Document(_io.BytesIO(data))
        paras = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paras)
    text, _ = extract(data, fmt)
    return text


@router.post("/redline")
async def redline(
    original_file: UploadFile = File(..., description="Original / version A"),
    revised_file: UploadFile = File(..., description="Revised / version B"),
    semantic: str = Form("true"),
) -> JSONResponse:
    t0 = time.perf_counter()

    a_data = await original_file.read()
    b_data = await revised_file.read()
    if not a_data or not b_data:
        raise HTTPException(status_code=422, detail="One or both files are empty.")

    a_fmt = _detect_format(original_file.filename or "a.txt")
    b_fmt = _detect_format(revised_file.filename or "b.txt")

    try:
        a_text = _extract_structured(a_data, a_fmt)
        b_text = _extract_structured(b_data, b_fmt)
    except Exception as exc:  # noqa: BLE001 — surface extraction problems clearly
        raise HTTPException(status_code=422, detail=f"Extraction failed: {type(exc).__name__}: {exc}") from exc

    if not a_text.strip() or not b_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from one of the documents.")

    use_semantic = str(semantic).lower() not in ("false", "0", "no")

    try:
        report = build_redline(a_text, b_text, semantic=use_semantic)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Comparison failed: {exc}") from exc

    return JSONResponse({
        "blocks": report.blocks,
        "stats": report.stats,
        "formats": {"a": a_fmt, "b": b_fmt},
        "semantic": use_semantic,
        "processing_time_ms": round((time.perf_counter() - t0) * 1000),
    })
