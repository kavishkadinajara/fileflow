"use client";

/**
 * SfiScoreCard — Semantic Fidelity Index result card.
 *
 * Changes from v1:
 *  - Auto-runs scoring as soon as the component mounts (no manual button).
 *  - Score bars replaced with a pure-SVG radar chart (no extra dependency).
 *  - Expandable raw-details table kept below the radar.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ConversionJob } from "@/types";
import { ChevronDown, ChevronUp, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Grade config ─────────────────────────────────────────────────────────────

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

const GRADE_FILL: Record<string, string> = {
  A: "rgba(34,197,94,0.25)",
  B: "rgba(59,130,246,0.25)",
  C: "rgba(234,179,8,0.25)",
  D: "rgba(249,115,22,0.25)",
  F: "rgba(239,68,68,0.25)",
};

const GRADE_STROKE: Record<string, string> = {
  A: "rgb(34,197,94)",
  B: "rgb(59,130,246)",
  C: "rgb(234,179,8)",
  D: "rgb(249,115,22)",
  F: "rgb(239,68,68)",
};

// ─── Pure-SVG radar chart ─────────────────────────────────────────────────────

interface RadarPoint { label: string; value: number; color: string }

function RadarChart({ points, grade }: { points: RadarPoint[]; grade: string }) {
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r  = size * 0.38;
  const n  = points.length;

  // Convert polar → cartesian. Angle starts at top (-90°).
  function polar(i: number, radius: number) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  }

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Axes
  const axes = points.map((_, i) => polar(i, r));

  // Data polygon
  const dataCoords = points.map((p, i) => polar(i, r * Math.max(p.value, 0.02)));
  const dataPath   = dataCoords.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";

  // Label positions (slightly outside the outer ring)
  const labelCoords = points.map((_, i) => polar(i, r * 1.28));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      {/* Grid rings */}
      {rings.map((frac) => {
        const pts = points.map((_, i) => polar(i, r * frac));
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
        return (
          <path
            key={frac}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.12}
            strokeWidth={1}
          />
        );
      })}

      {/* Axis spokes */}
      {axes.map((pt, i) => (
        <line
          key={i}
          x1={cx} y1={cy}
          x2={pt.x.toFixed(1)} y2={pt.y.toFixed(1)}
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={1}
        />
      ))}

      {/* Data polygon */}
      <path
        d={dataPath}
        fill={GRADE_FILL[grade]}
        stroke={GRADE_STROKE[grade]}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Data dots */}
      {dataCoords.map((pt, i) => (
        <circle
          key={i}
          cx={pt.x} cy={pt.y} r={3}
          fill={points[i].color}
          stroke="var(--background)"
          strokeWidth={1.5}
        />
      ))}

      {/* Labels */}
      {labelCoords.map((pt, i) => (
        <text
          key={i}
          x={pt.x} y={pt.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={9}
          fill="currentColor"
          fillOpacity={0.7}
          fontFamily="inherit"
        >
          {points[i].label}
        </text>
      ))}

      {/* Centre score */}
      <text
        x={cx} y={cy - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={18}
        fontWeight="700"
        fill="currentColor"
        fontFamily="inherit"
      >
        {Math.round(points.reduce((acc, p) => acc + p.value, 0) / points.length * 100)}
      </text>
      <text
        x={cx} y={cy + 10}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={7.5}
        fill="currentColor"
        fillOpacity={0.5}
        fontFamily="inherit"
      >
        avg %
      </text>
    </svg>
  );
}

// ─── Details table ────────────────────────────────────────────────────────────

function DimensionDetails({
  label,
  dim,
  dotColor,
}: {
  label: string;
  dim: SfiDimension;
  dotColor: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: dotColor }} />
        <span className="font-medium">{label}</span>
        <span className="font-mono ml-auto">{Math.round(dim.score * 100)}%</span>
        {open ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
      </button>
      {open && (
        <div className="mt-1 rounded bg-muted/40 p-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5">
          {Object.entries(dim.details).map(([k, v]) => (
            <div key={k} className="flex justify-between text-[9px]">
              <span className="text-muted-foreground truncate">{k.replace(/_/g, " ")}</span>
              <span className="font-mono text-foreground ml-1 shrink-0">
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
  job: ConversionJob;
  sourceFile: File | null;
}

export function SfiScoreCard({ job, sourceFile }: SfiScoreCardProps) {
  const [result, setResult]   = useState<SfiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const ranRef = useRef(false);

  // ── Auto-run on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    if (!job.resultBlob || !sourceFile) return;

    async function run() {
      setLoading(true);
      try {
        const convertedExt =
          job.toFormat === "md"   ? "md"   :
          job.toFormat === "html" ? "html" :
          job.toFormat === "docx" ? "docx" :
          job.toFormat === "pdf"  ? "pdf"  : "txt";

        const convertedFile = new File(
          [job.resultBlob!],
          `converted.${convertedExt}`,
          { type: job.resultBlob!.type },
        );

        const form = new FormData();
        form.append("original_file",  sourceFile!,   sourceFile!.name);
        form.append("converted_file", convertedFile, convertedFile.name);

        const res = await fetch("/api/slm-score", { method: "POST", body: form });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Server error ${res.status}`);
        }
        setResult(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Scoring failed");
      } finally {
        setLoading(false);
      }
    }

    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500 shrink-0" />
        <span className="text-xs text-violet-600 dark:text-violet-400">Scoring semantic fidelity…</span>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="mt-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-[10px] text-destructive">
        SFI: {error}
      </div>
    );
  }

  // ── No result yet (sourceFile missing) ───────────────────────────────────
  if (!result) return null;

  // ── Result card ───────────────────────────────────────────────────────────
  const { sfi_score, grade, breakdown, processing_time_ms } = result;

  const radarPoints = [
    { label: "Structural", value: breakdown.structural.score, color: "rgb(59,130,246)"  },
    { label: "Semantic",   value: breakdown.semantic.score,   color: "rgb(139,92,246)"  },
    { label: "Functional", value: breakdown.functional.score, color: "rgb(16,185,129)"  },
  ];

  return (
    <div className="mt-2 rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
          <span className="text-[11px] font-semibold text-violet-700 dark:text-violet-400">
            Semantic Fidelity Index
          </span>
        </div>
        <button
          onClick={() => setExpanded((o) => !o)}
          className="text-muted-foreground hover:text-foreground"
        >
          {expanded
            ? <ChevronUp className="h-3 w-3" />
            : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Radar + grade (always visible) */}
      <div className="flex items-center gap-3">
        <RadarChart points={radarPoints} grade={grade} />

        <div className="flex-1 space-y-2">
          {/* Grade badge */}
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("text-lg font-bold px-2.5 py-0.5 h-8 border", GRADE_STYLES[grade])}
            >
              {grade}
            </Badge>
            <div>
              <p className="text-xs font-medium leading-none">{GRADE_LABELS[grade]}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {Math.round(sfi_score * 100)} / 100
              </p>
            </div>
          </div>

          {/* Dimension summary pills */}
          <div className="flex flex-col gap-1">
            {radarPoints.map((p) => (
              <div key={p.label} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ background: p.color }}
                />
                <span className="text-[10px] text-muted-foreground w-16">{p.label}</span>
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.round(p.value * 100)}%`, background: p.color }}
                  />
                </div>
                <span className="text-[10px] font-mono w-7 text-right text-muted-foreground">
                  {Math.round(p.value * 100)}%
                </span>
              </div>
            ))}
          </div>

          <p className="text-[9px] text-muted-foreground">
            {result.conversion_pair.source_format.toUpperCase()} →{" "}
            {result.conversion_pair.target_format.toUpperCase()} · {processing_time_ms}ms
          </p>
        </div>
      </div>

      {/* Expandable dimension details */}
      {expanded && (
        <div className="space-y-1.5 pt-1.5 border-t border-violet-500/15">
          <DimensionDetails label="Structural" dim={breakdown.structural} dotColor="rgb(59,130,246)"  />
          <DimensionDetails label="Semantic"   dim={breakdown.semantic}   dotColor="rgb(139,92,246)"  />
          <DimensionDetails label="Functional" dim={breakdown.functional} dotColor="rgb(16,185,129)"  />
        </div>
      )}
    </div>
  );
}
