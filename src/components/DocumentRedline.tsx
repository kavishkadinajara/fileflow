"use client";

/**
 * Document Redline / Compare — upload two versions of a document and see a
 * semantic, Word-style redline: block-level changes (added / removed / modified /
 * moved) with inline word diffs, a similarity score, and a category breakdown.
 *
 * The standout is semantic block alignment: a reworded paragraph is shown as a
 * single *modified* block with inline highlights, and a relocated paragraph is
 * flagged as *moved* — instead of the delete-then-insert noise a plain diff emits.
 */
import { Button } from "@/components/ui/button";
import { fileToBase64 } from "@/lib/utils";
import type { RedlineResult, RedlineBlock, RedlineOp } from "@/lib/redline";
import {
  Upload, X, FileText, Loader2, GitCompareArrows, Filter, Sparkles, ArrowRightLeft,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

const OP_META: Record<RedlineOp, { label: string; chip: string; bar: string; ring: string }> = {
  added:    { label: "Added",    chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", bar: "border-l-emerald-500", ring: "text-emerald-500" },
  removed:  { label: "Removed",  chip: "bg-rose-500/10 text-rose-600 dark:text-rose-400",          bar: "border-l-rose-500",    ring: "text-rose-500" },
  modified: { label: "Modified", chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400",        bar: "border-l-amber-500",   ring: "text-amber-500" },
  moved:    { label: "Moved",    chip: "bg-violet-500/10 text-violet-600 dark:text-violet-400",      bar: "border-l-violet-500",  ring: "text-violet-500" },
  equal:    { label: "Unchanged",chip: "bg-muted text-muted-foreground",                            bar: "border-l-transparent", ring: "text-muted-foreground" },
};

function simColor(s: number): string {
  if (s >= 0.85) return "#10b981";
  if (s >= 0.6) return "#f59e0b";
  return "#ef4444";
}

// ── Similarity ring ─────────────────────────────────────────────────────────────

function SimRing({ value }: { value: number }) {
  const r = 46, c = 2 * Math.PI * r;
  const off = c - value * c;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90">
        <circle cx="55" cy="55" r={r} className="stroke-muted/40" strokeWidth="9" fill="none" />
        <circle cx="55" cy="55" r={r} strokeWidth="9" fill="none" strokeLinecap="round"
          stroke={simColor(value)} strokeDasharray={c} strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 700ms ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums" style={{ color: simColor(value) }}>{Math.round(value * 100)}%</span>
        <span className="text-[9px] text-muted-foreground">similar</span>
      </div>
    </div>
  );
}

// ── Inline word-diff renderer ────────────────────────────────────────────────────

function InlineDiff({ block }: { block: RedlineBlock }) {
  if (block.inline.length) {
    return (
      <p className="text-xs leading-relaxed">
        {block.inline.map((run, i) => {
          if (run.op === "insert") return <span key={i} className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded px-0.5">{run.text}</span>;
          if (run.op === "delete") return <span key={i} className="bg-rose-500/15 text-rose-600 dark:text-rose-400 line-through rounded px-0.5">{run.text}</span>;
          return <span key={i}>{run.text}</span>;
        })}
      </p>
    );
  }
  // added / removed / equal — plain text with op styling.
  const text = block.new_text || block.old_text;
  if (block.op === "added") return <p className="text-xs leading-relaxed text-emerald-700 dark:text-emerald-300">{text}</p>;
  if (block.op === "removed") return <p className="text-xs leading-relaxed text-rose-600 dark:text-rose-400 line-through decoration-1">{text}</p>;
  return <p className="text-xs leading-relaxed text-muted-foreground">{text}</p>;
}

// ── Main ──────────────────────────────────────────────────────────────────────────

function FileDrop({ label, file, onPick, onClear }: {
  label: string; file: File | null; onPick: (f: File | null) => void; onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
      <div
        onClick={() => ref.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); onPick(e.dataTransfer.files?.[0] ?? null); }}
        className="flex flex-col items-center justify-center gap-1.5 h-32 rounded-xl border-2 border-dashed cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
      >
        <input ref={ref} type="file" accept=".pdf,.docx,.md,.html,.txt" className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
        {file ? (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-medium truncate max-w-[180px]">{file.name}</span>
            <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="h-5 w-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Drop or click · PDF, DOCX, MD, HTML, TXT</p>
          </>
        )}
      </div>
    </div>
  );
}

export function DocumentRedline() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [semantic, setSemantic] = useState(true);
  const [changesOnly, setChangesOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RedlineResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!fileA || !fileB) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const [originalBase64, revisedBase64] = await Promise.all([fileToBase64(fileA), fileToBase64(fileB)]);
      const res = await fetch("/api/redline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalBase64, originalName: fileA.name,
          revisedBase64, revisedName: fileB.name, semantic,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Comparison failed");
      setResult(data.result as RedlineResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  }

  const visibleBlocks = useMemo(() => {
    if (!result) return [];
    return changesOnly ? result.blocks.filter((b) => b.op !== "equal") : result.blocks;
  }, [result, changesOnly]);

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="grid gap-4 md:grid-cols-2">
        <FileDrop label="Original (version A)" file={fileA} onPick={(f) => { setFileA(f); setResult(null); }} onClear={() => setFileA(null)} />
        <FileDrop label="Revised (version B)" file={fileB} onPick={(f) => { setFileB(f); setResult(null); }} onClear={() => setFileB(null)} />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={run} disabled={!fileA || !fileB || loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompareArrows className="h-4 w-4" />}
          Compare
        </Button>
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={semantic} onChange={(e) => setSemantic(e.target.checked)} className="accent-primary" />
          <Sparkles className="h-3 w-3 text-primary" /> Semantic alignment (detect rewrites &amp; moves)
        </label>
      </div>

      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {loading && <p className="text-xs text-muted-foreground animate-pulse">Aligning blocks and computing inline diffs…</p>}

      {/* Result */}
      {result && (
        <div className="space-y-5 animate-fade-up">
          {/* Summary */}
          <div className="rounded-2xl border bg-card p-5 flex flex-col sm:flex-row items-center gap-5">
            <SimRing value={result.stats.similarity} />
            <div className="flex-1 w-full space-y-3">
              <p className="text-sm font-medium">{result.stats.verdict}</p>
              <div className="flex flex-wrap gap-1.5">
                {(["added", "removed", "modified", "moved"] as RedlineOp[]).map((op) => (
                  result.stats.counts[op] > 0 && (
                    <span key={op} className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${OP_META[op].chip}`}>
                      {result.stats.counts[op]} {OP_META[op].label.toLowerCase()}
                    </span>
                  )
                ))}
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
                  {result.stats.counts.equal} unchanged
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                +{result.stats.words_added} / −{result.stats.words_removed} words · change magnitude {Math.round(result.stats.change_magnitude * 100)}%
                {result.semantic && <> · <span className="text-primary">semantic alignment on</span></>}
                {result.formats && <> · {result.formats.a.toUpperCase()} vs {result.formats.b.toUpperCase()}</>}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-primary" /> Redline
            </h3>
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
              <Filter className="h-3 w-3" />
              <input type="checkbox" checked={changesOnly} onChange={(e) => setChangesOnly(e.target.checked)} className="accent-primary" />
              Changes only
            </label>
          </div>

          {/* Redline blocks */}
          <div className="space-y-1.5">
            {visibleBlocks.map((b, i) => (
              <div key={i} className={`rounded-lg border border-l-[3px] bg-card px-3.5 py-2.5 ${OP_META[b.op].bar}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[9px] uppercase tracking-wide font-semibold px-1.5 py-px rounded ${OP_META[b.op].chip}`}>
                    {OP_META[b.op].label}
                  </span>
                  {b.kind === "heading" && <span className="text-[9px] text-muted-foreground">heading</span>}
                  {b.op === "modified" && (
                    <span className="text-[9px] text-muted-foreground">{Math.round(b.similarity * 100)}% match</span>
                  )}
                  {b.op === "moved" && <span className="text-[9px] text-violet-500">relocated</span>}
                </div>
                <InlineDiff block={b} />
              </div>
            ))}
            {visibleBlocks.length === 0 && (
              <p className="text-[11px] text-muted-foreground text-center py-6">
                {changesOnly ? "No changes to show — the documents are identical." : "No content."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
