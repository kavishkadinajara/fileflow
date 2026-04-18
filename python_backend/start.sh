#!/usr/bin/env bash
# Start the FileFlowOne Python research backend.
# Run from the project root: bash python_backend/start.sh

set -e

cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  echo "Creating virtual environment..."
  python -m venv .venv
fi

# Activate venv
if [ -f ".venv/Scripts/activate" ]; then
  # Windows Git Bash / MSYS2
  source .venv/Scripts/activate
else
  source .venv/bin/activate
fi

echo "Installing dependencies..."
pip install -q -r requirements.txt

echo "Starting FastAPI on http://localhost:8000 ..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
