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
import { FORMAT_META, formatBytes, getSupportedOutputs } from "@/lib/formats";
import { useConversionStore } from "@/store/conversionStore";
import type { ConvertOptions, DropzoneFile, FileFormat } from "@/types";
import { ArrowRight, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";

const CATEGORY_LABELS: Record<string, string> = {
  document: "Documents",
  diagram: "Diagrams",
  data: "Data Formats",
  sql: "SQL Databases",
  image: "Images",
};

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

  const addJob = useConversionStore((s) => s.addJob);
  const setActiveFile = useConversionStore((s) => s.setActiveFile);
  const supportedOutputs = getSupportedOutputs(fromFormat);

  // Read text content and set as active file context for AI chat
  useEffect(() => {
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
      // Clear active file when this config is removed
      setActiveFile(null);
    };
  }, [file, fromFormat, toFormat, setActiveFile]);

  const handleConvert = () => {
    if (!toFormat) return;
    addJob(file, fromFormat, toFormat as FileFormat, options);
    onRemove();
  };

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
        {/* From */}
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

        {/* To */}
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
                    <SelectItem key={f} value={f}>{FORMAT_META[f].label}</SelectItem>
                  ))}
                  <SelectSeparator />
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Advanced options (contextual) */}
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

      <Button
        className="w-full bg-gradient-brand hover:opacity-90 text-white border-0 transition-opacity duration-200"
        disabled={!toFormat}
        onClick={handleConvert}
      >
        Convert → {toFormat ? FORMAT_META[toFormat as FileFormat].label : "…"}
      </Button>
    </div>
  );
}
