"""FastAPI application entry point for the FileFlowOne Python backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import sfi

app = FastAPI(
    title="FileFlowOne Research Backend",
    description="Python FastAPI backend for SFI scoring and future research endpoints.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(sfi.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
