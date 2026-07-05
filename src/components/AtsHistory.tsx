"use client";

/**
 * ATS scan history — shows the signed-in user's past résumé scans as a score
 * timeline (improvement chart), the skills they keep missing across scans
 * (junction-table aggregate), and a deletable scan list.
 *
 * Renders nothing when cloud sync is disabled or the user is signed out.
 */
import {
  type AtsScanRow,
  listScans,
  persistentGaps,
  deleteScan,
  clearScans,
} from "@/lib/supabase/atsHistory";
import { isCloudEnabled } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { Loader2, TrendingUp, Trash2, History as HistoryIcon } from "lucide-react";
import { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";

export interface AtsHistoryHandle {
  refresh: () => void;
}

function scoreColor(n: number): string {
  if (n >= 75) return "text-emerald-500";
  if (n >= 50) return "text-amber-500";
  return "text-rose-500";
}
function strokeColor(n: number): string {
  if (n >= 75) return "#10b981";
  if (n >= 50) return "#f59e0b";
  return "#f43f5e";
}

/** Tiny dependency-free SVG line chart of overall score over time. */
function ScoreTrend({ scans }: { scans: AtsScanRow[] }) {
  if (scans.length < 2) return null;
  const W = 600, H = 140, pad = 24;
  const xs = (i: number) => pad + (i / (scans.length - 1)) * (W - pad * 2);
  const ys = (v: number) => H - pad - (v / 100) * (H - pad * 2);
  const pts = scans.map((s, i) => `${xs(i)},${ys(s.overall)}`).join(" ");
  const first = scans[0].overall;
  const last = scans[scans.length - 1].overall;
  const delta = last - first;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-primary" /> Score over time
        </h3>
        <span className={`text-xs font-semibold tabular-nums ${delta >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
          {delta >= 0 ? "+" : ""}{delta} pts since first scan
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        {[0, 25, 50, 75, 100].map((g) => (
          <line key={g} x1={pad} x2={W - pad} y1={ys(g)} y2={ys(g)} className="stroke-muted/40" strokeWidth="1" />
        ))}
        <polyline points={pts} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinejoin="round" />
        {scans.map((s, i) => (
          <circle key={s.id} cx={xs(i)} cy={ys(s.overall)} r="3.5" fill={strokeColor(s.overall)} />
        ))}
      </svg>
    </div>
  );
}

export const AtsHistory = forwardRef<AtsHistoryHandle>(function AtsHistory(_props, ref) {
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);
  const [scans, setScans] = useState<AtsScanRow[]>([]);
  const [gaps, setGaps] = useState<Array<{ skill: string; timesMissing: number }>>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setScans([]); setGaps([]); return; }
    setLoading(true);
    try {
      const [s, g] = await Promise.all([listScans(), persistentGaps()]);
      setScans(s);
      setGaps(g);
    } catch {
      /* keep last good state */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useImperativeHandle(ref, () => ({ refresh: load }), [load]);
  useEffect(() => { void load(); }, [load]);

  if (!isCloudEnabled() || !ready || !user) return null;

  async function onDelete(id: string) {
    await deleteScan(id);
    void load();
  }
  async function onClear() {
    await clearScans();
    void load();
  }

  const newestFirst = [...scans].reverse();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <HistoryIcon className="h-4 w-4 text-primary" /> Your scan history
        </h2>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>

      {scans.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          No scans yet. Analyze a résumé above and it will be saved here so you can track your progress.
        </p>
      ) : (
        <>
          <ScoreTrend scans={scans} />

          {gaps.length > 0 && (
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <h3 className="text-xs font-semibold">Skills you keep missing</h3>
              <div className="flex flex-wrap gap-1.5">
                {gaps.map((g) => (
                  <span key={g.skill} className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-medium">
                    {g.skill}<span className="opacity-60 ml-1">×{g.timesMissing}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border bg-card divide-y">
            {newestFirst.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className={`text-sm font-bold tabular-nums w-9 ${scoreColor(s.overall)}`}>{s.overall}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{s.resume_name || "résumé"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    {" · "}kw {s.score_keyword} · sk {s.score_skills} · rel {s.score_similarity} · fmt {s.score_format}
                  </p>
                </div>
                <button
                  onClick={() => onDelete(s.id)}
                  className="text-muted-foreground hover:text-rose-500 transition-colors"
                  aria-label="Delete scan"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button onClick={onClear} className="text-[11px] text-muted-foreground hover:text-rose-500 transition-colors">
            Clear all history
          </button>
        </>
      )}
    </div>
  );
});
