/**
 * Next.js proxy for the Python FastAPI SFI scoring endpoint.
 *
 * Accepts multipart/form-data with:
 *   original_file  — the source document
 *   converted_file — the converted document
 *
 * Forwards the request to the Python backend at PYTHON_BACKEND_URL
 * (default: http://localhost:8000) and streams the JSON response back.
 */

import { NextRequest, NextResponse } from "next/server";

const PYTHON_BACKEND = process.env.PYTHON_BACKEND_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const originalFile  = formData.get("original_file");
  const convertedFile = formData.get("converted_file");

  if (!(originalFile instanceof File) || !(convertedFile instanceof File)) {
    return NextResponse.json(
      { error: "Both original_file and converted_file are required" },
      { status: 400 },
    );
  }

  // Forward to the Python backend
  const upstream = new FormData();
  upstream.append("original_file",  originalFile,  originalFile.name);
  upstream.append("converted_file", convertedFile, convertedFile.name);

  let response: Response;
  try {
    response = await fetch(`${PYTHON_BACKEND}/api/slm-score`, {
      method: "POST",
      body: upstream,
    });
  } catch (err) {
    console.error("[slm-score] Python backend unreachable:", err);
    return NextResponse.json(
      { error: "SFI backend is not running. Start it with: cd python_backend && uvicorn app.main:app --reload" },
      { status: 503 },
    );
  }

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
