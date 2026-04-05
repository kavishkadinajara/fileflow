"use client";

/**
 * SfiScoreCard — displays the Semantic Fidelity Index result for a completed
 * conversion job.  Rendered inside JobCard (JobList.tsx) after the user clicks
 * "Score conversion quality".
 *
 * Data flow:
 *   1. User clicks the Score button on a done JobCard.
 *   2. Component sends both the original source file and the converted result
 *      blob to POST /api/slm-score as multipart/form-data.
 *   3. The Next.js proxy forwards the request to the Python FastAPI backend.
 *   4. The response is rendered as a radar-style breakdown + grade badge.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ConversionJob } from "@/types";
import { BarChart3, ChevronDown, ChevronUp, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SfiDimension {
  score: number;
  weight: number;
  weighted: number;
  details: Record<string, number | string>;
}

interface SfiResult {
  sfi_score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  breakdown: {
    structural: SfiDimension;
    semantic: SfiDimension;
    functional: SfiDimension;
  };
  conversion_pair: { source_format: string; target_format: string };
  processing_time_ms: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GRADE_STYLES: Record<string, string> = {
  A: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  B: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  C: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  D: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  F: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
};

const GRADE_LABELS: Record<string, string> = {
  A: "Excellent",
  B: "Good",
  C: "Fair",
  D: "Poor",
  F: "Very Poor",
};

function ScoreBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", className)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono w-8 text-right text-muted-foreground">{pct}%</span>
    </div>
  );
}

function DimensionRow({
  label,
  dim,
  barColor,
}: {
  label: string;
  dim: SfiDimension;
  barColor: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors"
        >
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {label}
          <span className="text-muted-foreground font-normal ml-1">
            (w={dim.weight})
          </span>
        </button>
        <span className="font-mono text-foreground">{Math.round(dim.score * 100)}%</span>
      </div>
      <ScoreBar value={dim.score} className={barColor} />
      {open && (
        <div className="mt-1.5 rounded-md bg-muted/50 p-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
          {Object.entries(dim.details).map(([k, v]) => (
            <div key={k} className="flex justify-between text-[10px]">
              <span className="text-muted-foreground">{k.replace(/_/g, " ")}</span>
              <span className="font-mono text-foreground">
                {typeof v === "number" ? (v % 1 !== 0 ? v.toFixed(3) : v) : v}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SfiScoreCardProps {
  /** The completed conversion job. resultBlob holds the converted file. */
  job: ConversionJob;
  /**
   * The original source file as a File object.
   * Pass this from the FileUploader or store where you keep the raw upload.
   * If unavailable, pass null — scoring will be skipped with a helpful message.
   */
  sourceFile: File | null;
}

export function SfiScoreCard({ job, sourceFile }: SfiScoreCardProps) {
  const [result, setResult] = useState<SfiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function runScore() {
    if (!job.resultBlob) return;
    if (!sourceFile) {
      setError("Original source file is not available for comparison.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ext = job.fileName.includes(".") ? job.fileName.split(".").pop() : "txt";
      const convertedExt = job.toFormat === "md" ? "md"
        : job.toFormat === "html" ? "html"
        : job.toFormat === "docx" ? "docx"
        : job.toFormat === "pdf" ? "pdf"
        : job.toFormat === "txt" ? "txt"
        : ext;

      const convertedFile = new File(
        [job.resultBlob],
        `converted.${convertedExt}`,
        { type: job.resultBlob.type },
      );

      const form = new FormData();
      form.append("original_file",  sourceFile,    sourceFile.name);
      form.append("converted_file", convertedFile, convertedFile.name);

      const res = await fetch("/api/slm-score", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${res.status}`);
      }
      const data: SfiResult = await res.json();
      setResult(data);
      setExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  // ── Collapsed state: just the trigger button ──────────────────────────────
  if (!result) {
    return (
      <div className="mt-2">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1.5 border-violet-500/30 text-violet-700 dark:text-violet-400 hover:bg-violet-500/10"
          onClick={runScore}
          disabled={loading || !sourceFile}
          title={!sourceFile ? "Source file not available" : "Score semantic fidelity of this conversion"}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <BarChart3 className="h-3 w-3" />
          )}
          {loading ? "Scoring…" : "Score quality (SFI)"}
        </Button>
        {error && (
          <p className="mt-1 text-[10px] text-destructive">{error}</p>
        )}
      </div>
    );
  }

  // ── Expanded state: full score card ──────────────────────────────────────
  const { sfi_score, grade, breakdown, processing_time_ms } = result;
  const pct = Math.round(sfi_score * 100);

  return (
    <div className="mt-2 rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          <span className="text-xs font-semibold text-violet-700 dark:text-violet-400">
            Semantic Fidelity Index
          </span>
        </div>
        <button
          onClick={() => setExpanded((o) => !o)}
          className="text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Composite score + grade */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center justify-center h-14 w-14 rounded-full border-2 border-violet-500/30 bg-background shrink-0">
          <span className="text-lg font-bold leading-none text-foreground">{pct}</span>
          <span className="text-[9px] text-muted-foreground mt-0.5">/ 100</span>
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("text-base font-bold px-2.5 py-0.5 h-7 border", GRADE_STYLES[grade])}
            >
              {grade}
            </Badge>
            <span className="text-xs text-muted-foreground">{GRADE_LABELS[grade]}</span>
          </div>
          <ScoreBar
            value={sfi_score}
            className={
              grade === "A" ? "bg-green-500"
              : grade === "B" ? "bg-blue-500"
              : grade === "C" ? "bg-yellow-500"
              : grade === "D" ? "bg-orange-500"
              : "bg-red-500"
            }
          />
          <p className="text-[10px] text-muted-foreground">
            {result.conversion_pair.source_format.toUpperCase()} →{" "}
            {result.conversion_pair.target_format.toUpperCase()} · {processing_time_ms}ms
          </p>
        </div>
      </div>

      {/* Dimension breakdown */}
      {expanded && (
        <div className="space-y-2.5 pt-1 border-t border-violet-500/15">
          <DimensionRow
            label="Structural"
            dim={breakdown.structural}
            barColor="bg-blue-500"
          />
          <DimensionRow
            label="Semantic"
            dim={breakdown.semantic}
            barColor="bg-violet-500"
          />
          <DimensionRow
            label="Functional"
            dim={breakdown.functional}
            barColor="bg-emerald-500"
          />
        </div>
      )}
    </div>
  );
}
