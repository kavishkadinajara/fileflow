/**
 * Document Redline bridge — compares two documents via the Python backend's
 * semantic, multi-level diff engine (block alignment + inline word diff + move
 * detection + change magnitude).
 */
const PYTHON_BACKEND = process.env.PYTHON_BACKEND_URL ?? "http://localhost:8000";

const BACKEND_DOWN =
  "Document comparison requires the Python backend. Start it with: cd python_backend && python -m uvicorn app.main:app --reload";

export type RedlineOp = "equal" | "modified" | "added" | "removed" | "moved";

export interface InlineRun {
  op: "equal" | "insert" | "delete";
  text: string;
}

export interface RedlineBlock {
  op: RedlineOp;
  left_index: number | null;
  right_index: number | null;
  kind: "para" | "heading" | "list" | "table";
  similarity: number;
  old_text: string;
  new_text: string;
  inline: InlineRun[];
}

export interface RedlineStats {
  blocks_a: number;
  blocks_b: number;
  counts: Record<RedlineOp, number>;
  changed_blocks: number;
  words_added: number;
  words_removed: number;
  words_changed: number;
  change_magnitude: number;
  similarity: number;
  verdict: string;
}

export interface RedlineResult {
  blocks: RedlineBlock[];
  stats: RedlineStats;
  formats: { a: string; b: string };
  semantic: boolean;
  processing_time_ms: number;
}

/** Compare two documents and return a structured redline report. */
export async function compareDocuments(
  a: Buffer,
  aName: string,
  b: Buffer,
  bName: string,
  semantic = true,
): Promise<RedlineResult> {
  const form = new FormData();
  form.append("original_file", new Blob([new Uint8Array(a)]), aName || "original.txt");
  form.append("revised_file", new Blob([new Uint8Array(b)]), bName || "revised.txt");
  form.append("semantic", String(semantic));

  let res: Response;
  try {
    res = await fetch(`${PYTHON_BACKEND}/api/redline`, { method: "POST", body: form });
  } catch {
    throw new Error(BACKEND_DOWN);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Comparison failed (${res.status})`);
  }
  return (await res.json()) as RedlineResult;
}
