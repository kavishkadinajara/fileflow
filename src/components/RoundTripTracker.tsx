"use client";

/**
 * Round-Trip Fidelity Tracker — the research-grade tool for gap 10 (round-trip
 * conversion degradation is unmeasured).
 *
 * Upload a document, build a conversion chain (A→B→C→…), and the tool converts
 * through every hop and measures fidelity two ways at each step:
 *   • LOCAL     — this hop vs the previous artifact (how bad was this leg)
 *   • CUMULATIVE — this hop vs the ORIGINAL (total drift so far)
 * The degradation curve plots both, so the compounding, silent loss that no
 * single-conversion score reveals becomes visible. A path recommender then
 * suggests the least-lossy route between two formats.
 */
import { Button } from "@/components/ui/button";
import { fileToBase64 } from "@/lib/utils";
import {
  RT_FORMATS,
  RT_EDGES,
  canConvert,
  isValidChain,
  type RoundTripReport,
  type PathSuggestion,
} from "@/lib/roundtrip/analysis";
import type { FileFormat } from "@/types";
import {
  ArrowRight, Upload, X, Loader2, RotateCcw, Plus, TriangleAlert, Route, FileText,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

// Only these document formats round-trip.
const START_FORMATS = RT_FORMATS;

function gradeColor(sfi: number): string {
  if (sfi >= 0.85) return "#10b981";
  if (sfi >= 0.70) return "#3b82f6";
  if (sfi >= 0.55) return "#f59e0b";
  if (sfi >= 0.40) return "#f97316";
  return "#ef4444";
}
function detectFormat(name: string): FileFormat | null {
  const ext = name.split(".").pop()?.toLowerCase();
  return (START_FORMATS as string[]).includes(ext ?? "") ? (ext as FileFormat) : null;
}

// ── Degradation curve (dependency-free SVG) ────────────────────────────────────

function DegradationCurve({ report }: { report: RoundTripReport }) {
  const W = 640, H = 220, padX = 40, padY = 28;
  const pts = report.curve;
  const n = pts.length;
  const x = (i: number) => padX + (i / Math.max(1, n - 1)) * (W - padX * 2);
  const y = (v: number) => H - padY - v * (H - padY * 2);
  const line = (key: "cumulative" | "local") =>
    pts.map((p, i) => `${x(i)},${y(p[key])}`).join(" ");

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Fidelity degradation curve</h3>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-primary" /> Cumulative (vs original)</span>
          <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-amber-400" /> Local (per hop)</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <g key={g}>
            <line x1={padX} x2={W - padX} y1={y(g)} y2={y(g)} className="stroke-muted/40" strokeWidth="1" />
            <text x={padX - 6} y={y(g) + 3} textAnchor="end" className="fill-muted-foreground" fontSize="9">{Math.round(g * 100)}</text>
          </g>
        ))}
        {/* local (per-hop) line — dashed */}
        <polyline points={line("local")} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" strokeLinejoin="round" opacity="0.8" />
        {/* cumulative line — solid, filled area */}
        <polyline
          points={`${padX},${y(0)} ${line("cumulative")} ${W - padX},${y(0)}`}
          fill="hsl(var(--primary))" opacity="0.06"
        />
        <polyline points={line("cumulative")} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.cumulative)} r="4" fill={gradeColor(p.cumulative)} />
            <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-muted-foreground" fontSize="9">
              {i === 0 ? "orig" : report.chain[i]?.toUpperCase()}
            </text>
          </g>
        ))}
      </svg>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        The gap between the two lines is the tell: when <strong>cumulative</strong> (solid) drops well below
        <strong> local</strong> (dashed), each hop looks fine on its own while meaning quietly compounds away.
      </p>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────────

export function RoundTripTracker() {
  const [file, setFile] = useState<File | null>(null);
  const [startFormat, setStartFormat] = useState<FileFormat>("docx");
  const [chain, setChain] = useState<FileFormat[]>(["docx", "pdf", "docx"]);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<RoundTripReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recs, setRecs] = useState<PathSuggestion[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const chainValid = useMemo(() => isValidChain(chain), [chain]);
  const lastFormat = chain[chain.length - 1];
  const nextOptions = useMemo(() => RT_EDGES[lastFormat] ?? [], [lastFormat]);

  function pickFile(f: File | null) {
    if (!f) return;
    const fmt = detectFormat(f.name);
    if (!fmt) { setError("Upload a MD, HTML, DOCX, PDF or TXT document."); return; }
    setError(null);
    setFile(f);
    setStartFormat(fmt);
    setChain([fmt]);            // reset chain to start from this format
    setReport(null);
  }

  function addHop(fmt: FileFormat) {
    setChain((c) => [...c, fmt]);
    setReport(null);
  }
  function resetChain() {
    setChain([startFormat]);
    setReport(null);
  }
  function makeRoundTrip() {
    // Append hops back to the start format if not already there.
    if (chain.length >= 2 && lastFormat !== startFormat && canConvert(lastFormat, startFormat)) {
      setChain((c) => [...c, startFormat]);
      setReport(null);
    }
  }

  async function run() {
    if (!file || !chainValid || chain.length < 2) return;
    setRunning(true); setError(null); setReport(null);
    try {
      const fileBase64 = await fileToBase64(file);
      const res = await fetch("/api/roundtrip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "run", fileBase64, startFormat, chain }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Analysis failed");
      setReport(data.report as RoundTripReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setRunning(false);
    }
  }

  async function loadRecommendations() {
    const res = await fetch("/api/roundtrip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "recommend", start: startFormat, end: startFormat, maxHops: 4 }),
    });
    const data = await res.json();
    if (data.success) setRecs(data.paths as PathSuggestion[]);
  }

  return (
    <div className="space-y-6">
      {/* Upload */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0] ?? null); }}
        className="flex flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
      >
        <input ref={fileRef} type="file" accept=".md,.html,.docx,.pdf,.txt" className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
        {file ? (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-medium truncate max-w-[240px]">{file.name}</span>
            <button onClick={(e) => { e.stopPropagation(); setFile(null); setReport(null); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Drop a document (MD, HTML, DOCX, PDF, TXT)</p>
          </>
        )}
      </div>

      {/* Chain builder */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Conversion chain</h3>
          <div className="flex items-center gap-2">
            <button onClick={makeRoundTrip} disabled={lastFormat === startFormat || !canConvert(lastFormat, startFormat)}
              className="text-[11px] text-primary hover:underline disabled:opacity-40 disabled:no-underline">
              Close the loop →{startFormat.toUpperCase()}
            </button>
            <button onClick={resetChain} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>
        </div>

        {/* Chain visual */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {chain.map((f, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${i === 0 ? "bg-primary/15 text-primary" : "bg-muted"}`}>
                {f.toUpperCase()}
              </span>
              {i < chain.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
            </span>
          ))}
        </div>

        {/* Add next hop */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-muted-foreground">Add hop:</span>
          {nextOptions.map((f) => (
            <button key={f} onClick={() => addHop(f)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] hover:border-primary/40 hover:text-primary transition-colors">
              <Plus className="h-2.5 w-2.5" /> {f.toUpperCase()}
            </button>
          ))}
          {chain.length > 5 && <span className="text-[11px] text-amber-500">max 5 hops</span>}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button onClick={run} disabled={!file || !chainValid || chain.length < 2 || running || chain.length > 6} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Route className="h-4 w-4" />}
            Measure fidelity
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Converts through every hop and scores each with the Semantic Fidelity Index.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      {running && (
        <p className="text-xs text-muted-foreground animate-pulse">
          Running {chain.length - 1} conversion{chain.length - 1 === 1 ? "" : "s"} and scoring each hop… this can take a moment (embeddings).
        </p>
      )}

      {/* Report */}
      {report && (
        <div className="space-y-5 animate-fade-up">
          {/* Verdict */}
          <div className={`rounded-2xl border p-5 flex items-center gap-4 ${report.finalFidelity >= 0.7
            ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
            <div className="text-center shrink-0">
              <div className="text-4xl font-bold tabular-nums" style={{ color: gradeColor(report.finalFidelity) }}>
                {Math.round(report.finalFidelity * 100)}%
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">final fidelity</div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{report.verdict}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Compounded per-hop retention: <strong>{Math.round(report.compoundedLocal * 100)}%</strong>
                {report.worstHop && report.worstHop.drop > 0.01 && (
                  <> · biggest drop at <strong>{report.worstHop.from.toUpperCase()}→{report.worstHop.to.toUpperCase()}</strong> (−{Math.round(report.worstHop.drop * 100)} pts)</>
                )}
              </p>
            </div>
          </div>

          <DegradationCurve report={report} />

          {/* Per-hop table */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b">
              <h3 className="text-sm font-semibold">Per-hop breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground text-[10px] uppercase tracking-wide">
                    <th className="text-left font-medium px-4 py-2">Hop</th>
                    <th className="text-right font-medium px-2 py-2">Local</th>
                    <th className="text-right font-medium px-2 py-2">Cumulative</th>
                    <th className="text-right font-medium px-2 py-2">Struct</th>
                    <th className="text-right font-medium px-2 py-2">Semantic</th>
                    <th className="text-right font-medium px-4 py-2">Funct</th>
                  </tr>
                </thead>
                <tbody>
                  {report.hops.map((h) => (
                    <tr key={h.index} className="border-t">
                      <td className="px-4 py-2 font-medium whitespace-nowrap">{h.from.toUpperCase()} → {h.to.toUpperCase()}</td>
                      <td className="px-2 py-2 text-right tabular-nums" style={{ color: gradeColor(h.local.sfi_score) }}>{Math.round(h.local.sfi_score * 100)}%</td>
                      <td className="px-2 py-2 text-right tabular-nums font-semibold" style={{ color: gradeColor(h.cumulative.sfi_score) }}>{Math.round(h.cumulative.sfi_score * 100)}%</td>
                      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{Math.round(h.cumulative.breakdown.structural.score * 100)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{Math.round(h.cumulative.breakdown.semantic.score * 100)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{Math.round(h.cumulative.breakdown.functional.score * 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Path recommender */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Route className="h-4 w-4 text-primary" /> Safe round-trip paths for {startFormat.toUpperCase()}
          </h3>
          {!recs && (
            <button onClick={loadRecommendations} className="text-[11px] text-primary hover:underline">Show</button>
          )}
        </div>
        {recs && (
          <div className="space-y-1.5">
            {recs.map((r) => (
              <button
                key={r.path.join(">")}
                onClick={() => { setChain(r.path); setReport(null); }}
                className="w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left hover:border-primary/40 transition-colors"
              >
                <span className="flex items-center gap-1 text-xs font-medium flex-wrap">
                  {r.path.map((f, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {f.toUpperCase()}{i < r.path.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                    </span>
                  ))}
                </span>
                <span className="text-[11px] tabular-nums shrink-0" style={{ color: gradeColor(r.predictedRetention) }}>
                  ~{Math.round(r.predictedRetention * 100)}% predicted
                </span>
              </button>
            ))}
            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 pt-1">
              <TriangleAlert className="h-3 w-3 text-amber-500" />
              Predictions use an a-priori loss model. Click a path to load it, then measure it for real.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
