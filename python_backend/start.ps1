# Start the FileFlowOne Python research backend (PowerShell)
# Run from the project root: .\python_backend\start.ps1

$ErrorActionPreference = "Stop"

Set-Location "$PSScriptRoot"

if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Cyan
    python -m venv .venv
}

Write-Host "Activating virtual environment..." -ForegroundColor Cyan
& ".venv\Scripts\Activate.ps1"

Write-Host "Installing dependencies..." -ForegroundColor Cyan
python -m pip install -r requirements.txt

Write-Host "Starting FastAPI on http://localhost:8000 ..." -ForegroundColor Green
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
