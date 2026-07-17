/**
 * Round-Trip Fidelity — execution engine (server-side).
 *
 * Runs a real conversion chain and measures fidelity at every hop:
 *   1. Convert the document through each hop by delegating to /api/convert
 *      (reuses ALL existing converter logic + styling — no duplication).
 *   2. After each hop, call the Python SFI service twice: score the new artifact
 *      against (a) the previous artifact — LOCAL loss — and (b) the original —
 *      CUMULATIVE drift.
 *
 * The heavy lifting (embeddings, structural extraction) lives in the Python SFI
 * service; this engine orchestrates and hands the measured hops to the pure
 * analysis core to build the report.
 */

import type { FileFormat } from "@/types";
import { type RoundTripHop, type HopSfi, buildReport, isValidChain } from "@/lib/roundtrip/analysis";

const PYTHON_BACKEND = process.env.PYTHON_BACKEND_URL ?? "http://localhost:8000";

const MIME: Record<string, string> = {
  md: "text/markdown", txt: "text/plain", html: "text/html",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

interface Artifact {
  fmt: FileFormat;
  bytes: Uint8Array;
}

/** Convert one artifact to `to` via the internal convert route. */
async function convertHop(origin: string, art: Artifact, to: FileFormat): Promise<Uint8Array> {
  const b64 = Buffer.from(art.bytes).toString("base64");
  const res = await fetch(`${origin}/api/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileBase64: b64,
      fileName: `hop.${art.fmt}`,
      fromFormat: art.fmt,
      toFormat: to,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error ?? `Conversion ${art.fmt}→${to} failed (${res.status})`);
  }
  // Convert route returns base64 for binary, or resultText for text formats.
  if (data.fileBase64) return Uint8Array.from(Buffer.from(data.fileBase64, "base64"));
  if (typeof data.resultText === "string") return new TextEncoder().encode(data.resultText);
  throw new Error(`Conversion ${art.fmt}→${to} returned no payload`);
}

/** Wrap bytes as a Blob without tripping the SharedArrayBuffer typing (COOP/COEP). */
function toBlob(bytes: Uint8Array, mime: string): Blob {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer as ArrayBuffer], { type: mime });
}

/** Score artifact `b` against artifact `a` via the Python SFI service. */
async function scoreSfi(a: Artifact, b: Artifact): Promise<HopSfi> {
  const form = new FormData();
  form.append("original_file",  toBlob(a.bytes, MIME[a.fmt] ?? "text/plain"), `original.${a.fmt}`);
  form.append("converted_file", toBlob(b.bytes, MIME[b.fmt] ?? "text/plain"), `converted.${b.fmt}`);

  const res = await fetch(`${PYTHON_BACKEND}/api/slm-score`, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? body.error ?? `SFI scoring failed (${res.status})`);
  }
  return (await res.json()) as HopSfi;
}

export interface RunChainInput {
  origin: string;                 // request origin, for internal /api/convert calls
  fileBase64: string;
  startFormat: FileFormat;
  chain: FileFormat[];            // full chain incl. start, e.g. [docx, pdf, md, docx]
}

/**
 * Execute the chain and return a full RoundTripReport. Chains must start with the
 * document's own format and every hop must be a supported conversion.
 */
export async function runChain({ origin, fileBase64, startFormat, chain }: RunChainInput) {
  if (chain[0] !== startFormat) throw new Error("Chain must start with the uploaded format");
  if (!isValidChain(chain)) throw new Error("Chain contains an unsupported conversion");
  if (chain.length > 6) throw new Error("Chain too long (max 5 hops)");

  const original: Artifact = { fmt: startFormat, bytes: Uint8Array.from(Buffer.from(fileBase64, "base64")) };
  let prev: Artifact = original;
  const hops: RoundTripHop[] = [];

  for (let i = 0; i < chain.length - 1; i++) {
    const from = chain[i];
    const to = chain[i + 1];
    const outBytes = await convertHop(origin, prev, to);
    const current: Artifact = { fmt: to, bytes: outBytes };

    // Two measurements per hop: local (vs previous) and cumulative (vs original).
    const [local, cumulative] = await Promise.all([
      scoreSfi(prev, current),
      scoreSfi(original, current),
    ]);

    hops.push({ index: i + 1, from, to, local, cumulative });
    prev = current;
  }

  return buildReport(chain, hops);
}
