"""
ATS Resume Optimizer endpoint.

POST /api/ats-analyze — multipart (resume file + job-description text) → a JSON match
report (overall + sub-scores, matched/missing skills & keywords, format issues,
section/contact completeness). Deterministic; see app.services.ats.
"""

from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api", tags=["ATS"])


@router.post("/ats-analyze")
async def ats_analyze(
    file: UploadFile = File(..., description="Resume / CV (PDF or DOCX)"),
    jd: str = Form(..., description="Job description text"),
) -> JSONResponse:
    """Score a resume against a job description and return a gap report."""
    from app.services.ats import analyze_resume, report_to_dict

    data = await file.read()
    if not data:
        raise HTTPException(status_code=422, detail="Resume file is empty.")
    if not jd or not jd.strip():
        raise HTTPException(status_code=422, detail="Job description is required.")

    try:
        report = analyze_resume(data, file.filename or "resume.pdf", jd)
    except Exception as exc:  # noqa: BLE001
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=422, detail=f"ATS analysis failed: {exc}") from exc

    return JSONResponse(report_to_dict(report))
