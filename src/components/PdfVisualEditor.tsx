"use client";

/**
 * Visual (WYSIWYG) PDF editor — fill in and edit a PDF like a real document.
 *
 * The page is shown as the REAL rendered PDF image (logo, colour bands, dotted form
 * lines — everything), never re-rendered. On top sit two kinds of editable layers:
 *
 *   1. Block fields  — one transparent hotspot per existing text line. Click it and
 *      an inline editor appears exactly there; edits are sent through the surgical
 *      font-matching patcher on download, so only the words you changed move and the
 *      rest stays pixel-identical.
 *   2. Added boxes   — click ANY empty area (a blank field, a dotted rule) to drop a
 *      new text box and type. These are stamped onto the PDF at exact coordinates.
 *
 * UX built to beat dedicated PDF editors: click-anywhere to add text, Tab/Shift+Tab
 * to move between fields, Enter to commit + jump to the next, Esc to cancel, a
 * floating per-field toolbar (size, bold, colour, delete), multi-line auto-fit, and
 * a "next empty field" jump for fast form filling.
 *
 * Coordinates: blocks/boxes live in PDF points (top-left origin). The page image is
 * shown at `scale = displayWidth / pagePointWidth`; every field is positioned at
 * coord*scale, and box coords are converted back to points on download.
 */
import { Button } from "@/components/ui/button";
import { fileToBase64, base64ToBlob, downloadBlob } from "@/lib/utils";
import {
  Bold, Check, Download, GripVertical, Loader2, Minus, MousePointerClick, Plus,
  RotateCcw, Trash2, Type, ZoomIn, ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface VisualBlock {
  id: string;
  text: string;
  x: number; y: number; w: number; h: number;
  size: number;
  font: string;
  color: string;
  bold: boolean;
  italic: boolean;
}
interface VisualPage {
  width: number;        // points
  height: number;       // points
  imageW: number;       // pixels
  imageH: number;       // pixels
  image: string;        // base64 PNG
  blocks: VisualBlock[];
}

/** A new text box the user dropped on an empty area. Coords in PDF points. */
interface AddedBox {
  id: string;
  page: number;
  x: number; y: number; w: number; h: number;
  text: string;
  size: number;
  color: string;   // hex
  bold: boolean;
}

interface PdfVisualEditorProps {
  file: File;
  onResult: (blob: Blob, fileName: string) => void;
}

const BASE_PAGE_WIDTH = 800;
const HEX_PRESETS = ["#000000", "#1d4ed8", "#dc2626", "#15803d", "#7c3aed"];

// hex "#rrggbb" → [r,g,b] in 0..1 for the backend.
function hexToRgb01(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const round1 = (v: number) => Math.round(v * 10) / 10;

// A box's height (points) must follow its font size + line count so the backend
// never shrinks the text to fit a too-short rect (the per-box size-collapse bug).
// PyMuPDF's insert_textbox needs ≈1.4× the font size of vertical room per line.
function boxHeightFor(size: number, text: string): number {
  const lines = Math.max(1, text.split("\n").length);
  return Math.ceil(size * 1.5 * lines + 6);
}

export function PdfVisualEditor({ file, onResult }: PdfVisualEditorProps) {
  const [pages, setPages] = useState<VisualPage[] | null>(null);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [boxes, setBoxes] = useState<AddedBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  // Active editor: a block id ("p0l3"), an added-box id ("box-…"), or null.
  const [activeId, setActiveId] = useState<string | null>(null);
  // "add text" mode: the next click on empty page area drops a new box.
  const [addMode, setAddMode] = useState(false);
  // Live drag state for moving an added box (null when not dragging). Guide lines
  // show the snap target the box is currently aligning to.
  const [drag, setDrag] = useState<{ id: string; page: number } | null>(null);
  const [guides, setGuides] = useState<{ page: number; vx?: number; hy?: number } | null>(null);
  const fileBase64Ref = useRef<string | null>(null);
  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
  // Mutable drag bookkeeping (avoids re-renders during pointer move).
  const dragRef = useRef<{ id: string; page: number; scale: number; offX: number; offY: number } | null>(null);

  // ── Extract page images + editable blocks on mount ─────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function extract() {
      setLoading(true);
      setError(null);
      try {
        const fileBase64 = await fileToBase64(file);
        fileBase64Ref.current = fileBase64;
        const res = await fetch("/api/pdf-visual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "extract", fileBase64, fileName: file.name, dpi: 200 }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error ?? "Extraction failed");
        if (!cancelled) setPages(data.pages as VisualPage[]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Extraction failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    extract();
    return () => { cancelled = true; };
  }, [file]);

  const setBlockText = useCallback((id: string, text: string) => {
    setEdited((e) => ({ ...e, [id]: text }));
  }, []);

  const valueOf = useCallback(
    (b: VisualBlock) => (b.id in edited ? edited[b.id] : b.text),
    [edited],
  );

  // Ordered list of every editable field id (blocks then boxes), reading order —
  // drives Tab / Enter navigation and the "next empty field" jump.
  const fieldOrder = useMemo(() => {
    if (!pages) return [] as string[];
    const ids: string[] = [];
    pages.forEach((pg, pi) => {
      pg.blocks.forEach((b) => ids.push(b.id));
      boxes.filter((bx) => bx.page === pi).forEach((bx) => ids.push(bx.id));
    });
    return ids;
  }, [pages, boxes]);

  const dirtyCount = useMemo(() => {
    if (!pages) return 0;
    let n = 0;
    for (const pg of pages) for (const b of pg.blocks) {
      if (b.id in edited && edited[b.id] !== b.text) n++;
    }
    return n + boxes.filter((b) => b.text.trim()).length;
  }, [pages, edited, boxes]);

  function focusField(id: string | null) {
    setActiveId(id);
    if (id) requestAnimationFrame(() => fieldRefs.current[id]?.focus());
  }

  // Tab / Shift+Tab / Enter → move to the next (or previous) field; Esc → blur.
  function handleFieldKey(e: React.KeyboardEvent, id: string, multiline: boolean) {
    const idx = fieldOrder.indexOf(id);
    if (e.key === "Tab") {
      e.preventDefault();
      const next = fieldOrder[(idx + (e.shiftKey ? -1 : 1) + fieldOrder.length) % fieldOrder.length];
      focusField(next);
    } else if (e.key === "Enter" && !(multiline && e.shiftKey)) {
      if (!multiline) {
        e.preventDefault();
        focusField(fieldOrder[(idx + 1) % fieldOrder.length] ?? null);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      (e.target as HTMLElement).blur();
      setActiveId(null);
    }
  }

  // Jump to the next field that is still empty (fast form filling).
  function jumpNextEmpty() {
    if (!pages) return;
    const isEmpty = (id: string) => {
      const blk = pages.flatMap((p) => p.blocks).find((b) => b.id === id);
      if (blk) return valueOf(blk).trim() === "";
      const bx = boxes.find((b) => b.id === id);
      return bx ? bx.text.trim() === "" : false;
    };
    const start = activeId ? fieldOrder.indexOf(activeId) + 1 : 0;
    for (let i = 0; i < fieldOrder.length; i++) {
      const id = fieldOrder[(start + i) % fieldOrder.length];
      if (isEmpty(id)) { focusField(id); return; }
    }
  }

  // Click on empty page area → drop a new text box there (when add mode is on).
  function handlePageClick(e: React.MouseEvent, pi: number, scale: number) {
    if (!addMode) return;
    if (e.target !== e.currentTarget) return; // ignore clicks that hit a field
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const px = (e.clientX - rect.left) / scale;   // display px → PDF points
    const py = (e.clientY - rect.top) / scale;
    const id = `box-${Date.now()}-${Math.round(px)}`;
    const size = 12;
    // Snap the drop point to the form's rows/columns so a new field lands aligned.
    const t = snapTargets[pi] ?? { xs: [], ys: [] };
    const sx = snap1(Math.max(0, px), t.xs, 6).v;
    const sy = snap1(Math.max(0, py - size * 0.55), t.ys, 6).v;
    const newBox: AddedBox = {
      id, page: pi,
      x: sx, y: sy,
      w: 220, h: boxHeightFor(size, ""), text: "", size, color: "#000000", bold: false,
    };
    setBoxes((bs) => [...bs, newBox]);
    setAddMode(false);
    focusField(id);
  }

  // Patch a box; whenever its size or text changes, recompute the height so the
  // chosen font size is honoured (a too-short box would force the backend to shrink
  // the text — the per-box size-collapse bug).
  function updateBox(id: string, patch: Partial<AddedBox>) {
    setBoxes((bs) =>
      bs.map((b) => {
        if (b.id !== id) return b;
        const next = { ...b, ...patch };
        if ("size" in patch || "text" in patch) {
          next.h = boxHeightFor(next.size, next.text);
        }
        return next;
      }),
    );
  }
  function removeBox(id: string) {
    setBoxes((bs) => bs.filter((b) => b.id !== id));
    if (activeId === id) setActiveId(null);
  }

  // Snap targets per page: every block's left x and baseline y (its row), plus the
  // x/y of other added boxes. A dragged box gently aligns to these so new fields sit
  // exactly on the form's rows and columns instead of slightly off.
  const snapTargets = useMemo(() => {
    const byPage: Record<number, { xs: number[]; ys: number[] }> = {};
    if (!pages) return byPage;
    pages.forEach((pg, pi) => {
      const xs = new Set<number>();
      const ys = new Set<number>();
      pg.blocks.forEach((b) => { xs.add(round1(b.x)); ys.add(round1(b.y)); });
      boxes.filter((b) => b.page === pi).forEach((b) => { xs.add(round1(b.x)); ys.add(round1(b.y)); });
      byPage[pi] = { xs: [...xs], ys: [...ys] };
    });
    return byPage;
  }, [pages, boxes]);

  // Snap a point (PDF pts) to the nearest target within `tol` pts; returns the
  // snapped value and whether a snap happened (for the guide line).
  function snap1(v: number, targets: number[], tol = 4): { v: number; hit?: number } {
    let best = v, bestD = tol, hit: number | undefined;
    for (const t of targets) {
      const d = Math.abs(v - t);
      if (d < bestD) { bestD = d; best = t; hit = t; }
    }
    return { v: best, hit };
  }

  // ── Drag an added box to reposition it (with snapping) ─────────────────────
  function startDrag(e: React.PointerEvent, bx: AddedBox, scale: number) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const t = snapTargets[bx.page] ?? { xs: [], ys: [] };
    void t;
    dragRef.current = {
      id: bx.id, page: bx.page, scale,
      offX: e.clientX - bx.x * scale,   // cursor offset within the box
      offY: e.clientY - bx.y * scale,
    };
    setDrag({ id: bx.id, page: bx.page });
    setActiveId(bx.id);
  }

  function onDragMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const rawX = (e.clientX - d.offX) / d.scale;
    const rawY = (e.clientY - d.offY) / d.scale;
    const t = snapTargets[d.page] ?? { xs: [], ys: [] };
    const sx = snap1(rawX, t.xs);
    const sy = snap1(rawY, t.ys);
    updateBox(d.id, { x: Math.max(0, sx.v), y: Math.max(0, sy.v) });
    setGuides({ page: d.page, vx: sx.hit, hy: sy.hit });
  }

  function endDrag(e: React.PointerEvent) {
    if (dragRef.current) {
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    }
    dragRef.current = null;
    setDrag(null);
    setGuides(null);
  }

  function resetEdits() {
    setEdited({});
    setBoxes([]);
    setActiveId(null);
    setNote(null);
  }

  // Existing-text edits → newline-joined reading-order text for the diff patcher.
  function buildEditedText(): string {
    if (!pages) return "";
    const lines: string[] = [];
    for (const pg of pages) for (const b of pg.blocks) lines.push(valueOf(b));
    return lines.join("\n");
  }

  async function handleDownload() {
    if (!pages || !fileBase64Ref.current) return;
    setBusy(true);
    setNote(null);
    setError(null);
    try {
      const payloadBoxes = boxes
        .filter((b) => b.text.trim())
        .map((b) => ({
          page: b.page,
          x: b.x, y: b.y, w: b.w, h: b.h,
          text: b.text,
          size: b.size,
          color: hexToRgb01(b.color),
          font: b.bold ? "hebo" : "helv",
        }));
      const res = await fetch("/api/pdf-visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "compose",
          fileBase64: fileBase64Ref.current,
          fileName: file.name,
          editedText: buildEditedText(),
          boxes: payloadBoxes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Save failed");
      const blob = base64ToBlob(data.fileBase64, data.mimeType);
      onResult(blob, data.fileName);
      downloadBlob(blob, data.fileName);
      const total = (data.patchCount ?? 0) + (data.boxCount ?? 0);
      setNote(total === 0 ? "No edits to apply — downloaded the original." : `Saved ${total} edit${total === 1 ? "" : "s"} ✓`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
        Rendering the PDF for in-place editing…
      </div>
    );
  }
  if (error && !pages) {
    return (
      <div className="text-sm text-rose-600 dark:text-rose-400 py-4">
        {error}
        <p className="text-xs text-muted-foreground mt-1">
          Visual editing needs the Python backend running on port 8000.
        </p>
      </div>
    );
  }
  if (!pages) return null;

  const pageWidth = BASE_PAGE_WIDTH * zoom;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap sticky top-0 z-20 bg-card/95 backdrop-blur py-1.5 border-b">
        <div className="flex items-center gap-1.5">
          <Button
            variant={addMode ? "default" : "outline"}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setAddMode((v) => !v)}
            title="Click this, then click anywhere on the page to add a text box"
          >
            <Type className="h-3.5 w-3.5" />
            {addMode ? "Click page to place…" : "Add text"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={jumpNextEmpty}
            title="Jump to the next empty field"
          >
            <MousePointerClick className="h-3.5 w-3.5" />
            Next blank
          </Button>
          <span className="mx-1 h-5 w-px bg-border" />
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))} title="Zoom out">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs tabular-nums w-10 text-center text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))} title="Zoom in">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground ml-2">
            {pages.length} page{pages.length === 1 ? "" : "s"}
            {dirtyCount > 0 && <> · <span className="text-primary font-medium">{dirtyCount} edited</span></>}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {dirtyCount > 0 && (
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={resetEdits}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleDownload} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Download filled PDF
          </Button>
        </div>
      </div>

      {note && <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{note}</p>}
      {error && <p className="text-[11px] text-rose-600 dark:text-rose-400">{error}</p>}

      {/* Pages */}
      <div className="space-y-6 max-h-[72vh] overflow-y-auto rounded-lg border bg-muted/30 p-4 flex flex-col items-center">
        {pages.map((page, pi) => {
          const scale = pageWidth / page.width;
          const displayH = page.height * scale;
          return (
            <div
              key={pi}
              onClick={(e) => handlePageClick(e, pi, scale)}
              className="relative shadow-lg ring-1 ring-black/10 shrink-0"
              style={{ width: pageWidth, height: displayH, cursor: addMode ? "crosshair" : "default" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${page.image}`}
                alt={`Page ${pi + 1}`}
                width={pageWidth}
                height={displayH}
                className="absolute inset-0 w-full h-full select-none pointer-events-none"
                draggable={false}
              />

              {/* Existing-text fields — transparent until touched, so the real page
                  always shows through; paint only when focused or changed. */}
              {page.blocks.map((b) => {
                const isDirty = b.id in edited && edited[b.id] !== b.text;
                const isFocused = activeId === b.id;
                const active = isFocused || isDirty;
                return (
                  <input
                    key={b.id}
                    ref={(el) => { fieldRefs.current[b.id] = el; }}
                    type="text"
                    value={valueOf(b)}
                    onChange={(e) => setBlockText(b.id, e.target.value)}
                    onFocus={() => setActiveId(b.id)}
                    onKeyDown={(e) => handleFieldKey(e, b.id, false)}
                    spellCheck={false}
                    title="Click to edit"
                    style={{
                      position: "absolute",
                      left: b.x * scale,
                      top: b.y * scale - 1,
                      width: Math.max(b.w * scale + 6, 12 * scale),
                      height: Math.max(b.h * scale + 4, b.size * scale * 1.2),
                      fontSize: b.size * scale,
                      fontFamily: b.font,
                      color: active ? b.color : "transparent",
                      caretColor: b.color,
                      fontWeight: b.bold ? 700 : 400,
                      fontStyle: b.italic ? "italic" : "normal",
                      lineHeight: 1,
                      padding: 0, margin: 0,
                      border: isFocused ? "1px solid rgba(99,102,241,0.9)" : "none",
                      borderRadius: 2,
                      outline: "none",
                      boxShadow: isFocused ? "0 0 0 2px rgba(99,102,241,0.25)" : "none",
                      background: isFocused ? "#ffffff" : isDirty ? "rgba(255,247,214,0.97)" : "transparent",
                      cursor: "text",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      transition: "background-color 80ms ease",
                    }}
                  />
                );
              })}

              {/* Snap guide lines while dragging — show the row/column being aligned to. */}
              {guides && guides.page === pi && (
                <>
                  {guides.vx !== undefined && (
                    <div className="absolute top-0 bottom-0 w-px bg-indigo-500/70 pointer-events-none z-10"
                      style={{ left: guides.vx * scale }} />
                  )}
                  {guides.hy !== undefined && (
                    <div className="absolute left-0 right-0 h-px bg-indigo-500/70 pointer-events-none z-10"
                      style={{ top: guides.hy * scale }} />
                  )}
                </>
              )}

              {/* Added text boxes — draggable, multi-line, auto-fit, with a toolbar. */}
              {boxes.filter((bx) => bx.page === pi).map((bx) => {
                const isFocused = activeId === bx.id;
                const isDragging = drag?.id === bx.id;
                return (
                  <div
                    key={bx.id}
                    className="group/box"
                    style={{ position: "absolute", left: bx.x * scale, top: bx.y * scale, zIndex: isFocused ? 15 : 5 }}
                  >
                    {isFocused && !isDragging && (
                      <BoxToolbar
                        box={bx}
                        onChange={(p) => updateBox(bx.id, p)}
                        onDelete={() => removeBox(bx.id)}
                      />
                    )}
                    {/* Drag handle (top-left grip). Dragging snaps to form rows/columns.
                        Move/up live on the handle because it holds the pointer capture. */}
                    <div
                      onPointerDown={(e) => startDrag(e, bx, scale)}
                      onPointerMove={isDragging ? onDragMove : undefined}
                      onPointerUp={isDragging ? endDrag : undefined}
                      title="Drag to move"
                      className={`absolute -left-3.5 top-0 h-full w-3.5 rounded-l cursor-grab active:cursor-grabbing flex items-center justify-center
                        ${isFocused ? "opacity-100" : "opacity-0 group-hover/box:opacity-100"} transition-opacity`}
                      style={{ background: "rgba(99,102,241,0.85)", touchAction: "none" }}
                    >
                      <GripVertical className="h-3 w-3 text-white" />
                    </div>
                    <textarea
                      ref={(el) => {
                        fieldRefs.current[bx.id] = el;
                        // Auto-grow to fit content — but skip while the panel is hidden
                        // (display:none → scrollHeight 0 would collapse the box to 0).
                        if (el && el.offsetParent !== null) {
                          el.style.height = "auto";
                          el.style.height = `${el.scrollHeight}px`;
                        }
                      }}
                      value={bx.text}
                      onChange={(e) => updateBox(bx.id, { text: e.target.value })}
                      onFocus={() => setActiveId(bx.id)}
                      onBlur={() => { if (!bx.text.trim() && !isDragging) removeBox(bx.id); }}
                      onKeyDown={(e) => handleFieldKey(e, bx.id, true)}
                      placeholder="Type…"
                      spellCheck={false}
                      rows={1}
                      style={{
                        width: bx.w * scale,
                        fontSize: bx.size * scale,
                        fontFamily: "Helvetica, Arial, sans-serif",
                        fontWeight: bx.bold ? 700 : 400,
                        color: bx.color,
                        lineHeight: 1.18,
                        padding: "1px 3px", margin: 0,
                        border: isFocused ? "1px solid rgba(99,102,241,0.9)" : "1px dashed rgba(99,102,241,0.45)",
                        borderRadius: 2,
                        outline: "none",
                        boxShadow: isFocused ? "0 0 0 2px rgba(99,102,241,0.2)" : "none",
                        background: isFocused ? "#ffffff" : "rgba(255,255,255,0.65)",
                        resize: "none",
                        overflow: "hidden",
                        display: "block",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        The page above is the <strong>real PDF, shown exactly as-is</strong>. Click any line to edit
        it in place, or hit <strong>Add text</strong> and click a blank to drop a new field. Each new
        box has its <strong>own size &amp; colour</strong> (toolbar above it) and can be
        <strong> dragged by the grip</strong> — it snaps to the form&apos;s rows &amp; columns. Use
        <strong> Tab</strong> to move between fields, <strong>Enter</strong> for the next,
        <strong> Esc</strong> to cancel. <strong>Download filled PDF</strong> redraws only what you
        changed — existing text stays font-matched and pixel-identical. (Needs the Python backend.)
      </p>
    </div>
  );
}

/** Floating per-field toolbar for an added text box: size, bold, colour, delete. */
function BoxToolbar({
  box, onChange, onDelete,
}: {
  box: AddedBox;
  onChange: (patch: Partial<AddedBox>) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="absolute -top-9 left-0 z-30 flex items-center gap-0.5 rounded-md border bg-card px-1 py-0.5 shadow-md"
      // Keep the textarea focused when clicking toolbar buttons.
      onMouseDown={(e) => e.preventDefault()}
    >
      <button className="h-6 w-6 grid place-items-center rounded hover:bg-muted" title="Smaller" onClick={() => onChange({ size: Math.max(5, box.size - 1) })}>
        <Minus className="h-3 w-3" />
      </button>
      <span className="text-[10px] tabular-nums w-6 text-center text-muted-foreground">{Math.round(box.size)}</span>
      <button className="h-6 w-6 grid place-items-center rounded hover:bg-muted" title="Larger" onClick={() => onChange({ size: Math.min(48, box.size + 1) })}>
        <Plus className="h-3 w-3" />
      </button>
      <span className="mx-0.5 h-4 w-px bg-border" />
      <button
        className={`h-6 w-6 grid place-items-center rounded hover:bg-muted ${box.bold ? "bg-muted text-primary" : ""}`}
        title="Bold"
        onClick={() => onChange({ bold: !box.bold })}
      >
        <Bold className="h-3 w-3" />
      </button>
      <span className="mx-0.5 h-4 w-px bg-border" />
      <div className="flex items-center gap-0.5 px-0.5">
        {HEX_PRESETS.map((c) => (
          <button
            key={c}
            className="h-4 w-4 rounded-full ring-1 ring-black/15 grid place-items-center"
            style={{ background: c }}
            title={c}
            onClick={() => onChange({ color: c })}
          >
            {box.color === c && <Check className="h-2.5 w-2.5 text-white" />}
          </button>
        ))}
      </div>
      <span className="mx-0.5 h-4 w-px bg-border" />
      <button className="h-6 w-6 grid place-items-center rounded hover:bg-rose-500/10 text-rose-500" title="Delete this box" onClick={onDelete}>
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
