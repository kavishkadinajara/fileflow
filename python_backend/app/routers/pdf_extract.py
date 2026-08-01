"""
PDF text extraction endpoint.

POST /api/pdf-extract
Accepts a PDF file, returns extracted text with accurate structure detection.

Primary path: the deterministic structure engine (app.services.pdf_structure),
which reconstructs headings/paragraphs/lists/tables/reading-order from glyph
geometry and font metrics. Falls back to the legacy pdfminer flow only if the
engine raises, so a malformed PDF still returns *something*.
"""

from __future__ import annotations

import io
import re

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.services.pdf_structure import extract_structure

router = APIRouter(prefix="/api", tags=["PDF"])


def _md_to_html(md: str) -> str:
    """Render the structured Markdown (headings, lists, tables, paragraphs) to HTML."""
    lines = md.split("\n")
    out: list[str] = []
    i = 0
    list_open: str | None = None

    def close_list():
        nonlocal list_open
        if list_open:
            out.append(f"</{list_open}>")
            list_open = None

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Table block: a run of lines starting with '|'.
        if stripped.startswith("|"):
            close_list()
            tbl = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                tbl.append(lines[i].strip())
                i += 1
            out.append(_table_block_to_html(tbl))
            continue

        heading = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if heading:
            close_list()
            lvl = len(heading.group(1))
            out.append(f"<h{lvl}>{_esc(heading.group(2))}</h{lvl}>")
        elif re.match(r"^[-*]\s+", stripped):
            if list_open != "ul":
                close_list(); out.append("<ul>"); list_open = "ul"
            out.append(f"<li>{_esc(re.sub(r'^[-*]\\s+', '', stripped))}</li>")
        elif re.match(r"^\d+\.\s+", stripped):
            if list_open != "ol":
                close_list(); out.append("<ol>"); list_open = "ol"
            out.append(f"<li>{_esc(re.sub(r'^\\d+\\.\\s+', '', stripped))}</li>")
        elif stripped == "":
            close_list()
        else:
            close_list()
            out.append(f"<p>{_esc(stripped)}</p>")
        i += 1
    close_list()

    body = "\n".join(out)
    return f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body {{ font-family: sans-serif; max-width: 860px; margin: 40px auto; padding: 0 24px; line-height: 1.7; color: #1a1a1a; }}
  h1,h2,h3 {{ margin-top: 1.5em; }}
  p {{ margin: 0.6em 0; }}
  li {{ margin: 0.3em 0; }}
  table {{ border-collapse: collapse; margin: 1em 0; }}
  th,td {{ border: 1px solid #ccc; padding: 6px 10px; text-align: left; }}
  th {{ background: #f3f4f6; }}
</style>
</head><body>
{body}
</body></html>"""


def _table_block_to_html(rows: list[str]) -> str:
    def cells(r: str) -> list[str]:
        return [c.strip() for c in r.strip().strip("|").split("|")]
    if len(rows) >= 2 and set(rows[1].replace("|", "").replace(" ", "")) <= {"-", ":"}:
        header, body = cells(rows[0]), [cells(r) for r in rows[2:]]
    else:
        header, body = None, [cells(r) for r in rows]
    parts = ["<table>"]
    if header:
        parts.append("<thead><tr>" + "".join(f"<th>{_esc(c)}</th>" for c in header) + "</tr></thead>")
    parts.append("<tbody>")
    for r in body:
        parts.append("<tr>" + "".join(f"<td>{_esc(c)}</td>" for c in r) + "</tr>")
    parts.append("</tbody></table>")
    return "".join(parts)


def _esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _legacy_extract(data: bytes) -> dict:
    """Fallback: the old pdfminer line-heuristic flow, used only if the engine fails."""
    from pdfminer.high_level import extract_text
    from pdfminer.layout import LAParams

    params = LAParams(line_margin=0.5, word_margin=0.1)
    raw = extract_text(io.BytesIO(data), laparams=params) or ""
    md_text = re.sub(r"\n{3,}", "\n\n", raw).strip()
    return {"plain": raw.strip(), "md": md_text, "html": _md_to_html(md_text)}


def _extract_and_structure(data: bytes) -> dict:
    """Run the structure engine; degrade gracefully to the legacy flow on error."""
    try:
        result = extract_structure(data)
        md = result["md"]
        if not md.strip():
            raise ValueError("structure engine returned empty markdown")
        return {"plain": result["plain"], "md": md, "html": _md_to_html(md)}
    except Exception:
        import traceback
        traceback.print_exc()
        return _legacy_extract(data)


@router.post("/pdf-extract")
async def pdf_extract(
    file: UploadFile = File(..., description="PDF file to extract text from"),
    output_format: str = "md",   # md | html | txt
) -> JSONResponse:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")

    try:
        result = _extract_and_structure(data)
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=422, detail=f"PDF extraction failed: {exc}") from exc

    fmt = output_format.lower()
    if fmt in ("txt", "text"):
        text = result["plain"]
    elif fmt == "html":
        text = result["html"]
    else:
        text = result["md"]

    return JSONResponse({"text": text, "format": fmt})
