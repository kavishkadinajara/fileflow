"use client";

/**
 * PDF Editor — upload a PDF, edit its extracted content, and rebuild a fresh,
 * polished PDF with optional auto-formatting (TOC, page numbers, header, footer,
 * cover page). The original file is never modified; "Rebuild" produces a new job.
 *
 * Extraction reuses the existing pdf→md conversion (Python backend). Rebuild
 * reuses md→pdf with the editor toggle options. AI Auto-format calls
 * /api/pdf-autoformat to infer the toggles and clean up the markdown.
 */
import { Button } from "@/components/ui/button";
import { fileToBase64, downloadBlob, base64ToBlob } from "@/lib/utils";
import { useConversionStore } from "@/store/conversionStore";
import type { ConvertOptions } from "@/types";
import { Download, FileText, Layers, Loader2, RefreshCw, Replace, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";

interface PdfEditorProps {
  file: File;
  onRemove: () => void;
}

interface FormatToggles {
  addToc: boolean;
  addPageNumbers: boolean;
  coverPage: boolean;
  headerText: string;
  footerText: string;
  pageSize: "A4" | "A3" | "Letter" | "Legal";
  orientation: "portrait" | "landscape";
}

const DEFAULT_TOGGLES: FormatToggles = {
  addToc: false,
  addPageNumbers: true,
  coverPage: false,
  headerText: "",
  footerText: "",
  pageSize: "A4",
  orientation: "portrait",
};

export function PdfEditor({ file, onRemove }: PdfEditorProps) {
  const addJobFromContent = useConversionStore((s) => s.addJobFromContent);
  const addResultJob = useConversionStore((s) => s.addResultJob);

  const [content, setContent] = useState("");
  const [decorating, setDecorating] = useState(false);
  const [decorateError, setDecorateError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(true);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [toggles, setToggles] = useState<FormatToggles>(DEFAULT_TOGGLES);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [rebuilt, setRebuilt] = useState(false);

  // Font-matching in-place edit (overlay) — find/replace on the original PDF.
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [occurrence, setOccurrence] = useState<"all" | "first">("all");
  const [matchCase, setMatchCase] = useState(true);
  const [overlayBusy, setOverlayBusy] = useState(false);
  const [overlayError, setOverlayError] = useState<string | null>(null);

  // Surgical patch — diff the edited content against the original and patch only
  // the changes in place (font-matched), keeping the rest pixel-identical.
  const [patching, setPatching] = useState(false);
  const [patchNote, setPatchNote] = useState<string | null>(null);
  const [patchError, setPatchError] = useState<string | null>(null);

  // ── Extract the PDF to editable markdown on mount ──────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function extract() {
      setExtracting(true);
      setExtractError(null);
      try {
        const fileBase64 = await fileToBase64(file);
        const res = await fetch("/api/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileBase64,
            fileName: file.name,
            fromFormat: "pdf",
            toFormat: "md",
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error ?? "Extraction failed");
        const md = atob(data.fileBase64);
        if (!cancelled) setContent(new TextDecoder().decode(Uint8Array.from(md, (c) => c.charCodeAt(0))));
      } catch (err) {
        if (!cancelled) setExtractError(err instanceof Error ? err.message : "Extraction failed");
      } finally {
        if (!cancelled) setExtracting(false);
      }
    }
    extract();
    return () => { cancelled = true; };
  }, [file]);

  function update<K extends keyof FormatToggles>(key: K, value: FormatToggles[K]) {
    setToggles((t) => ({ ...t, [key]: value }));
  }

  function buildOptions(): ConvertOptions {
    return {
      pdfAddToc: toggles.addToc,
      pdfAddPageNumbers: toggles.addPageNumbers,
      pdfCoverPage: toggles.coverPage,
      pdfHeaderText: toggles.headerText.trim() || undefined,
      pdfFooterText: toggles.footerText.trim() || undefined,
      pdfPageSize: toggles.pageSize,
      pdfOrientation: toggles.orientation,
    };
  }

  async function handleRebuild() {
    if (!content.trim()) return;
    await addJobFromContent(content, file.name, "md", "pdf", buildOptions());
    setRebuilt(true);
    setTimeout(() => setRebuilt(false), 2500);
  }

  // Decorate the ORIGINAL PDF in place (keep layout) — stamps header/footer/
  // page numbers via the Python PyMuPDF backend. No re-flow, images preserved.
  async function handleDecorateOriginal() {
    setDecorating(true);
    setDecorateError(null);
    try {
      const fileBase64 = await fileToBase64(file);
      const res = await fetch("/api/pdf-overlay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64,
          fileName: file.name,
          mode: "decorate",
          headerText: toggles.headerText.trim() || undefined,
          footerText: toggles.footerText.trim() || undefined,
          addPageNumbers: toggles.addPageNumbers,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Decorate failed");
      const blob = base64ToBlob(data.fileBase64, data.mimeType);
      addResultJob(blob, data.fileName, "pdf", "pdf");
    } catch (err) {
      setDecorateError(err instanceof Error ? err.message : "Decorate failed");
    } finally {
      setDecorating(false);
    }
  }

  // Font-matching in-place edit on the ORIGINAL PDF: find/replace text while
  // preserving the matched span's font, size, colour, and the page layout.
  async function handleOverlayEdit() {
    if (!findText) return;
    setOverlayBusy(true);
    setOverlayError(null);
    try {
      const fileBase64 = await fileToBase64(file);
      const res = await fetch("/api/pdf-overlay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64,
          fileName: file.name,
          mode: "overlay",
          replacements: [{ find: findText, replace: replaceText, occurrence, matchCase }],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Overlay edit failed");
      const blob = base64ToBlob(data.fileBase64, data.mimeType);
      addResultJob(blob, data.fileName, "pdf", "pdf");
      setFindText("");
      setReplaceText("");
    } catch (err) {
      setOverlayError(err instanceof Error ? err.message : "Overlay edit failed");
    } finally {
      setOverlayBusy(false);
    }
  }

  // Surgical patch: send the edited content; the backend diffs it against the
  // original extraction and patches only the changed phrases in place.
  async function handlePatchOriginal() {
    if (!content.trim()) return;
    setPatching(true);
    setPatchNote(null);
    setPatchError(null);
    try {
      const fileBase64 = await fileToBase64(file);
      const res = await fetch("/api/pdf-patch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64, fileName: file.name, editedText: content }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Patch failed");
      if (data.patchCount === 0) {
        setPatchNote("No changes detected to patch.");
        return;
      }
      const blob = base64ToBlob(data.fileBase64, data.mimeType);
      addResultJob(blob, data.fileName, "pdf", "pdf");
      setPatchNote(`Patched ${data.patchCount} change${data.patchCount === 1 ? "" : "s"} ✓`);
    } catch (err) {
      setPatchError(err instanceof Error ? err.message : "Patch failed");
    } finally {
      setPatching(false);
    }
  }

  async function handleAiAutoFormat() {
    if (!content.trim()) return;
    setAiBusy(true);
    setAiNote(null);
    try {
      const res = await fetch("/api/pdf-autoformat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: content }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "AI auto-format failed");

      setToggles((t) => ({
        ...t,
        addToc: !!data.addToc,
        addPageNumbers: !!data.addPageNumbers,
        headerText: data.headerText ?? t.headerText,
        footerText: data.footerText ?? t.footerText,
        coverPage: data.coverPage ?? t.coverPage,
      }));
      if (typeof data.cleanedMarkdown === "string" && data.cleanedMarkdown.trim()) {
        setContent(data.cleanedMarkdown);
      }
      setAiNote("AI applied formatting suggestions ✓");
    } catch (err) {
      setAiNote(err instanceof Error ? err.message : "AI auto-format failed");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-rose-500 shrink-0" />
          <span className="text-sm font-medium truncate">{file.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold shrink-0">
            PDF
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs gap-1.5"
            onClick={() => downloadBlob(file, file.name)}
            title="Download the original PDF, untouched"
          >
            <Download className="h-3.5 w-3.5" />
            Original
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>

      {/* Editor */}
      {extracting ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Extracting editable content from PDF…
        </div>
      ) : extractError ? (
        <div className="text-sm text-rose-600 dark:text-rose-400 py-4">
          {extractError}
          <p className="text-xs text-muted-foreground mt-1">
            PDF extraction needs the Python backend running on port 8000.
          </p>
        </div>
      ) : (
        <>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            className="w-full h-64 resize-y rounded-lg border bg-background p-3 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Extracted PDF content (Markdown)…"
          />

          {/* AI auto-format */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleAiAutoFormat}
              disabled={aiBusy}
            >
              {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              AI Auto-format
            </Button>
            {aiNote && <span className="text-xs text-muted-foreground">{aiNote}</span>}
          </div>

          {/* Auto-format toggles */}
          <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Wand2 className="h-3.5 w-3.5" />
              Auto-format
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Toggle label="Page numbers" checked={toggles.addPageNumbers} onChange={(v) => update("addPageNumbers", v)} />
              <Toggle label="Table of contents" checked={toggles.addToc} onChange={(v) => update("addToc", v)} />
              <Toggle label="Cover page" checked={toggles.coverPage} onChange={(v) => update("coverPage", v)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="text-xs space-y-1">
                <span className="text-muted-foreground">Header text</span>
                <input
                  type="text"
                  value={toggles.headerText}
                  onChange={(e) => update("headerText", e.target.value)}
                  placeholder="(leave blank for none)"
                  className="w-full h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="text-xs space-y-1">
                <span className="text-muted-foreground">Footer text</span>
                <input
                  type="text"
                  value={toggles.footerText}
                  onChange={(e) => update("footerText", e.target.value)}
                  placeholder="(leave blank for none)"
                  className="w-full h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs space-y-1">
                <span className="text-muted-foreground">Page size</span>
                <select
                  value={toggles.pageSize}
                  onChange={(e) => update("pageSize", e.target.value as FormatToggles["pageSize"])}
                  className="w-full h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                  <option value="Letter">Letter</option>
                  <option value="Legal">Legal</option>
                </select>
              </label>
              <label className="text-xs space-y-1">
                <span className="text-muted-foreground">Orientation</span>
                <select
                  value={toggles.orientation}
                  onChange={(e) => update("orientation", e.target.value as FormatToggles["orientation"])}
                  className="w-full h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </label>
            </div>
          </div>

          {/* Build actions */}
          <div className="space-y-2">
            {/* Surgical patch — the headline action for editing the text above */}
            <Button
              onClick={handlePatchOriginal}
              className="w-full gap-2"
              disabled={patching || !content.trim()}
              title="Diff your edits against the original and patch only the changed words in place — the rest of the PDF stays pixel-identical"
            >
              {patching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Patch original (surgical)
            </Button>
            {patchNote && <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{patchNote}</p>}
            {patchError && <p className="text-[11px] text-rose-600 dark:text-rose-400">{patchError}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button onClick={handleRebuild} variant="outline" className="gap-2" disabled={!content.trim()}>
                {rebuilt ? <RefreshCw className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                {rebuilt ? "Added to jobs ✓" : "Rebuild PDF"}
              </Button>
              <Button
                onClick={handleDecorateOriginal}
                variant="outline"
                className="gap-2"
                disabled={decorating}
                title="Stamp header/footer/page numbers onto the original PDF, keeping its exact layout & images"
              >
                {decorating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
                Decorate original
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong>Patch original</strong> edits only the words you changed, keeping the source
              layout & images pixel-identical. <strong>Rebuild</strong> re-flows everything into a
              clean new PDF. <strong>Decorate</strong> only stamps header / footer / page numbers.
              (Patch &amp; Decorate need the Python backend.)
            </p>
            {decorateError && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400">{decorateError}</p>
            )}
          </div>

          {/* Find & Replace on the original (font-matching in-place edit) */}
          <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Replace className="h-3.5 w-3.5" />
              Edit original text (keeps font &amp; layout)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                placeholder="Find text…"
                className="h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="Replace with…"
                className="h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={occurrence}
                onChange={(e) => setOccurrence(e.target.value as "all" | "first")}
                className="h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">All matches</option>
                <option value="first">First match only</option>
              </select>
              <Toggle label="Match case" checked={matchCase} onChange={setMatchCase} />
              <Button
                size="sm"
                variant="secondary"
                className="h-8 gap-1.5 text-xs ml-auto"
                onClick={handleOverlayEdit}
                disabled={overlayBusy || !findText}
              >
                {overlayBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Replace className="h-3.5 w-3.5" />}
                Apply to original
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Replaces text directly in the original PDF, redrawn in the same font, size &amp;
              colour — images and layout stay untouched (needs the Python backend).
            </p>
            {overlayError && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400">{overlayError}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
      />
      <span>{label}</span>
    </label>
  );
}
