# Quick Start

Install dependencies and run the development server.

## Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env.local` file:

```
GROQ_API_KEY=your_key_here
PYTHON_BACKEND_URL=http://localhost:8000
```

The `GROQ_API_KEY` is only required if you use the AI features. All conversion features work without it.

## Starting the Python Backend

The Python backend is required for SFI scoring and PDF extraction.

```powershell
cd python_backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```
