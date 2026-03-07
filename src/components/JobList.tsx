"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FORMAT_META } from "@/lib/formats";
import { cn } from "@/lib/utils";
import { useConversionStore } from "@/store/conversionStore";
import type { ConversionJob } from "@/types";
import { AlertCircle, CheckCircle2, Download, Loader2, X } from "lucide-react";

function JobCard({ job }: { job: ConversionJob }) {
  const downloadJob = useConversionStore((s) => s.downloadJob);
  const removeJob   = useConversionStore((s) => s.removeJob);

  const fromMeta = FORMAT_META[job.fromFormat];
  const toMeta   = FORMAT_META[job.toFormat];

  return (
    <div
      className={cn(
        "animate-fade-up flex flex-col gap-2.5 rounded-xl border bg-card p-4 transition-colors duration-200",
        job.status === "done"       && "border-green-500/25 bg-green-500/5",
        job.status === "error"      && "border-destructive/25 bg-destructive/5",
        job.status === "processing" && "border-primary/25"
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Status dot */}
          <div
            className={cn(
              "shrink-0 h-2 w-2 rounded-full mt-1",
              job.status === "done"       && "bg-green-500",
              job.status === "error"      && "bg-destructive",
              job.status === "processing" && "bg-primary animate-pulse",
              job.status === "idle"       && "bg-muted-foreground/50"
            )}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{job.fileName}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 rounded">
                {fromMeta.label}
              </Badge>
              <span className="text-muted-foreground text-xs">→</span>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-4 rounded",
                  job.status === "done" && "bg-green-500/15 text-green-600 dark:text-green-400"
                )}
              >
                {toMeta.label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {job.status === "done" && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-500/10"
              onClick={() => downloadJob(job.id)}
              aria-label="Download"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => removeJob(job.id)}
            aria-label="Remove"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Processing */}
      {job.status === "processing" && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              Converting…
            </span>
            <span className="font-medium text-foreground">{job.progress}%</span>
          </div>
          <div className="relative overflow-hidden rounded-full">
            <Progress value={job.progress} className="h-1.5" />
            {/* Shimmer sweep */}
            <div
              className="pointer-events-none absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/25 to-transparent"
              style={{ backgroundSize: "200% 100%" }}
            />
          </div>
        </div>
      )}

      {/* Done */}
      {job.status === "done" && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Conversion complete</span>
          </div>
          <button
            onClick={() => downloadJob(job.id)}
            className="text-xs font-medium text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
          >
            Download <Download className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Error */}
      {job.status === "error" && (
        <div className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{job.error ?? "Something went wrong. Check the browser console for details."}</span>
        </div>
      )}
    </div>
  );
}

export function JobList() {
  const jobs      = useConversionStore((s) => s.jobs);
  const clearJobs = useConversionStore((s) => s.clearJobs);

  if (jobs.length === 0) return null;

  const doneCount       = jobs.filter((j) => j.status === "done").length;
  const processingCount = jobs.filter((j) => j.status === "processing").length;

  return (
    <div className="space-y-3 animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Conversions
          </h2>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground">
              {jobs.length}
            </span>
            {processingCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-[10px] font-medium text-primary">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                {processingCount} running
              </span>
            )}
            {doneCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-500/10 text-[10px] font-medium text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-2.5 w-2.5" />
                {doneCount} done
              </span>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearJobs}>
          Clear all
        </Button>
      </div>
      <div className="space-y-2">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
