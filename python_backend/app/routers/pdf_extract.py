"""
PDF text extraction endpoint.

POST /api/pdf-extract
Accepts a PDF file, returns extracted text with heuristic structure detection.
Used by the Next.js convert route instead of the pdf-parse npm package.
"""

from __future__ import annotations

import io
import re

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api", tags=["PDF"])


def _extract_and_structure(data: bytes) -> dict:
    """Extract text from PDF and return structured plain/md/html representations."""
    from pdfminer.high_level import extract_text
    from pdfminer.layout import LAParams

    params = LAParams(line_margin=0.5, word_margin=0.1)
    raw = extract_text(io.BytesIO(data), laparams=params) or ""

    lines = raw.split("\n")
    md_lines: list[str] = []
    blank_run = 0

    for line in lines:
        trimmed = line.strip()
        if not trimmed:
            blank_run += 1
            if blank_run == 1:
                md_lines.append("")
            continue
        blank_run = 0

        # Heading heuristic: short, no terminal sentence punctuation,
        # title-cased or all-caps
        is_heading = (
            5 < len(trimmed) < 80
            and not trimmed.endswith((".", ",", ";", "?", "!"))
            and (trimmed.istitle() or trimmed.isupper())
        )

        # Bullet heuristic
        is_bullet = bool(re.match(r"^[\u2022\u2023\u25e6\-\*\+]\s", trimmed))
        is_numbered = bool(re.match(r"^\d+[\.\)]\s", trimmed))

        if is_heading and len(trimmed) < 60:
            md_lines.append(f"## {trimmed}")
        elif is_bullet:
            body = re.sub(r"^[\u2022\u2023\u25e6\-\*\+]\s+", "", trimmed)
            md_lines.append(f"- {body}")
        elif is_numbered:
            md_lines.append(trimmed)
        else:
            md_lines.append(trimmed)

    md_text = re.sub(r"\n{3,}", "\n\n", "\n".join(md_lines)).strip()
    plain_text = raw.strip()

    # Build HTML
    html_parts: list[str] = []
    for line in md_text.split("\n"):
        if line.startswith("## "):
            html_parts.append(f"<h2>{line[3:]}</h2>")
        elif line.startswith("# "):
            html_parts.append(f"<h1>{line[2:]}</h1>")
        elif line.startswith("### "):
            html_parts.append(f"<h3>{line[4:]}</h3>")
        elif line.startswith("- "):
            html_parts.append(f"<li>{line[2:]}</li>")
        elif line.strip() == "":
            html_parts.append("")
        else:
            html_parts.append(f"<p>{line}</p>")

    html_body = "\n".join(html_parts)
    html_text = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body {{ font-family: sans-serif; max-width: 860px; margin: 40px auto; padding: 0 24px; line-height: 1.7; color: #1a1a1a; }}
  h1,h2,h3 {{ margin-top: 1.5em; }}
  p {{ margin: 0.6em 0; }}
  li {{ margin: 0.3em 0; }}
</style>
</head><body>
{html_body}
</body></html>"""

    return {"plain": plain_text, "md": md_text, "html": html_text}


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
