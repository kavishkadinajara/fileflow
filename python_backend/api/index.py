"""Vercel serverless entry point — re-exports the FastAPI app."""

import sys
from pathlib import Path

# Make the parent `app` package importable from this nested entry point.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402 iii
 
# Vercel's @vercel/python runtime detects the ASGI `app` symbol automatically.
