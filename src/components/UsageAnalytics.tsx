"use client";

/**
 * Usage Analytics — an aggregate view of which conversions are most popular.
 *
 * Reads only counts (no user-level data) via the popular_formats RPC. Renders a
 * ranked horizontal bar chart plus summary tiles. Shown to signed-in users;
 * because the RPC returns pure aggregates it leaks nothing about individuals.
 */
import { type FormatPopularity, popularFormats } from "@/lib/supabase/analytics";
import { isCloudEnabled } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { FORMAT_META } from "@/lib/formats";
import type { FileFormat } from "@/types";
import { ArrowRight, BarChart3, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function label(f: string): string {
  return FORMAT_META[f as FileFormat]?.label ?? f.toUpperCase();
}

export function UsageAnalytics() {
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);
  const [rows, setRows] = useState<FormatPopularity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) { setRows([]); return; }
    setLoading(true); setError(null);
    try {
      setRows(await popularFormats(25));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  if (!isCloudEnabled() || !ready) return null;
  if (!user) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center space-y-1">
        <BarChart3 className="h-6 w-6 mx-auto text-muted-foreground" />
        <p className="text-sm font-medium">Sign in to view usage analytics</p>
        <p className="text-[11px] text-muted-foreground">Aggregate counts only — no personal data is shown.</p>
      </div>
    );
  }

  const maxRuns = Math.max(1, ...rows.map((r) => r.runs));
  const totalRuns = rows.reduce((acc, r) => acc + r.runs, 0);
  const distinctPairs = rows.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> Popular conversions
        </h2>
        <button onClick={load} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
        </button>
      </div>

      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-2xl font-bold tabular-nums">{totalRuns}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">total conversions</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-2xl font-bold tabular-nums">{distinctPairs}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">format pairs</div>
        </div>
        <div className="rounded-xl border bg-card p-4 col-span-2 sm:col-span-1">
          <div className="text-sm font-bold truncate">
            {rows[0] ? <>{label(rows[0].source_format)} → {label(rows[0].target_format)}</> : "—"}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">most popular</div>
        </div>
      </div>

      {/* Ranked bar chart */}
      {rows.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          No conversions recorded yet. Convert some files (signed in) and they&apos;ll aggregate here.
        </p>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {rows.map((r) => (
            <div key={`${r.source_format}-${r.target_format}`} className="flex items-center gap-3 px-4 py-2">
              <div className="flex items-center gap-1 text-xs font-medium w-40 shrink-0">
                <span>{label(r.source_format)}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span>{label(r.target_format)}</span>
              </div>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary/70 transition-all duration-500" style={{ width: `${(r.runs / maxRuns) * 100}%` }} />
              </div>
              <span className="text-xs tabular-nums text-muted-foreground w-10 text-right shrink-0">{r.runs}</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">
        Aggregate counts via a security-definer function — no user-level rows are exposed.
      </p>
    </div>
  );
}
