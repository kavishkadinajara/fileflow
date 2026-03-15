"use client";

import {
    CodePreview,
    CsvPreview,
    HtmlPreview,
    MarkdownPreview,
    PlainTextPreview,
    SvgPreview,
} from "@/components/LivePreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { FORMAT_META } from "@/lib/formats";
import { useConversionStore } from "@/store/conversionStore";
import type { ConversionJob, FileFormat } from "@/types";
import {
    Download,
    Eye,
    FileWarning,
    Maximize,
    Music,
    Pause,
    Play,
    Volume2,
    VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const TEXT_OUTPUTS: FileFormat[] = [
  "md", "html", "txt", "json", "yaml", "csv", "svg",
  "mssql", "mysql", "pgsql", "mermaid",
];

interface OutputPreviewProps {
  job: ConversionJob;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OutputPreview({ job, open, onOpenChange }: OutputPreviewProps) {
  const downloadJob = useConversionStore((s) => s.downloadJob);
  const [textContent, setTextContent] = useState<string>("");

  useEffect(() => {
    if (!open || !job.resultBlob) return;
    if (TEXT_OUTPUTS.includes(job.toFormat)) {
      job.resultBlob.text().then(setTextContent);
    }
  }, [open, job.resultBlob, job.toFormat]);

  // Wider dialog for video
  const isVideo = ["mp4", "webm", "avi", "mov", "mkv"].includes(job.toFormat);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isVideo ? "max-w-5xl" : "max-w-4xl"} max-h-[90vh] overflow-hidden flex flex-col`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4 text-primary" />
            Preview: {job.fileName}
          </DialogTitle>
          <div className="flex items-center gap-2 pt-1">
            <Badge variant="secondary" className="text-[10px]">
              {FORMAT_META[job.toFormat]?.label ?? job.toFormat.toUpperCase()}
            </Badge>
            {job.options?.pdfPageSize && (
              <Badge variant="outline" className="text-[10px]">
                {job.options.pdfPageSize}
              </Badge>
            )}
            {job.options?.pdfOrientation && (
              <Badge variant="outline" className="text-[10px]">
                {job.options.pdfOrientation}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Preview content */}
        <div className="flex-1 overflow-auto min-h-0 rounded-lg border bg-card p-4">
          <OutputContent job={job} textContent={textContent} />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button size="sm" onClick={() => downloadJob(job.id)}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OutputContent({ job, textContent }: { job: ConversionJob; textContent: string }) {
  if (!job.resultBlob && !job.resultUrl) {
    return <UnavailablePreview format={job.toFormat} />;
  }

  switch (job.toFormat) {
    // Image outputs
    case "png":
    case "jpeg":
      return (
        <div className="flex items-center justify-center">
          <img
            src={job.resultUrl}
            alt={job.fileName}
            className="max-w-full max-h-[60vh] rounded-lg border"
          />
        </div>
      );

    // PDF output
    case "pdf":
      return (
        <iframe
          src={job.resultUrl}
          className="w-full rounded-lg border"
          style={{ height: "65vh" }}
          title="PDF Preview"
        />
      );

    // HTML output
    case "html":
      return <HtmlPreview content={textContent} />;

    // SVG output
    case "svg":
      return <SvgPreview content={textContent} />;

    // Markdown output
    case "md":
      return <MarkdownPreview content={textContent} />;

    // Code/data outputs
    case "json":
      return <CodePreview content={textContent} language="json" />;
    case "yaml":
      return <CodePreview content={textContent} language="yaml" />;
    case "csv":
      return <CsvPreview content={textContent} />;
    case "mssql":
    case "mysql":
    case "pgsql":
      return <CodePreview content={textContent} language="sql" />;
    case "txt":
      return <PlainTextPreview content={textContent} />;
    case "mermaid":
      return <CodePreview content={textContent} language="plaintext" />;

    // ── Audio outputs ─────────────────────────────────────────────────────
    case "mp3":
    case "wav":
    case "ogg":
    case "flac":
    case "aac":
    case "m4a":
      return <AudioPlayer job={job} />;

    // ── Video outputs ─────────────────────────────────────────────────────
    case "mp4":
    case "webm":
    case "avi":
    case "mov":
    case "mkv":
      return <VideoPlayer job={job} />;

    // ── GIF output ────────────────────────────────────────────────────────
    case "gif":
      return (
        <div className="flex items-center justify-center">
          <img src={job.resultUrl} alt={job.fileName} className="max-w-full max-h-[60vh] rounded-lg border" />
        </div>
      );

    // Binary (DOCX etc.)
    default:
      return <UnavailablePreview format={job.toFormat} />;
  }
}

// ── Custom Video Player ────────────────────────────────────────────────────

function VideoPlayer({ job }: { job: ConversionJob }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying]           = useState(false);
  const [currentTime, setCurrentTime]   = useState(0);
  const [duration, setDuration]         = useState(0);
  const [volume, setVolume]             = useState(1);
  const [muted, setMuted]               = useState(false);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    setMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted  = val === 0;
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const newMuted = !muted;
    setMuted(newMuted);
    v.muted = newMuted;
    if (!newMuted && volume === 0) { setVolume(0.8); v.volume = 0.8; }
  };

  const fmt = (t: number) => {
    if (!isFinite(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const pct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative rounded-xl overflow-hidden bg-black select-none">
      {/* Video element */}
      <video
        ref={videoRef}
        src={job.resultUrl}
        className="w-full max-h-[58vh] object-contain"
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        onClick={togglePlay}
      />

      {/* Centre play overlay — only when paused */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 rounded-full p-5 backdrop-blur-sm ring-1 ring-white/20">
            <Play className="h-8 w-8 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Format badge (top-right) */}
      <div className="absolute top-3 right-3 pointer-events-none">
        <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold ring-1 ring-white/10">
          {FORMAT_META[job.toFormat]?.label}
        </span>
      </div>

      {/* Controls bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-10 px-3 pb-3 space-y-2">
        {/* Seek bar */}
        <div
          className="group h-1 bg-white/25 rounded-full cursor-pointer hover:h-[5px] transition-all duration-150"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-primary rounded-full relative"
            style={{ width: `${pct}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full
                            opacity-0 group-hover:opacity-100 transition-opacity shadow-md" />
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between text-white gap-2">
          {/* Left: play + time */}
          <div className="flex items-center gap-2.5">
            <button onClick={togglePlay} className="hover:text-primary transition-colors">
              {playing
                ? <Pause className="h-[18px] w-[18px] fill-current" />
                : <Play  className="h-[18px] w-[18px] fill-current" />
              }
            </button>
            <span className="text-[11px] tabular-nums text-white/75 font-mono">
              {fmt(currentTime)} / {fmt(duration)}
            </span>
          </div>

          {/* Right: volume + fullscreen */}
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="hover:text-primary transition-colors">
              {muted || volume === 0
                ? <VolumeX className="h-4 w-4" />
                : <Volume2 className="h-4 w-4" />
              }
            </button>
            <input
              type="range" min={0} max={1} step={0.02}
              value={muted ? 0 : volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-18 h-0.5 accent-primary cursor-pointer"
              style={{ width: "72px" }}
            />
            <button
              onClick={() => videoRef.current?.requestFullscreen()}
              className="hover:text-primary transition-colors ml-1"
            >
              <Maximize className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Custom Audio Player ────────────────────────────────────────────────────

const BAR_HEIGHTS = [30, 55, 75, 90, 62, 80, 48, 95, 68, 38, 85, 58, 44, 72, 52, 88, 34, 66, 50, 78];

function AudioPlayer({ job }: { job: ConversionJob }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying]           = useState(false);
  const [currentTime, setCurrentTime]   = useState(0);
  const [duration, setDuration]         = useState(0);
  const [volume, setVolume]             = useState(1);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play(); else a.pause();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  const fmt = (t: number) => {
    if (!isFinite(t)) return "--:--";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const pct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl bg-gradient-to-br from-card to-muted/60 border shadow-lg p-6 space-y-5">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={job.resultUrl}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
      />

      {/* Format badge + equalizer bars */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-[10px] gap-1">
          <Music className="h-2.5 w-2.5" />
          {FORMAT_META[job.toFormat]?.label}
        </Badge>

        {/* Animated equalizer */}
        <div className="flex items-end gap-[2px] h-8" aria-hidden>
          {BAR_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-primary/60 origin-bottom"
              style={{
                height: `${h}%`,
                animation: playing
                  ? `equalizer ${0.35 + (i % 6) * 0.08}s ease-in-out infinite alternate`
                  : "none",
                animationDelay: `${i * 35}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Track info */}
      <div className="space-y-0.5">
        <p className="font-semibold text-sm truncate">{job.fileName}</p>
        <p className="text-[11px] text-muted-foreground">{FORMAT_META[job.toFormat]?.description}</p>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div
          className="group h-1.5 bg-muted-foreground/15 rounded-full cursor-pointer hover:bg-muted-foreground/25 transition-colors"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-primary rounded-full relative transition-[width] duration-100"
            style={{ width: `${pct}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full
                            opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100 transition-all shadow" />
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums font-mono">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      {/* Play / Pause button */}
      <div className="flex items-center justify-center">
        <button
          onClick={togglePlay}
          className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center
                     shadow-md shadow-primary/30 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all"
        >
          {playing
            ? <Pause className="h-5 w-5 fill-current" />
            : <Play  className="h-5 w-5 fill-current translate-x-0.5" />
          }
        </button>
      </div>

      {/* Volume slider */}
      <div className="flex items-center gap-2.5">
        <Volume2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          type="range" min={0} max={1} step={0.02}
          value={volume}
          onChange={(e) => {
            const val = Number(e.target.value);
            setVolume(val);
            if (audioRef.current) audioRef.current.volume = val;
          }}
          className="flex-1 h-1 accent-primary cursor-pointer"
        />
      </div>
    </div>
  );
}

function UnavailablePreview({ format }: { format: FileFormat }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] text-center gap-3 text-muted-foreground/50">
      <FileWarning className="h-10 w-10" />
      <div className="space-y-1">
        <p className="text-sm font-medium">
          Preview not available for {FORMAT_META[format]?.label ?? format.toUpperCase()}
        </p>
        <p className="text-xs">Download the file to view it</p>
      </div>
    </div>
  );
}
