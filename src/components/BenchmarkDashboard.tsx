"use client";

import { cn } from "@/lib/utils";
import { AlertCircle, BarChart3, Clock, FileText, RefreshCw, ShieldCheck, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BenchmarkRow {
  file: string;
  src_format: string;
  tgt_format: string;
  sfi_score: number;
  grade: string;
  structural: number;
  semantic: number;
  functional: number;
  processing_ms: number;
  error: string;
}

interface PairSummary {
  pair: string;
  src: string;
  tgt: string;
  n: number;
  mean_sfi: number;
  mean_structural: number;
  mean_semantic: number;
  mean_functional: number;
  mean_ms: number;
  grade: string;
  grade_dist: Record<string, number>;
}

// ─── Grade config ─────────────────────────────────────────────────────────────

const GRADE_COLOR: Record<string, string> = {
  A: "text-green-600 dark:text-green-400",
  B: "text-blue-600 dark:text-blue-400",
  C: "text-yellow-600 dark:text-yellow-400",
  D: "text-orange-600 dark:text-orange-400",
  F: "text-red-600 dark:text-red-400",
};
const GRADE_BG: Record<string, string> = {
  A: "bg-green-500/15 border-green-500/30",
  B: "bg-blue-500/15 border-blue-500/30",
  C: "bg-yellow-500/15 border-yellow-500/30",
  D: "bg-orange-500/15 border-orange-500/30",
  F: "bg-red-500/15 border-red-500/30",
};
const GRADE_BAR: Record<string, string> = {
  A: "bg-green-500",
  B: "bg-blue-500",
  C: "bg-yellow-500",
  D: "bg-orange-500",
  F: "bg-red-500",
};

function gradeFromSfi(sfi: number): string {
  if (sfi >= 0.85) return "A";
  if (sfi >= 0.70) return "B";
  if (sfi >= 0.55) return "C";
  if (sfi >= 0.40) return "D";
  return "F";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function buildPairSummaries(rows: BenchmarkRow[]): PairSummary[] {
  const ok = rows.filter((r) => !r.error && r.sfi_score > 0);
  const groups: Record<string, BenchmarkRow[]> = {};
  for (const r of ok) {
    const key = `${r.src_format}→${r.tgt_format}`;
    (groups[key] ??= []).push(r);
  }
  return Object.entries(groups)
    .map(([pair, rs]) => {
      const mean_sfi = avg(rs.map((r) => r.sfi_score));
      const dist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
      rs.forEach((r) => { dist[r.grade] = (dist[r.grade] ?? 0) + 1; });
      return {
        pair,
        src: rs[0].src_format,
        tgt: rs[0].tgt_format,
        n: rs.length,
        mean_sfi,
        mean_structural: avg(rs.map((r) => r.structural)),
        mean_semantic:   avg(rs.map((r) => r.semantic)),
        mean_functional: avg(rs.map((r) => r.functional)),
        mean_ms:         avg(rs.map((r) => r.processing_ms)),
        grade: gradeFromSfi(mean_sfi),
        grade_dist: dist,
      };
    })
    .sort((a, b) => b.mean_sfi - a.mean_sfi);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", color)} />
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className={cn("text-2xl font-bold font-mono", color)}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function SfiBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

function GradeDistBar({ dist, n }: { dist: Record<string, number>; n: number }) {
  const grades = ["A", "B", "C", "D", "F"];
  return (
    <div className="flex h-1.5 w-full rounded-full overflow-hidden gap-px">
      {grades.map((g) => {
        const count = dist[g] ?? 0;
        const pct = n > 0 ? (count / n) * 100 : 0;
        if (pct === 0) return null;
        return (
          <div
            key={g}
            className={cn("h-full", GRADE_BAR[g])}
            style={{ width: `${pct}%` }}
            title={`${g}: ${count}`}
          />
        );
      })}
    </div>
  );
}

function PairCard({ s }: { s: PairSummary }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 hover:border-primary/30 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold">
            {s.src.toUpperCase()}
          </span>
          <span className="text-muted-foreground text-xs">→</span>
          <span className="font-mono text-xs font-semibold">
            {s.tgt.toUpperCase()}
          </span>
        </div>
        <div className={cn("flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-bold", GRADE_BG[s.grade])}>
          <span className={GRADE_COLOR[s.grade]}>{s.grade}</span>
          <span className="font-mono text-muted-foreground">{Math.round(s.mean_sfi * 100)}%</span>
        </div>
      </div>

      {/* Dimension bars */}
      <div className="space-y-1.5">
        {([
          ["Structural", s.mean_structural, "bg-blue-500"],
          ["Semantic",   s.mean_semantic,   "bg-violet-500"],
          ["Functional", s.mean_functional, "bg-emerald-500"],
        ] as [string, number, string][]).map(([label, val, color]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-[9px] text-muted-foreground w-16">{label}</span>
            <SfiBar value={val} color={color} />
          </div>
        ))}
      </div>

      {/* Grade distribution + stats */}
      <div className="space-y-1">
        <GradeDistBar dist={s.grade_dist} n={s.n} />
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>{s.n} file{s.n !== 1 ? "s" : ""}</span>
          <span>{Math.round(s.mean_ms)}ms avg</span>
        </div>
      </div>
    </div>
  );
}

function FileTable({ rows }: { rows: BenchmarkRow[] }) {
  const [sort, setSort] = useState<"sfi" | "file" | "pair">("sfi");
  const [filter, setFilter] = useState("");

  const sorted = [...rows]
    .filter((r) =>
      !filter ||
      r.file.toLowerCase().includes(filter.toLowerCase()) ||
      `${r.src_format}→${r.tgt_format}`.includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === "sfi")  return b.sfi_score - a.sfi_score;
      if (sort === "file") return a.file.localeCompare(b.file);
      return `${a.src_format}→${a.tgt_format}`.localeCompare(`${b.src_format}→${b.tgt_format}`);
    });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter by file or pair…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Sort:</span>
          {(["sfi", "file", "pair"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={cn(
                "px-2 py-1 rounded transition-colors",
                sort === s ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">File</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Pair</th>
              <th className="px-3 py-2 font-medium text-muted-foreground text-center">Grade</th>
              <th className="px-3 py-2 font-medium text-muted-foreground text-right">SFI</th>
              <th className="px-3 py-2 font-medium text-muted-foreground text-right hidden sm:table-cell">Struct</th>
              <th className="px-3 py-2 font-medium text-muted-foreground text-right hidden sm:table-cell">Sem</th>
              <th className="px-3 py-2 font-medium text-muted-foreground text-right hidden sm:table-cell">Func</th>
              <th className="px-3 py-2 font-medium text-muted-foreground text-right hidden md:table-cell">ms</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr
                key={i}
                className={cn(
                  "border-b last:border-0 transition-colors",
                  i % 2 === 0 ? "" : "bg-muted/20",
                  r.error ? "opacity-50" : "hover:bg-muted/30"
                )}
              >
                <td className="px-3 py-2 font-mono truncate max-w-[140px]">{r.file}</td>
                <td className="px-3 py-2 font-mono text-muted-foreground">
                  {r.src_format}→{r.tgt_format}
                </td>
                <td className="px-3 py-2 text-center">
                  {r.error ? (
                    <span className="text-destructive text-[9px]">ERR</span>
                  ) : (
                    <span className={cn("font-bold", GRADE_COLOR[r.grade])}>{r.grade}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {r.error ? "—" : (r.sfi_score * 100).toFixed(1) + "%"}
                </td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground hidden sm:table-cell">
                  {r.error ? "—" : Math.round(r.structural * 100) + "%"}
                </td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground hidden sm:table-cell">
                  {r.error ? "—" : Math.round(r.semantic * 100) + "%"}
                </td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground hidden sm:table-cell">
                  {r.error ? "—" : Math.round(r.functional * 100) + "%"}
                </td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground hidden md:table-cell">
                  {r.error ? "—" : Math.round(r.processing_ms)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground">{sorted.length} rows</p>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function BenchmarkDashboard() {
  const [rows, setRows]         = useState<BenchmarkRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/benchmark-results");
      if (res.status === 404) {
        setError("no_file");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(data.rows ?? []);
      setGeneratedAt(data.generated_at ? new Date(data.generated_at).toLocaleString() : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2 text-sm">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading benchmark results…
      </div>
    );
  }

  // ── No file yet ───────────────────────────────────────────────────────────
  if (error === "no_file") {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center space-y-4">
        <BarChart3 className="h-10 w-10 text-muted-foreground/40 mx-auto" />
        <h2 className="font-semibold text-lg">No benchmark results yet</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Run the benchmark script to generate results. Requires both servers running.
        </p>
        <div className="rounded-lg bg-muted/50 p-4 text-left text-xs font-mono space-y-1 max-w-lg mx-auto">
          <p className="text-muted-foreground"># Terminal 1 — Python backend</p>
          <p>cd python_backend && .venv\Scripts\Activate.ps1</p>
          <p>python -m uvicorn app.main:app --reload</p>
          <p className="text-muted-foreground mt-2"># Terminal 2 — Generate + benchmark</p>
          <p>python scripts/generate_fixtures.py --formats docx pdf</p>
          <p>python scripts/benchmark.py</p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center gap-2 text-destructive text-sm py-8">
        <AlertCircle className="h-4 w-4" />
        {error}
      </div>
    );
  }

  const ok   = rows.filter((r) => !r.error && r.sfi_score > 0);
  const errs = rows.filter((r) => !!r.error);
  const pairs = buildPairSummaries(rows);

  const overallSfi   = avg(ok.map((r) => r.sfi_score));
  const overallGrade = gradeFromSfi(overallSfi);
  const avgMs        = avg(ok.map((r) => r.processing_ms));
  const bestPair     = pairs[0];
  const worstPair    = pairs[pairs.length - 1];

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-violet-500" />
            <h1 className="text-2xl font-bold tracking-tight">SFI Benchmark</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            ConvertBench results — {ok.length} conversions across {pairs.length} format pairs
          </p>
          {generatedAt && (
            <p className="text-[11px] text-muted-foreground">Last run: {generatedAt}</p>
          )}
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Overall SFI"
          value={`${Math.round(overallSfi * 100)}%`}
          sub={`Grade ${overallGrade} — ${ok.length} conversions`}
          icon={TrendingUp}
          color={GRADE_COLOR[overallGrade]}
        />
        <StatCard
          label="Format Pairs"
          value={String(pairs.length)}
          sub={`${rows.length} total runs`}
          icon={BarChart3}
          color="text-primary"
        />
        <StatCard
          label="Best Pair"
          value={bestPair ? `${Math.round(bestPair.mean_sfi * 100)}%` : "—"}
          sub={bestPair?.pair}
          icon={ShieldCheck}
          color="text-green-600 dark:text-green-400"
        />
        <StatCard
          label="Avg Scoring Time"
          value={`${Math.round(avgMs)}ms`}
          sub={errs.length > 0 ? `${errs.length} error(s)` : "0 errors"}
          icon={Clock}
          color="text-muted-foreground"
        />
      </div>

      {/* Pair cards grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5" />
          Per-Pair Results
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pairs.map((s) => <PairCard key={s.pair} s={s} />)}
        </div>
      </div>

      {/* File-level table */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" />
          All Results
        </h2>
        <FileTable rows={rows} />
      </div>

    </div>
  );
}
