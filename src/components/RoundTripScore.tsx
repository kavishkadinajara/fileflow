"use client";

/**
 * RoundTripScore — Gap 1 Priority 4.
 *
 * Chains two conversions (A→B→A) and shows per-step SFI scores to measure
 * how much fidelity is lost at each leg of the round trip.
 *
 * Renders inside the SfiScoreCard expanded section for supported pairs.
 */

import { cn } from "@/lib/utils";
import type { FileFormat } from "@/types";
import { ArrowRight, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepScore {
  sfi_score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  breakdown: {
    structural: { score: number };
    semantic:   { score: number };
    functional: { score: number };
  };
}

interface RoundTripResult {
  step1: StepScore;   // A → B
  step2: StepScore;   // B → A
  fidelity_retention: number; // step2.sfi_score / step1.sfi_score  (≤ 1)
}

const GRADE_COLOR: Record<string, string> = {
  A: "text-green-600 dark:text-green-400",
  B: "text-blue-600  dark:text-blue-400",
  C: "text-yellow-600 dark:text-yellow-400",
  D: "text-orange-600 dark:text-orange-400",
  F: "text-red-600   dark:text-red-400",
};

const GRADE_BG: Record<string, string> = {
  A: "bg-green-500/15 border-green-500/30",
  B: "bg-blue-500/15  border-blue-500/30",
  C: "bg-yellow-500/15 border-yellow-500/30",
  D: "bg-orange-500/15 border-orange-500/30",
  F: "bg-red-500/15   border-red-500/30",
};

// ─── SFI helpers (re-used logic from SfiScoreCard) ───────────────────────────

const EXT_MAP: Record<string, string> = {
  md: "md", html: "html", docx: "docx", pdf: "pdf", txt: "txt",
};
const MIME_MAP: Record<string, string> = {
  md:   "text/plain",
  html: "text/html",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf:  "application/pdf",
  txt:  "text/plain",
};

async function convertFile(
  blob: Blob,
  fileName: string,
  from: FileFormat,
  to: FileFormat,
): Promise<Blob> {
  const arr = await blob.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(arr)));
  const res = await fetch("/api/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileBase64: b64, fileName, fromFormat: from, toFormat: to }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Convert failed (${from}→${to}): ${res.status}`);
  }
  const { fileBase64 } = await res.json();
  const bytes = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: MIME_MAP[to] ?? "application/octet-stream" });
}

async function scoreBlobs(
  originalBlob: Blob,
  originalName: string,
  fromFmt: FileFormat,
  convertedBlob: Blob,
  toFmt: FileFormat,
): Promise<StepScore> {
  const srcExt  = EXT_MAP[fromFmt]  ?? "txt";
  const tgtExt  = EXT_MAP[toFmt]    ?? "txt";
  const srcMime = MIME_MAP[fromFmt] ?? "text/plain";
  const tgtMime = MIME_MAP[toFmt]   ?? "text/plain";

  const srcName = originalName.includes(".")
    ? originalName.replace(/\.[^.]+$/, `.${srcExt}`)
    : `source.${srcExt}`;

  const form = new FormData();
  form.append("original_file",  new File([originalBlob],  srcName,                     { type: srcMime }), srcName);
  form.append("converted_file", new File([convertedBlob], `converted.${tgtExt}`,       { type: tgtMime }), `converted.${tgtExt}`);

  const res = await fetch("/api/slm-score", { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? body.error ?? `Scoring failed: ${res.status}`);
  }
  return res.json() as Promise<StepScore>;
}

// ─── Mini score pill ──────────────────────────────────────────────────────────

function ScorePill({ grade, sfi }: { grade: string; sfi: number }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold", GRADE_BG[grade])}>
      <span className={GRADE_COLOR[grade]}>{grade}</span>
      <span className="text-muted-foreground font-mono">{Math.round(sfi * 100)}%</span>
    </span>
  );
}

// ─── Retention bar ────────────────────────────────────────────────────────────

function RetentionBar({ retention }: { retention: number }) {
  const pct = Math.round(retention * 100);
  const color =
    pct >= 85 ? "bg-green-500"  :
    pct >= 70 ? "bg-blue-500"   :
    pct >= 55 ? "bg-yellow-500" :
    pct >= 40 ? "bg-orange-500" : "bg-red-500";

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>Round-trip retention</span>
        <span className="font-mono font-medium">{pct}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface RoundTripScoreProps {
  sourceBlob: Blob;
  sourceName: string;
  fromFormat: FileFormat;
  toFormat:   FileFormat;
}

// Only show for format pairs where round-trip is meaningful (both directions supported)
const ROUND_TRIP_PAIRS: [FileFormat, FileFormat][] = [
  ["md",   "html"],
  ["md",   "docx"],
  ["html", "md"],
  ["html", "docx"],
  ["docx", "md"],
  ["docx", "html"],
];

export function supportsRoundTrip(from: FileFormat, to: FileFormat): boolean {
  return ROUND_TRIP_PAIRS.some(([a, b]) => a === from && b === to);
}

export function RoundTripScore({ sourceBlob, sourceName, fromFormat, toFormat }: RoundTripScoreProps) {
  const [result, setResult]     = useState<RoundTripResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // Step 1: A → B  (already done by the conversion job — but we re-run here
      // so this component is self-contained and doesn't rely on job.resultBlob)
      const convertedBlob = await convertFile(sourceBlob, sourceName, fromFormat, toFormat);

      // Step 2: B → A
      const returnBlob = await convertFile(
        convertedBlob,
        `converted.${EXT_MAP[toFormat] ?? "txt"}`,
        toFormat,
        fromFormat,
      );

      // Score step 1 (A → B)
      const score1 = await scoreBlobs(sourceBlob, sourceName, fromFormat, convertedBlob, toFormat);

      // Score step 2 (B → A) — compare original A vs returned A
      const score2 = await scoreBlobs(sourceBlob, sourceName, fromFormat, returnBlob, fromFormat);

      const retention = score1.sfi_score > 0 ? score2.sfi_score / score1.sfi_score : 0;

      setResult({ step1: score1, step2: score2, fidelity_retention: Math.min(retention, 1) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Round-trip scoring failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-md border border-violet-500/10 bg-violet-500/5 p-2.5 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <RotateCcw className="h-3 w-3 text-violet-500" />
          <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400">
            Round-Trip Score
          </span>
          <span className="text-[9px] text-muted-foreground">
            {fromFormat.toUpperCase()} → {toFormat.toUpperCase()} → {fromFormat.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {!result && !loading && (
            <button
              onClick={run}
              className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-600 dark:text-violet-400 hover:bg-violet-500/25 transition-colors"
            >
              Run
            </button>
          )}
          {result && (
            <>
              <button onClick={run} title="Re-run" className="text-muted-foreground hover:text-foreground">
                <RotateCcw className="h-2.5 w-2.5" />
              </button>
              <button onClick={() => setExpanded((o) => !o)} className="text-muted-foreground hover:text-foreground">
                {expanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <p className="text-[9px] text-muted-foreground animate-pulse">
          Running round-trip conversions and scoring…
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-[9px] text-destructive">{error}</p>
      )}

      {/* Result summary */}
      {result && (
        <div className="space-y-1.5">
          {/* Chain visualization */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] text-muted-foreground font-mono">{fromFormat.toUpperCase()}</span>
            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
            <ScorePill grade={result.step1.grade} sfi={result.step1.sfi_score} />
            <span className="text-[9px] text-muted-foreground font-mono">{toFormat.toUpperCase()}</span>
            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
            <ScorePill grade={result.step2.grade} sfi={result.step2.sfi_score} />
            <span className="text-[9px] text-muted-foreground font-mono">{fromFormat.toUpperCase()}</span>
          </div>

          {/* Retention bar */}
          <RetentionBar retention={result.fidelity_retention} />

          {/* Per-step breakdown (expandable) */}
          {expanded && (
            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-violet-500/10">
              {([
                { label: `Step 1: ${fromFormat.toUpperCase()}→${toFormat.toUpperCase()}`, s: result.step1 },
                { label: `Step 2: ${toFormat.toUpperCase()}→${fromFormat.toUpperCase()}`, s: result.step2 },
              ] as const).map(({ label, s }) => (
                <div key={label} className="space-y-0.5">
                  <p className="text-[9px] font-medium text-muted-foreground">{label}</p>
                  {(["structural", "semantic", "functional"] as const).map((dim) => (
                    <div key={dim} className="flex justify-between text-[9px]">
                      <span className="text-muted-foreground capitalize">{dim}</span>
                      <span className="font-mono">{Math.round(s.breakdown[dim].score * 100)}%</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
