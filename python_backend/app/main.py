"""FastAPI application entry point for the FileFlowOne Python backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import pdf_extract, sfi

app = FastAPI(
    title="FileFlowOne Research Backend",
    description="Python FastAPI backend for SFI scoring and future research endpoints.",
    version="0.1.0",
)

import os

ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(sfi.router)
app.include_router(pdf_extract.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
