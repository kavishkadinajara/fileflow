"use client";

import { detectFormat, detectTextFormat } from "@/lib/formats";
import { cn } from "@/lib/utils";
import type { DropzoneFile, FileFormat } from "@/types";
import { UploadCloud } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { v4 as uuidv4 } from "uuid";

interface FileUploaderProps {
  onFilesAccepted: (files: DropzoneFile[]) => void;
}

const FORMAT_CHIPS: { label: string; color: string }[] = [
  { label: "MD",       color: "bg-blue-500/12 text-blue-600 dark:text-blue-400" },
  { label: "DOCX",     color: "bg-violet-500/12 text-violet-600 dark:text-violet-400" },
  { label: "HTML",     color: "bg-orange-500/12 text-orange-600 dark:text-orange-400" },
  { label: "PDF",      color: "bg-red-500/12 text-red-600 dark:text-red-400" },
  { label: "JSON",     color: "bg-yellow-500/12 text-yellow-700 dark:text-yellow-400" },
  { label: "CSV",      color: "bg-green-500/12 text-green-600 dark:text-green-400" },
  { label: "SQL",      color: "bg-cyan-500/12 text-cyan-600 dark:text-cyan-400" },
  { label: "Mermaid",  color: "bg-indigo-500/12 text-indigo-600 dark:text-indigo-400" },
  { label: "PNG/JPEG", color: "bg-pink-500/12 text-pink-600 dark:text-pink-400" },
];

export function FileUploader({ onFilesAccepted }: FileUploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const mapped: DropzoneFile[] = [];
      for (const file of acceptedFiles) {
        let fmt: FileFormat | undefined = detectFormat(file);
        if (fmt === "mssql" || fmt === "txt") {
          try {
            const text = await file.text();
            fmt = detectTextFormat(text);
          } catch {
            // Keep extension-based detection
          }
        }
        mapped.push({ id: uuidv4(), file, detectedFormat: fmt });
      }
      onFilesAccepted(mapped);
    },
    [onFilesAccepted]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropAccepted: () => setIsDragActive(false),
    onDropRejected: () => setIsDragActive(false),
    multiple: true,
    maxSize: 50 * 1024 * 1024,
  });

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-5 rounded-2xl px-8 py-14 text-center cursor-pointer overflow-hidden transition-all duration-300",
          isDragActive
            ? "drag-active-border bg-primary/5 scale-[1.01]"
            : "border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/20"
        )}
      >
        {/* Radial glow on drag */}
        {isDragActive && (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.12)_0%,transparent_70%)]" />
        )}

        <input {...getInputProps()} />

        {/* Animated icon */}
        <div
          className={cn(
            "relative flex h-16 w-16 items-center justify-center rounded-2xl border-2 transition-all duration-300",
            isDragActive
              ? "border-primary bg-primary/15 text-primary scale-110 animate-glow-pulse"
              : "border-border bg-muted/60 text-muted-foreground"
          )}
        >
          <UploadCloud
            className={cn(
              "h-8 w-8 transition-colors",
              !isDragActive && "animate-float"
            )}
          />
        </div>

        <div className="space-y-1.5">
          <p className="font-semibold text-base">
            {isDragActive ? (
              <span className="text-primary animate-fade-in">Release to add files</span>
            ) : (
              "Drag & drop files, or click to browse"
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            Up to 50 MB per file · Multiple files supported
          </p>
        </div>
      </div>

      {/* Format chips */}
      <div className="flex flex-wrap gap-1.5 px-1">
        {FORMAT_CHIPS.map(({ label, color }) => (
          <span
            key={label}
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium",
              color
            )}
          >
            {label}
          </span>
        ))}
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium text-muted-foreground bg-muted">
          + more
        </span>
      </div>
    </div>
  );
}
