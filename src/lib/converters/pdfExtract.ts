/**
 * PDF → text/md/html/docx converters.
 *
 * Delegates text extraction to the Python FastAPI backend (pdfminer.six)
 * instead of a Node.js PDF library — better extraction quality and no
 * native module issues in Next.js.
 */

import { mdToDocx } from "./text";

const PYTHON_BACKEND = process.env.PYTHON_BACKEND_URL ?? "http://localhost:8000";

async function extractFromPython(
  buffer: Buffer,
  outputFormat: "txt" | "md" | "html",
): Promise<string> {
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: "application/pdf" }),
    "input.pdf",
  );

  let res: Response;
  try {
    res = await fetch(
      `${PYTHON_BACKEND}/api/pdf-extract?output_format=${outputFormat}`,
      { method: "POST", body: form },
    );
  } catch {
    throw new Error(
      "PDF extraction requires the Python backend. Start it with: cd python_backend && python -m uvicorn app.main:app --reload",
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `PDF extraction failed (${res.status})`);
  }

  const data = await res.json();
  return data.text as string;
}

export async function pdfToTxt(buffer: Buffer): Promise<string> {
  return extractFromPython(buffer, "txt");
}

export async function pdfToMd(buffer: Buffer): Promise<string> {
  return extractFromPython(buffer, "md");
}

export async function pdfToHtml(buffer: Buffer): Promise<string> {
  return extractFromPython(buffer, "html");
}

export async function pdfToDocx(buffer: Buffer): Promise<Buffer> {
  const md = await extractFromPython(buffer, "md");
  return mdToDocx(md);
}
