"use client";

/**
 * Conversion history — the signed-in user's past conversions (metadata only:
 * filename, format pair, size, status, timing). Renders a sign-in prompt when
 * signed out and nothing at all when cloud sync is disabled.
 */
import {
  type ConversionRecord,
  listHistory,
  deleteHistoryEntry,
  clearHistory,
} from "@/lib/supabase/conversionHistory";
import { isCloudEnabled } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { FORMAT_META } from "@/lib/formats";
import type { FileFormat } from "@/types";
import { ArrowRight, Clock, Loader2, Trash2, FileClock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function fmtLabel(f: string): string {
  return FORMAT_META[f as FileFormat]?.label ?? f.toUpperCase();
}
function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ConversionHistory() {
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);
  const [rows, setRows] = useState<ConversionRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setRows([]); return; }
    setLoading(true);
    try {
      setRows(await listHistory({ limit: 100 }));
    } catch {
      /* keep last good state */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  if (!isCloudEnabled()) return null;
  if (!ready) return null;

  if (!user) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center space-y-1">
        <FileClock className="h-6 w-6 mx-auto text-muted-foreground" />
        <p className="text-sm font-medium">Sign in to see your conversion history</p>
        <p className="text-[11px] text-muted-foreground">
          We store only metadata — filename, formats, size — never the file itself.
        </p>
      </div>
    );
  }

  async function onDelete(id: string) { await deleteHistoryEntry(id); void load(); }
  async function onClear() { await clearHistory(); void load(); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Conversion history
        </h2>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>

      {rows.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          No conversions yet. Convert a file and it will appear here.
        </p>
      ) : (
        <>
          <div className="rounded-xl border bg-card divide-y">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex items-center gap-1.5 text-xs font-medium shrink-0">
                  <span>{fmtLabel(r.source_format)}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span>{fmtLabel(r.target_format)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">{r.source_name || "file"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {fmtWhen(r.created_at)} · {fmtSize(r.size_bytes)}
                    {r.duration_ms ? ` · ${r.duration_ms} ms` : ""}
                    {r.status === "error" && <span className="text-rose-500"> · failed</span>}
                  </p>
                </div>
                <button
                  onClick={() => onDelete(r.id)}
                  className="text-muted-foreground hover:text-rose-500 transition-colors"
                  aria-label="Delete entry"
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
}
