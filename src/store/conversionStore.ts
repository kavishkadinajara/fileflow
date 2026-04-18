import { base64ToBlob, downloadBlob, fileToBase64 } from "@/lib/utils";
import { convertMedia } from "@/lib/converters/media";
import type { ConversionJob, ConvertOptions, FileFormat } from "@/types";
import JSZip from "jszip";
import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";

// Text-based formats whose source content can be preserved for edit/reconvert
const TEXT_FORMATS: FileFormat[] = [
  "md", "html", "txt", "json", "yaml", "csv",
  "mermaid", "mssql", "mysql", "pgsql", "svg",
];

// ─── Shared file context for AI chat ─────────────────────────────────────────
export interface ActiveFileContext {
  fileName: string;
  fileFormat: FileFormat;
  content: string;       // text content of the file
  file: File;            // original File object for conversion
  toFormat?: FileFormat;  // selected output format
}

interface ConversionStore {
  jobs: ConversionJob[];
  /** Currently active file available for AI modification */
  activeFile: ActiveFileContext | null;
  setActiveFile: (ctx: ActiveFileContext | null) => void;
  /** Job whose source content should be loaded into the editor for reconversion */
  editingJob: ConversionJob | null;
  setEditingJob: (job: ConversionJob | null) => void;
  addJob: (
    file: File,
    fromFormat: FileFormat,
    toFormat: FileFormat,
    options?: ConvertOptions
  ) => Promise<void>;
  /** Add a job using modified text content instead of a File object */
  addJobFromContent: (
    content: string,
    fileName: string,
    fromFormat: FileFormat,
    toFormat: FileFormat,
    options?: ConvertOptions
  ) => Promise<void>;
  removeJob: (id: string) => void;
  clearJobs: () => void;
  downloadJob: (id: string) => void;
  downloadAllAsZip: () => Promise<void>;
  /** Client-side audio/video conversion via FFmpeg.wasm (no API call) */
  addMediaJob: (
    file: File,
    fromFormat: FileFormat,
    toFormat: FileFormat,
    options?: ConvertOptions,
  ) => Promise<void>;
}

export const useConversionStore = create<ConversionStore>((set, get) => ({
  jobs: [],
  activeFile: null,
  editingJob: null,

  setActiveFile: (ctx) => set({ activeFile: ctx }),
  setEditingJob: (job) => set({ editingJob: job }),

  addJob: async (file, fromFormat, toFormat, options) => {
    const id = uuidv4();

    // Preserve source content for text-based formats (enables edit & reconvert)
    let sourceContent: string | undefined;
    if (TEXT_FORMATS.includes(fromFormat)) {
      try { sourceContent = await file.text(); } catch { /* binary */ }
    }

    const job: ConversionJob = {
      id,
      fileName: file.name,
      fromFormat,
      toFormat,
      status: "processing",
      progress: 10,
      createdAt: new Date(),
      sourceContent,
      sourceFile: file,
      options,
    };

    set((state) => ({ jobs: [job, ...state.jobs] }));

    // Simulated progress
    const tick = setInterval(() => {
      set((state) => ({
        jobs: state.jobs.map((j) =>
          j.id === id && j.status === "processing"
            ? { ...j, progress: Math.min(j.progress + 15, 85) }
            : j
        ),
      }));
    }, 600);

    try {
      const fileBase64 = await fileToBase64(file);
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64, fileName: file.name, fromFormat, toFormat, options }),
      });

      clearInterval(tick);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Conversion failed");
      }

      const resultBlob = base64ToBlob(data.fileBase64, data.mimeType);

      set((state) => ({
        jobs: state.jobs.map((j) =>
          j.id === id
            ? { ...j, status: "done", progress: 100, resultUrl: URL.createObjectURL(resultBlob), resultBlob, fileName: data.fileName }
            : j
        ),
      }));
    } catch (err) {
      clearInterval(tick);
      set((state) => ({
        jobs: state.jobs.map((j) =>
          j.id === id
            ? { ...j, status: "error", progress: 0, error: err instanceof Error ? err.message : "Unknown error" }
            : j
        ),
      }));
    }
  },

  removeJob: (id) => {
    const job = get().jobs.find((j) => j.id === id);
    if (job?.resultUrl) URL.revokeObjectURL(job.resultUrl);
    set((state) => ({ jobs: state.jobs.filter((j) => j.id !== id) }));
  },

  clearJobs: () => {
    get().jobs.forEach((j) => { if (j.resultUrl) URL.revokeObjectURL(j.resultUrl); });
    set({ jobs: [] });
  },

  downloadJob: (id) => {
    const job = get().jobs.find((j) => j.id === id);
    if (!job || !job.resultBlob) return;
    downloadBlob(job.resultBlob, job.fileName);
  },

  downloadAllAsZip: async () => {
    const doneJobs = get().jobs.filter((j) => j.status === "done" && j.resultBlob);
    if (doneJobs.length === 0) return;
    const zip = new JSZip();
    const usedNames = new Map<string, number>();
    for (const job of doneJobs) {
      let name = job.fileName;
      const count = usedNames.get(name) ?? 0;
      if (count > 0) {
        const dot = name.lastIndexOf(".");
        name = dot >= 0 ? `${name.slice(0, dot)}_${count}${name.slice(dot)}` : `${name}_${count}`;
      }
      usedNames.set(job.fileName, count + 1);
      zip.file(name, job.resultBlob!);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const date = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `fileflow-batch-${date}.zip`);
  },

  addJobFromContent: async (content, fileName, fromFormat, toFormat, options) => {
    // If same format, just provide the AI-modified content as a direct download (no API call needed)
    if (fromFormat === toFormat) {
      const id = uuidv4();
      const blob = new Blob([content], { type: "text/plain" });
      const job: ConversionJob = {
        id,
        fileName: `AI-modified_${fileName}`,
        fromFormat,
        toFormat,
        status: "done",
        progress: 100,
        resultUrl: URL.createObjectURL(blob),
        resultBlob: blob,
        createdAt: new Date(),
        sourceContent: content,
        options,
      };
      set((state) => ({ jobs: [job, ...state.jobs] }));
      return;
    }
    // Different format: create File object and use normal conversion pipeline
    const blob = new Blob([content], { type: "text/plain" });
    const file = new File([blob], fileName, { type: "text/plain" });
    return get().addJob(file, fromFormat, toFormat, options);
  },

  addMediaJob: async (file, fromFormat, toFormat, options) => {
    const id = uuidv4();

    // Start job immediately — FFmpeg WASM downloads on first call (~32 MB, may take a few seconds)
    const job: ConversionJob = {
      id,
      fileName: file.name,
      fromFormat,
      toFormat,
      status: "processing",
      progress: 0,
      createdAt: new Date(),
      // sourceContent omitted: binary media cannot be text-edited/reconverted
    };

    set((state) => ({ jobs: [job, ...state.jobs] }));

    try {
      const mediaOpts = options ? {
        videoCrf:          options.videoCrf,
        videoResolution:   options.videoResolution,
        videoAudioBitrate: options.videoAudioBitrate,
      } : undefined;

      const { blob, fileName } = await convertMedia(
        file,
        fromFormat,
        toFormat,
        (percent) => {
          set((state) => ({
            jobs: state.jobs.map((j) =>
              j.id === id && j.status === "processing"
                ? { ...j, progress: percent }
                : j
            ),
          }));
        },
        mediaOpts,
      );

      const resultUrl = URL.createObjectURL(blob);
      set((state) => ({
        jobs: state.jobs.map((j) =>
          j.id === id
            ? { ...j, status: "done", progress: 100, resultUrl, resultBlob: blob, fileName }
            : j
        ),
      }));
    } catch (err) {
      set((state) => ({
        jobs: state.jobs.map((j) =>
          j.id === id
            ? {
                ...j,
                status: "error",
                progress: 0,
                error: err instanceof Error ? err.message : "Media conversion failed",
              }
            : j
        ),
      }));
    }
  },
}));
