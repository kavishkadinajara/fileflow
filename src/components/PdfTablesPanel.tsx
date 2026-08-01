"use client";

/**
 * PDF → Tables panel. Detects every table in the PDF (ruled + borderless) via the
 * deterministic Python engine, previews them with a confidence badge and inferred
 * column types, and exports the lot to Excel or CSV — a free alternative to paid
 * PDF-to-spreadsheet tools, with an accuracy you can see before you download.
 */
import { Button } from "@/components/ui/button";
import { fileToBase64, base64ToBlob, downloadBlob } from "@/lib/utils";
import { AlertTriangle, FileSpreadsheet, Loader2, Table2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ExtractedTable {
  page: number;
  rows: number;
  cols: number;
  source: "ruled" | "borderless";
  hasHeader: boolean;
  colTypes: string[];
  confidence: number;
  cells: string[][];
}

interface PdfTablesPanelProps {
  file: File;
  onResult: (blob: Blob, fileName: string) => void;
}

const TYPE_LABEL: Record<string, string> = {
  int: "123", float: "1.2", currency: "$", percent: "%", date: "📅", text: "Abc",
};

export function PdfTablesPanel({ file, onResult }: PdfTablesPanelProps) {
  const [tables, setTables] = useState<ExtractedTable[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"xlsx" | "csv" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const fileBase64Ref = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const fileBase64 = await fileToBase64(file);
        fileBase64Ref.current = fileBase64;
        const res = await fetch("/api/pdf-tables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "extract", fileBase64, fileName: file.name }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error ?? "Detection failed");
        if (!cancelled) setTables(data.tables as ExtractedTable[]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Detection failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [file]);

  async function handleExport(format: "xlsx" | "csv") {
    if (!fileBase64Ref.current) return;
    setExporting(format);
    setNote(null);
    setError(null);
    try {
      const res = await fetch("/api/pdf-tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "export", fileBase64: fileBase64Ref.current, fileName: file.name, format }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Export failed");
      const blob = base64ToBlob(data.fileBase64, data.mimeType);
      onResult(blob, data.fileName);
      downloadBlob(blob, data.fileName);
      setNote(`Exported ${data.tableCount} table${data.tableCount === 1 ? "" : "s"} to ${format.toUpperCase()} ✓`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
        Detecting tables in the PDF…
      </div>
    );
  }
  if (error && !tables) {
    return (
      <div className="text-sm text-rose-600 dark:text-rose-400 py-4">
        {error}
        <p className="text-xs text-muted-foreground mt-1">Table extraction needs the Python backend on port 8000.</p>
      </div>
    );
  }
  if (!tables) return null;

  if (tables.length === 0) {
    return (
      <div className="text-center py-10 space-y-2">
        <Table2 className="h-8 w-8 mx-auto text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No tables were detected in this PDF.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + export actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Table2 className="h-4 w-4 text-emerald-500" />
          <span className="font-medium">{tables.length} table{tables.length === 1 ? "" : "s"} detected</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => handleExport("xlsx")} disabled={!!exporting}>
            {exporting === "xlsx" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
            Download Excel
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => handleExport("csv")} disabled={!!exporting}>
            {exporting === "csv" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Table2 className="h-3.5 w-3.5" />}
            Download CSV
          </Button>
        </div>
      </div>

      {note && <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{note}</p>}
      {error && <p className="text-[11px] text-rose-600 dark:text-rose-400">{error}</p>}

      {/* Table previews */}
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {tables.map((t, i) => {
          const low = t.confidence < 0.8;
          const headerRow = t.hasHeader ? t.cells[0] : null;
          const bodyRows = (t.hasHeader ? t.cells.slice(1) : t.cells).slice(0, 6);
          return (
            <div key={i} className="rounded-lg border bg-card overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/30 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Table {i + 1}</span>
                  <span className="text-muted-foreground">page {t.page + 1} · {t.rows}×{t.cols}</span>
                  <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">{t.source}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {low && (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400" title="Lower-confidence extraction — check before use">
                      <AlertTriangle className="h-3 w-3" />
                      check
                    </span>
                  )}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${low ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                    {Math.round(t.confidence * 100)}%
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  {headerRow && (
                    <thead>
                      <tr className="bg-muted/40">
                        {headerRow.map((c, ci) => (
                          <th key={ci} className="text-left px-2 py-1 font-semibold border-r last:border-r-0 whitespace-nowrap">
                            <span>{c}</span>
                            <span className="ml-1 text-[9px] text-muted-foreground font-normal">{TYPE_LABEL[t.colTypes[ci]] ?? ""}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {bodyRows.map((row, ri) => (
                      <tr key={ri} className="border-t">
                        {row.map((c, ci) => (
                          <td key={ci} className="px-2 py-1 border-r last:border-r-0 align-top whitespace-nowrap max-w-[200px] truncate">{c}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(t.hasHeader ? t.rows - 1 : t.rows) > 6 && (
                  <div className="px-2 py-1 text-[10px] text-muted-foreground border-t">
                    + {(t.hasHeader ? t.rows - 1 : t.rows) - 6} more rows…
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Tables are detected deterministically (no AI guesswork) with column types inferred —
        numbers, currency and percentages export as real Excel values. The <strong>%</strong> badge
        is the extraction confidence; <strong>check</strong> flags a table worth a glance.
        (Needs the Python backend.)
      </p>
    </div>
  );
}
