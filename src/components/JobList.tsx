"use client";

import { OutputPreview } from "@/components/OutputPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { FORMAT_META, getSupportedOutputs } from "@/lib/formats";
import { cn } from "@/lib/utils";
import { useConversionStore } from "@/store/conversionStore";
import type { ConversionJob, FileFormat } from "@/types";
import {
    AlertCircle,
    Check,
    CheckCircle2,
    Copy,
    Download,
    Eye,
    FolderDown,
    Loader2,
    Pencil,
    RefreshCw,
    X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const TEXT_OUTPUTS: FileFormat[] = [
  "md", "html", "txt", "json", "yaml", "csv", "svg",
  "mssql", "mysql", "pgsql", "mermaid",
];

function JobCard({ job }: { job: ConversionJob }) {
  const downloadJob = useConversionStore((s) => s.downloadJob);
  const removeJob = useConversionStore((s) => s.removeJob);
  const setEditingJob = useConversionStore((s) => s.setEditingJob);
  const addJobFromContent = useConversionStore((s) => s.addJobFromContent);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const fromMeta = FORMAT_META[job.fromFormat];
  const toMeta = FORMAT_META[job.toFormat];

  async function handleCopy() {
    if (!job.resultBlob) return;
    try {
      const text = await job.resultBlob.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  }

  async function reconvertTo(newFormat: FileFormat) {
    if (!job.sourceContent) return;
    await addJobFromContent(
      job.sourceContent,
      job.fileName,
      job.fromFormat,
      newFormat,
      job.options
    );
  }

  return (
    <>
      <div
        className={cn(
          "animate-fade-up flex flex-col gap-2.5 rounded-xl border bg-card p-4 transition-colors duration-200",
          job.status === "done" && "border-green-500/25 bg-green-500/5",
          job.status === "error" && "border-destructive/25 bg-destructive/5",
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
                job.status === "done" && "bg-green-500",
                job.status === "error" && "bg-destructive",
                job.status === "processing" && "bg-primary animate-pulse",
                job.status === "idle" && "bg-muted-foreground/50"
              )}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{job.fileName}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 rounded">
                  {fromMeta.label}
                </Badge>
                <span className="text-muted-foreground text-xs">&rarr;</span>
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
            {/* Preview button (done only) */}
            {job.status === "done" && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                onClick={() => setPreviewOpen(true)}
                aria-label="Preview"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            )}

            {/* Copy button (done + text output only) */}
            {job.status === "done" && TEXT_OUTPUTS.includes(job.toFormat) && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={handleCopy}
                aria-label="Copy to clipboard"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            )}

            {/* Edit & Reconvert button (done + has source content) */}
            {job.status === "done" && job.sourceContent && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                onClick={() => setEditingJob(job)}
                aria-label="Edit & Reconvert"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}

            {/* Quick Reconvert dropdown (done + has source content) */}
            {job.status === "done" && job.sourceContent && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                    aria-label="Reconvert to..."
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel className="text-xs">Reconvert to...</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {getSupportedOutputs(job.fromFormat)
                    .filter((f) => f !== job.toFormat)
                    .map((fmt) => (
                      <DropdownMenuItem
                        key={fmt}
                        onClick={() => reconvertTo(fmt)}
                        className="text-xs"
                      >
                        {FORMAT_META[fmt].label}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Download button (done only) */}
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

            {/* Remove button (always) */}
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
                Converting...
              </span>
              <span className="font-medium text-foreground">{job.progress}%</span>
            </div>
            <div className="relative overflow-hidden rounded-full">
              <Progress value={job.progress} className="h-1.5" />
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
              <span>Ready</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setPreviewOpen(true)}
                className="font-medium text-primary hover:underline flex items-center gap-1"
              >
                <Eye className="h-3 w-3" /> Preview
              </button>
              <span className="text-border">|</span>
              <button
                onClick={() => downloadJob(job.id)}
                className="font-medium text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
              >
                Download <Download className="h-3 w-3" />
              </button>
            </div>
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

      {/* Output Preview dialog */}
      {job.status === "done" && (
        <OutputPreview job={job} open={previewOpen} onOpenChange={setPreviewOpen} />
      )}
    </>
  );
}

export function JobList() {
  const jobs = useConversionStore((s) => s.jobs);
  const clearJobs = useConversionStore((s) => s.clearJobs);
  const downloadAllAsZip = useConversionStore((s) => s.downloadAllAsZip);

  // Toast notifications when jobs complete or fail
  const prevJobsRef = useRef(jobs);
  useEffect(() => {
    const prev = prevJobsRef.current;
    for (const job of jobs) {
      const prevJob = prev.find((j) => j.id === job.id);
      if (prevJob?.status === "processing" && job.status === "done") {
        toast({
          title: "Conversion complete",
          description: `${job.fileName} is ready to download`,
        });
      }
      if (prevJob?.status === "processing" && job.status === "error") {
        toast({
          title: "Conversion failed",
          description: job.error || "Something went wrong",
          variant: "destructive",
        });
      }
    }
    prevJobsRef.current = jobs;
  }, [jobs]);

  if (jobs.length === 0) return null;

  const doneCount = jobs.filter((j) => j.status === "done").length;
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
        <div className="flex items-center gap-1.5">
          {doneCount >= 2 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 border-green-500/30 text-green-700 dark:text-green-400 hover:bg-green-500/10"
              onClick={() => downloadAllAsZip()}
            >
              <FolderDown className="h-3 w-3" />
              Download All ({doneCount})
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearJobs}>
            Clear all
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
