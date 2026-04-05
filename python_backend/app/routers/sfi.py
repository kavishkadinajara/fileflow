"""
Semantic Fidelity Index (SFI) — Gap 1 of the FileFlowOne research plan.

POST /api/slm-score
Measures how much semantic meaning survives when a document is converted
between formats using a three-dimensional weighted score.

  SFI = 0.35 · S_structural + 0.45 · S_semantic + 0.20 · S_functional
"""

from __future__ import annotations

import io
import re
import time
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

# ── Lazy-loaded heavy deps (loaded once at module import, not per-request) ────
from sentence_transformers import SentenceTransformer, util as st_util

_EMBED_MODEL: SentenceTransformer | None = None


def _get_embed_model() -> SentenceTransformer:
    global _EMBED_MODEL
    if _EMBED_MODEL is None:
        _EMBED_MODEL = SentenceTransformer("all-MiniLM-L6-v2")
    return _EMBED_MODEL


router = APIRouter(prefix="/api", tags=["SFI"])

# ─────────────────────────────────────────────────────────────────────────────
# Text / structure extraction
# ─────────────────────────────────────────────────────────────────────────────

def _detect_format(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return ext if ext in {"docx", "pdf", "html", "md", "txt"} else "txt"


def _extract_docx(data: bytes) -> tuple[str, dict[str, int]]:
    from docx import Document  # python-docx

    doc = Document(io.BytesIO(data))
    text_parts: list[str] = []
    headings = 0
    tables = 0
    lists = 0
    links = 0

    for para in doc.paragraphs:
        style_name = para.style.name.lower() if para.style else ""
        text = para.text.strip()
        if text:
            text_parts.append(text)
        if "heading" in style_name:
            headings += 1
        if style_name in {"list bullet", "list number", "list paragraph"}:
            lists += 1

    for _ in doc.tables:
        tables += 1

    # Count hyperlinks via XML
    xml_str = doc.element.xml if hasattr(doc.element, "xml") else ""
    links = xml_str.count("<w:hyperlink ")

    plain_text = "\n".join(text_parts)
    elements = {
        "headings": headings,
        "tables": tables,
        "lists": lists,
        "links": links,
        "paragraphs": len(text_parts),
    }
    return plain_text, elements


def _extract_pdf(data: bytes) -> tuple[str, dict[str, int]]:
    from pdfminer.high_level import extract_text
    from pdfminer.layout import LAParams

    params = LAParams(line_margin=0.5)
    plain_text = extract_text(io.BytesIO(data), laparams=params) or ""

    lines = plain_text.splitlines()
    headings = 0
    tables = 0
    lists = 0

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        # Heading heuristic: short line, no trailing punctuation, all-caps or Title Case
        if len(stripped) < 80 and stripped == stripped.title() and not stripped.endswith((".", ",", ";")):
            headings += 1
        # Table heuristic: line contains multiple pipe-like separators or long runs of spaces
        if stripped.count("  ") >= 3 or stripped.count("|") >= 2:
            tables += 1
        # List heuristic: starts with bullet character or numbered item
        if re.match(r"^[\u2022\u2023\u25e6\-\*]\s", stripped) or re.match(r"^\d+[\.\)]\s", stripped):
            lists += 1

    elements = {
        "headings": headings,
        "tables": max(1, tables // 3),  # rough de-duplicate (multiple rows per table)
        "lists": lists,
        "links": 0,
        "paragraphs": len([l for l in lines if l.strip()]),
    }
    return plain_text, elements


def _extract_html(data: bytes) -> tuple[str, dict[str, int]]:
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(data, "html.parser")

    headings = sum(len(soup.find_all(f"h{i}")) for i in range(1, 7))
    tables = len(soup.find_all("table"))
    lists = len(soup.find_all(["ul", "ol"]))
    links = len(soup.find_all("a", href=True))

    plain_text = soup.get_text(separator="\n", strip=True)
    elements = {
        "headings": headings,
        "tables": tables,
        "lists": lists,
        "links": links,
        "paragraphs": len(soup.find_all("p")),
    }
    return plain_text, elements


def _extract_md(data: bytes) -> tuple[str, dict[str, int]]:
    text = data.decode("utf-8", errors="replace")

    headings = len(re.findall(r"^#{1,6}\s", text, re.MULTILINE))
    tables = len(re.findall(r"^\|.+\|$", text, re.MULTILINE))
    tables = max(0, tables // 2)  # rough: header + separator = 1 table
    lists = len(re.findall(r"^[\-\*\+]\s|\d+\.\s", text, re.MULTILINE))
    links = len(re.findall(r"\[.+?\]\(.+?\)", text))
    formulas = len(re.findall(r"\$[^$]+\$|\\\(.+?\\\)", text))

    elements = {
        "headings": headings,
        "tables": tables,
        "lists": lists,
        "links": links,
        "formulas": formulas,
        "paragraphs": len([l for l in text.splitlines() if l.strip()]),
    }
    plain_text = re.sub(r"[#*_`\[\]()!>|]", " ", text)
    return plain_text, elements


def _extract_txt(data: bytes) -> tuple[str, dict[str, int]]:
    text = data.decode("utf-8", errors="replace")
    paragraphs = [p for p in re.split(r"\n{2,}", text) if p.strip()]
    elements = {
        "headings": 0,
        "tables": 0,
        "lists": 0,
        "links": 0,
        "paragraphs": len(paragraphs),
    }
    return text, elements


_EXTRACTORS = {
    "docx": _extract_docx,
    "pdf": _extract_pdf,
    "html": _extract_html,
    "md": _extract_md,
    "txt": _extract_txt,
}


def extract(data: bytes, fmt: str) -> tuple[str, dict[str, int]]:
    fn = _EXTRACTORS.get(fmt, _extract_txt)
    return fn(data)


# ─────────────────────────────────────────────────────────────────────────────
# Scoring functions
# ─────────────────────────────────────────────────────────────────────────────

def _ratio(target: int, source: int) -> float:
    if source == 0:
        return 1.0
    return min(target / source, 1.0)


def score_structural(src: dict[str, int], tgt: dict[str, int]) -> tuple[float, dict[str, Any]]:
    heading_score = _ratio(tgt.get("headings", 0), src.get("headings", 0))
    table_score   = _ratio(tgt.get("tables", 0),   src.get("tables", 0))
    list_score    = _ratio(tgt.get("lists", 0),     src.get("lists", 0))

    score = heading_score * 0.4 + table_score * 0.4 + list_score * 0.2

    details = {
        "headings_source":    src.get("headings", 0),
        "headings_preserved": tgt.get("headings", 0),
        "tables_source":      src.get("tables", 0),
        "tables_preserved":   tgt.get("tables", 0),
        "lists_source":       src.get("lists", 0),
        "lists_preserved":    tgt.get("lists", 0),
        "heading_score":      round(heading_score, 4),
        "table_score":        round(table_score, 4),
        "list_score":         round(list_score, 4),
    }
    return round(score, 4), details


def _split_chunks(text: str, max_tokens: int = 200) -> list[str]:
    """Split text into ~max_tokens-word chunks at sentence boundaries."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    chunks: list[str] = []
    current: list[str] = []
    count = 0
    for sent in sentences:
        words = sent.split()
        if count + len(words) > max_tokens and current:
            chunks.append(" ".join(current))
            current = words
            count = len(words)
        else:
            current.extend(words)
            count += len(words)
    if current:
        chunks.append(" ".join(current))
    return [c for c in chunks if c.strip()]


def score_semantic(src_text: str, tgt_text: str) -> tuple[float, dict[str, Any]]:
    model = _get_embed_model()

    src_chunks = _split_chunks(src_text)
    tgt_chunks = _split_chunks(tgt_text)

    if not src_chunks or not tgt_chunks:
        return 0.0, {"chunks_analyzed": 0, "mean_similarity": 0.0,
                     "min_similarity": 0.0, "max_similarity": 0.0}

    src_emb = model.encode(src_chunks, convert_to_tensor=True)
    tgt_emb = model.encode(tgt_chunks, convert_to_tensor=True)

    cosine_scores = st_util.cos_sim(src_emb, tgt_emb)
    best_matches = cosine_scores.max(dim=1).values

    mean_sim = float(best_matches.mean())
    min_sim  = float(best_matches.min())
    max_sim  = float(best_matches.max())

    details = {
        "chunks_analyzed": len(src_chunks),
        "mean_similarity": round(mean_sim, 4),
        "min_similarity":  round(min_sim, 4),
        "max_similarity":  round(max_sim, 4),
    }
    return round(mean_sim, 4), details


def _fuzzy_title_match(src_text: str, tgt_text: str, threshold: float = 0.7) -> bool:
    """Check if the first ~100 chars of source appear somewhere in the target."""
    src_head = src_text.strip()[:100].lower()
    tgt_lower = tgt_text.lower()
    if not src_head:
        return True
    # Simple overlap: what fraction of words from source head appear in target head
    src_words = set(re.findall(r"\w+", src_head))
    tgt_words = set(re.findall(r"\w+", tgt_lower[:500]))
    if not src_words:
        return True
    overlap = len(src_words & tgt_words) / len(src_words)
    return overlap >= threshold


def score_functional(
    src: dict[str, int],
    tgt: dict[str, int],
    src_text: str,
    tgt_text: str,
) -> tuple[float, dict[str, Any]]:
    link_score     = _ratio(tgt.get("links", 0), src.get("links", 0))
    metadata_score = 1.0 if _fuzzy_title_match(src_text, tgt_text) else 0.5

    # Formula detection
    src_formulas = src.get("formulas", len(re.findall(r"\$[^$]+\$|\=SUM|\\\(.+?\\\)", src_text)))
    tgt_formulas = tgt.get("formulas", len(re.findall(r"\$[^$]+\$|\=SUM|\\\(.+?\\\)", tgt_text)))
    formula_score = _ratio(tgt_formulas, src_formulas)

    score = link_score * 0.5 + metadata_score * 0.3 + formula_score * 0.2

    details = {
        "link_score":        round(link_score, 4),
        "links_source":      src.get("links", 0),
        "links_preserved":   tgt.get("links", 0),
        "metadata_score":    round(metadata_score, 4),
        "formula_score":     round(formula_score, 4),
        "formulas_source":   src_formulas,
        "formulas_preserved":tgt_formulas,
    }
    return round(score, 4), details


def _grade(sfi: float) -> str:
    if sfi >= 0.85: return "A"
    if sfi >= 0.70: return "B"
    if sfi >= 0.55: return "C"
    if sfi >= 0.40: return "D"
    return "F"


# ─────────────────────────────────────────────────────────────────────────────
# Route
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/slm-score")
async def slm_score(
    original_file:  UploadFile = File(..., description="Source document"),
    converted_file: UploadFile = File(..., description="Converted document"),
) -> JSONResponse:
    t_start = time.perf_counter()

    src_data = await original_file.read()
    tgt_data = await converted_file.read()

    src_fmt = _detect_format(original_file.filename or "file.txt")
    tgt_fmt = _detect_format(converted_file.filename or "file.txt")

    try:
        src_text, src_elements = extract(src_data, src_fmt)
        tgt_text, tgt_elements = extract(tgt_data, tgt_fmt)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Extraction failed: {exc}") from exc

    try:
        s_struct, struct_details  = score_structural(src_elements, tgt_elements)
        s_sem,    sem_details     = score_semantic(src_text, tgt_text)
        s_func,   func_details    = score_functional(src_elements, tgt_elements, src_text, tgt_text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Scoring failed: {exc}") from exc

    W_STRUCT, W_SEM, W_FUNC = 0.35, 0.45, 0.20
    sfi = round(W_STRUCT * s_struct + W_SEM * s_sem + W_FUNC * s_func, 4)

    elapsed_ms = round((time.perf_counter() - t_start) * 1000)

    return JSONResponse({
        "sfi_score": sfi,
        "grade":     _grade(sfi),
        "breakdown": {
            "structural": {
                "score":    s_struct,
                "weight":   W_STRUCT,
                "weighted": round(W_STRUCT * s_struct, 4),
                "details":  struct_details,
            },
            "semantic": {
                "score":    s_sem,
                "weight":   W_SEM,
                "weighted": round(W_SEM * s_sem, 4),
                "details":  sem_details,
            },
            "functional": {
                "score":    s_func,
                "weight":   W_FUNC,
                "weighted": round(W_FUNC * s_func, 4),
                "details":  func_details,
            },
        },
        "conversion_pair": {
            "source_format": src_fmt,
            "target_format": tgt_fmt,
        },
        "processing_time_ms": elapsed_ms,
    })
