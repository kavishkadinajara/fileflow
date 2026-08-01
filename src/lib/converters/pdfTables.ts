/**
 * PDF → table extraction bridge (PDF tables → Excel / CSV).
 *
 * Delegates to the Python backend's deterministic table engine (ruled +
 * char-projection borderless detection, per-column type inference, confidence
 * scoring). Two calls: a JSON preview of the detected tables, and a binary export
 * to XLSX or CSV.
 */
const PYTHON_BACKEND = process.env.PYTHON_BACKEND_URL ?? "http://localhost:8000";

const BACKEND_DOWN =
  "PDF table extraction requires the Python backend. Start it with: cd python_backend && python -m uvicorn app.main:app --reload";

/** One detected table, as previewed in the UI before export. */
export interface ExtractedTable {
  page: number;
  rows: number;
  cols: number;
  source: "ruled" | "borderless";
  hasHeader: boolean;
  colTypes: string[];
  confidence: number;
  cells: string[][];
}

function pdfForm(buffer: Buffer, fmt: "json" | "xlsx" | "csv"): FormData {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)], { type: "application/pdf" }), "input.pdf");
  form.append("fmt", fmt);
  return form;
}

/** Detect tables and return them for preview (no file produced). */
export async function extractTables(buffer: Buffer): Promise<ExtractedTable[]> {
  let res: Response;
  try {
    res = await fetch(`${PYTHON_BACKEND}/api/pdf-tables`, { method: "POST", body: pdfForm(buffer, "json") });
  } catch {
    throw new Error(BACKEND_DOWN);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Table extraction failed (${res.status})`);
  }
  const data = (await res.json()) as { tables: ExtractedTable[] };
  return data.tables;
}

/** Export the PDF's tables to an XLSX workbook or CSV. Returns the file bytes. */
export async function tablesToFile(
  buffer: Buffer,
  fmt: "xlsx" | "csv",
): Promise<{ buffer: Buffer; tableCount: number }> {
  let res: Response;
  try {
    res = await fetch(`${PYTHON_BACKEND}/api/pdf-tables`, { method: "POST", body: pdfForm(buffer, fmt) });
  } catch {
    throw new Error(BACKEND_DOWN);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Table export failed (${res.status})`);
  }
  const arrayBuf = await res.arrayBuffer();
  const tableCount = parseInt(res.headers.get("X-Table-Count") ?? "0", 10) || 0;
  return { buffer: Buffer.from(arrayBuf), tableCount };
}
