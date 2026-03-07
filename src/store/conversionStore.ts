import { base64ToBlob, downloadBlob, fileToBase64 } from "@/lib/utils";
import type { ConversionJob, ConvertOptions, FileFormat } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";

interface ConversionStore {
  jobs: ConversionJob[];
  addJob: (
    file: File,
    fromFormat: FileFormat,
    toFormat: FileFormat,
    options?: ConvertOptions
  ) => Promise<void>;
  removeJob: (id: string) => void;
  clearJobs: () => void;
  downloadJob: (id: string) => void;
}

export const useConversionStore = create<ConversionStore>((set, get) => ({
  jobs: [],

  addJob: async (file, fromFormat, toFormat, options) => {
    const id = uuidv4();
    const job: ConversionJob = {
      id,
      fileName: file.name,
      fromFormat,
      toFormat,
      status: "processing",
      progress: 10,
      createdAt: new Date(),
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
}));
