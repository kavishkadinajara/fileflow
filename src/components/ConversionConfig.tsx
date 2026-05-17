"use client";

import { Button } from "@/components/ui/button";
import {
  Select, SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StyleGallery } from "@/components/StyleGallery";
import { MEDIA_FORMATS } from "@/lib/converters/media";
import { FORMAT_META, formatBytes, getSupportedOutputs } from "@/lib/formats";
import { BUILTIN_TEMPLATES } from "@/lib/styles/templates";
import { useConversionStore } from "@/store/conversionStore";
import { useStudioStore } from "@/store/studioStore";
import type { ConvertOptions, DropzoneFile, FileFormat } from "@/types";
import { ArrowRight, LayoutGrid, Palette, Settings2, Sliders, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// Styled outputs are document formats produced from Markdown.
// Style picker only makes sense for these source→target pairs.
const STYLEABLE_TARGETS = new Set<FileFormat>(["pdf", "docx", "html"]);
const STYLEABLE_SOURCES = new Set<FileFormat>(["md"]);

type StyleMode = "preserve" | "template" | "custom";

const CATEGORY_LABELS: Record<string, string> = {
  document: "Documents",
  diagram: "Diagrams",
  data: "Data Formats",
  sql: "SQL Databases",
  image: "Images",
  audio: "Audio",
  video: "Video",
};

const VIDEO_COMPRESS_FORMATS = new Set<FileFormat>(["mp4", "webm", "avi", "mov", "mkv"]);

const QUALITY_PRESETS = [
  { key: "high",       label: "High",       crf: 18, hint: "Best quality" },
  { key: "balanced",   label: "Balanced",   crf: 23, hint: "Recommended"  },
  { key: "compressed", label: "Compressed", crf: 28, hint: "~50% smaller" },
  { key: "max",        label: "Max",        crf: 34, hint: "~75% smaller" },
] as const;

type QualityPreset = typeof QUALITY_PRESETS[number]["key"];

interface ConversionConfigProps {
  droppedFile: DropzoneFile;
  onRemove: () => void;
}

export function ConversionConfig({ droppedFile, onRemove }: ConversionConfigProps) {
  const { file, detectedFormat } = droppedFile;
  const [fromFormat, setFromFormat] = useState<FileFormat>(detectedFormat ?? "txt");
  const [toFormat, setToFormat] = useState<FileFormat | "">("");
  const [options, setOptions] = useState<ConvertOptions>({});
  const [showOptions, setShowOptions] = useState(false);
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>("balanced");
  // Style mode + template (only active for MD → PDF/DOCX/HTML)
  const [styleMode, setStyleMode] = useState<StyleMode>("preserve");
  // Default to first non-preserve template (preserve has order=0)
  const [templateId, setTemplateId] = useState<string>(
    BUILTIN_TEMPLATES.find((t) => t.id !== "preserve-original")?.id ?? BUILTIN_TEMPLATES[0]?.id ?? ""
  );
  const [galleryOpen, setGalleryOpen] = useState(false);
  const savedCustom = useStudioStore((s) => s.savedCustom);

  const addJob = useConversionStore((s) => s.addJob);
  const addMediaJob = useConversionStore((s) => s.addMediaJob);
  const setActiveFile = useConversionStore((s) => s.setActiveFile);
  const supportedOutputs = getSupportedOutputs(fromFormat);

  // Read text content and set as active file context for AI chat
  useEffect(() => {
    if (MEDIA_FORMATS.has(fromFormat)) return; // skip binary media
    const textFormats = ["md", "html", "txt", "json", "yaml", "csv", "mermaid", "mssql", "mysql", "pgsql", "svg"];
    if (textFormats.includes(fromFormat)) {
      file.text().then((content) => {
        setActiveFile({
          fileName: file.name,
          fileFormat: fromFormat,
          content,
          file,
          toFormat: (toFormat || undefined) as FileFormat | undefined,
        });
      }).catch(() => { /* binary file – skip */ });
    }
    return () => {
      setActiveFile(null);
    };
  }, [file, fromFormat, toFormat, setActiveFile]);

  const handleConvert = () => {
    if (!toFormat) return;
    if (MEDIA_FORMATS.has(fromFormat)) {
      addMediaJob(file, fromFormat, toFormat as FileFormat, options);
    } else {
      const styleable =
        STYLEABLE_SOURCES.has(fromFormat) && STYLEABLE_TARGETS.has(toFormat as FileFormat);
      const styleId = styleable && styleMode === "template" ? templateId : undefined;
      const inlineCustom = styleable && styleMode === "custom" ? savedCustom ?? undefined : undefined;
      addJob(file, fromFormat, toFormat as FileFormat, options, styleId, inlineCustom);
    }
    onRemove();
  };

  const isStyleable =
    STYLEABLE_SOURCES.has(fromFormat) &&
    !!toFormat &&
    STYLEABLE_TARGETS.has(toFormat as FileFormat);
  const selectedTemplate = BUILTIN_TEMPLATES.find((t) => t.id === templateId);

  // Group outputs by category
  const grouped = supportedOutputs.reduce<Record<string, FileFormat[]>>((acc, fmt) => {
    const cat = FORMAT_META[fmt].category;
    (acc[cat] ??= []).push(fmt);
    return acc;
  }, {});

  const allFormats = Object.keys(FORMAT_META) as FileFormat[];
  const fromGrouped = allFormats.reduce<Record<string, FileFormat[]>>((acc, fmt) => {
    const cat = FORMAT_META[fmt].category;
    (acc[cat] ??= []).push(fmt);
    return acc;
  }, {});

  const isVideoToVideo =
    VIDEO_COMPRESS_FORMATS.has(fromFormat as FileFormat) &&
    !!toFormat &&
    VIDEO_COMPRESS_FORMATS.has(toFormat as FileFormat);

  return (
    <div className="card-hover rounded-2xl border bg-card p-4 space-y-3 transition-all duration-200">
      {/* File info */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground text-xs font-bold uppercase">
            {file.name.split(".").pop()?.slice(0, 4)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Remove file"
        >
          ✕
        </button>
      </div>

      {/* From / To selectors */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">From</label>
          <Select value={fromFormat} onValueChange={(v) => { setFromFormat(v as FileFormat); setToFormat(""); }}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(fromGrouped).map(([cat, fmts]) => (
                <SelectGroup key={cat}>
                  <SelectLabel>{CATEGORY_LABELS[cat] ?? cat}</SelectLabel>
                  {fmts.map((f) => (
                    <SelectItem key={f} value={f}>{FORMAT_META[f].label}</SelectItem>
                  ))}
                  <SelectSeparator />
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ArrowRight className="h-4 w-4 mt-5 shrink-0 text-muted-foreground" />

        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">To</label>
          <Select
            value={toFormat}
            onValueChange={(v) => setToFormat(v as FileFormat)}
            disabled={supportedOutputs.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(grouped).map(([cat, fmts]) => (
                <SelectGroup key={cat}>
                  <SelectLabel>{CATEGORY_LABELS[cat] ?? cat}</SelectLabel>
                  {fmts.map((f) => (
                    <SelectItem key={f} value={f}>
                      {FORMAT_META[f].label}
                      {f === fromFormat ? " (Compress)" : ""}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Video Quality & Compression options (auto-shown for video→video) ── */}
      {isVideoToVideo && (
        <div className="rounded-xl border bg-muted/30 p-3 space-y-3">
          <p className="text-xs font-medium flex items-center gap-1.5 text-foreground/80">
            <Zap className="h-3 w-3 text-primary" />
            Video Compression
          </p>

          {/* Quality presets */}
          <div>
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-1.5">
              Quality
            </label>
            <div className="grid grid-cols-4 gap-1">
              {QUALITY_PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => {
                    setQualityPreset(p.key);
                    setOptions((o) => ({ ...o, videoCrf: p.crf }));
                  }}
                  title={p.hint}
                  className={`rounded-lg border py-1.5 px-1 text-center transition-all ${
                    qualityPreset === p.key
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background hover:bg-muted border-input"
                  }`}
                >
                  <span className="block text-[11px] font-semibold leading-none">{p.label}</span>
                  <span className={`block text-[9px] mt-0.5 leading-none ${
                    qualityPreset === p.key ? "opacity-75" : "text-muted-foreground"
                  }`}>{p.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Resolution */}
          <div>
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-1">
              Resolution
            </label>
            <Select
              value={options.videoResolution ?? "original"}
              onValueChange={(v) => setOptions((o) => ({ ...o, videoResolution: v as ConvertOptions["videoResolution"] }))}
            >
              <SelectTrigger className="h-7 text-xs w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="original">Original resolution</SelectItem>
                <SelectItem value="1080p">1080p — Full HD</SelectItem>
                <SelectItem value="720p">720p — HD</SelectItem>
                <SelectItem value="480p">480p — SD</SelectItem>
                <SelectItem value="360p">360p — Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Advanced options (contextual — PDF / Mermaid / JPEG) */}
      {toFormat && (toFormat === "pdf" || fromFormat === "mermaid" || toFormat === "jpeg") && (
        <div>
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings2 className="h-3 w-3" />
            {showOptions ? "Hide" : "Show"} options
          </button>

          {showOptions && (
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border p-3 bg-muted/40">
              {toFormat === "pdf" && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Page size</label>
                    <Select
                      value={options.pdfPageSize ?? "A4"}
                      onValueChange={(v) => setOptions((o) => ({ ...o, pdfPageSize: v as "A4" }))}
                    >
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["A4", "A3", "Letter", "Legal"].map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Orientation</label>
                    <Select
                      value={options.pdfOrientation ?? "portrait"}
                      onValueChange={(v) => setOptions((o) => ({ ...o, pdfOrientation: v as "portrait" }))}
                    >
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {fromFormat === "mermaid" && (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Diagram theme</label>
                  <Select
                    value={options.mermaidTheme ?? "default"}
                    onValueChange={(v) => setOptions((o) => ({ ...o, mermaidTheme: v as "default" }))}
                  >
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["default", "dark", "forest", "neutral"].map((t) => (
                        <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {toFormat === "jpeg" && (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Quality (1-100)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={options.imageQuality ?? 90}
                    onChange={(e) => setOptions((o) => ({ ...o, imageQuality: Number(e.target.value) }))}
                    className="w-full h-7 rounded-md border bg-background px-2 text-xs"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Style picker (MD → PDF/DOCX/HTML only) ───────────────────────── */}
      {isStyleable && (
        <div className="rounded-xl border bg-muted/30 p-3 space-y-3">
          <p className="text-xs font-medium flex items-center gap-1.5 text-foreground/80">
            <Palette className="h-3 w-3 text-primary" />
            Document Style
          </p>

          {/* Mode toggle: Preserve vs Template vs Custom */}
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setStyleMode("preserve")}
              className={`rounded-lg border py-1.5 px-1 text-center transition-all ${
                styleMode === "preserve"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background hover:bg-muted border-input"
              }`}
            >
              <span className="block text-[11px] font-semibold leading-none">As-is</span>
              <span className={`block text-[9px] mt-0.5 leading-none ${
                styleMode === "preserve" ? "opacity-75" : "text-muted-foreground"
              }`}>Preserve</span>
            </button>
            <button
              onClick={() => setStyleMode("template")}
              className={`rounded-lg border py-1.5 px-1 text-center transition-all ${
                styleMode === "template"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background hover:bg-muted border-input"
              }`}
            >
              <span className="flex items-center justify-center gap-1 text-[11px] font-semibold leading-none">
                <Sparkles className="h-2.5 w-2.5" /> Template
              </span>
              <span className={`block text-[9px] mt-0.5 leading-none ${
                styleMode === "template" ? "opacity-75" : "text-muted-foreground"
              }`}>Pick a style</span>
            </button>
            <button
              onClick={() => setStyleMode("custom")}
              className={`rounded-lg border py-1.5 px-1 text-center transition-all ${
                styleMode === "custom"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background hover:bg-muted border-input"
              }`}
            >
              <span className="flex items-center justify-center gap-1 text-[11px] font-semibold leading-none">
                <Sliders className="h-2.5 w-2.5" /> Custom
              </span>
              <span className={`block text-[9px] mt-0.5 leading-none ${
                styleMode === "custom" ? "opacity-75" : "text-muted-foreground"
              }`}>{savedCustom ? "Your style" : "Build one"}</span>
            </button>
          </div>

          {/* Custom mode — link out to /studio */}
          {styleMode === "custom" && (
            <div className="space-y-2">
              {savedCustom ? (
                <div className="p-2.5 rounded-lg border border-input bg-background space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Sliders className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-xs font-medium truncate">{savedCustom.name}</span>
                    </div>
                    <Link
                      href={`/studio${templateId ? `?templateId=${templateId}` : ""}`}
                      className="text-[10px] text-primary hover:underline whitespace-nowrap"
                    >
                      Edit →
                    </Link>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Will be applied on next convert.
                  </p>
                </div>
              ) : (
                <Link
                  href={`/studio${templateId ? `?templateId=${templateId}` : ""}`}
                  className="flex items-center justify-center gap-1.5 w-full h-9 rounded-lg bg-gradient-brand text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  Open Style Studio →
                </Link>
              )}
            </div>
          )}

          {/* Template picker — only when Template mode active */}
          {styleMode === "template" && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BUILTIN_TEMPLATES
                      .filter((t) => t.id !== "preserve-original")
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">
                          <span className="font-medium">{t.name}</span>
                          <span className="text-muted-foreground ml-1.5 capitalize">— {t.category}</span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => setGalleryOpen(true)}
                  title="Browse all styles with previews"
                  className="h-8 px-2.5 rounded-md border border-input bg-background hover:bg-muted text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <LayoutGrid className="h-3 w-3" />
                  Browse
                </button>
              </div>
              {selectedTemplate && (
                <p className="text-[10px] text-muted-foreground leading-snug">
                  {selectedTemplate.description}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Style Gallery modal */}
      <StyleGallery
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        selectedId={templateId}
        onSelect={(t) => {
          setTemplateId(t.id);
          setStyleMode("template");
        }}
      />


      <Button
        className="w-full bg-gradient-brand hover:opacity-90 text-white border-0 transition-opacity duration-200"
        disabled={!toFormat}
        onClick={handleConvert}
      >
        {isVideoToVideo
          ? `Compress → ${toFormat ? FORMAT_META[toFormat as FileFormat].label : "…"}`
          : `Convert → ${toFormat ? FORMAT_META[toFormat as FileFormat].label : "…"}`
        }
      </Button>
      {toFormat && MEDIA_FORMATS.has(fromFormat) && (
        <p className="text-[10px] text-muted-foreground text-center">
          Audio/video runs in your browser via FFmpeg — first use downloads ~32 MB
        </p>
      )}
    </div>
  );
}
