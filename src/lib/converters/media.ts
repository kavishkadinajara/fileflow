/**
 * Client-side audio/video conversion via FFmpeg.wasm.
 * Runs entirely in the browser — no server API call needed.
 * Requires Cross-Origin-Opener-Policy: same-origin and
 * Cross-Origin-Embedder-Policy: require-corp headers (set in next.config.mjs).
 */

import { FORMAT_META } from "@/lib/formats";
import type { FileFormat } from "@/types";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

// ─── Format helpers ────────────────────────────────────────────────────────

export const MEDIA_FORMATS = new Set<FileFormat>([
  "mp3", "wav", "ogg", "flac", "aac", "m4a",
  "mp4", "webm", "avi", "mov", "mkv", "gif",
]);

const AUDIO_FORMATS = new Set<FileFormat>(["mp3", "wav", "ogg", "flac", "aac", "m4a"]);
const VIDEO_FORMATS = new Set<FileFormat>(["mp4", "webm", "avi", "mov", "mkv", "gif"]);

export function isMediaFormat(f: FileFormat): boolean {
  return MEDIA_FORMATS.has(f);
}

// ─── FFmpeg singleton ──────────────────────────────────────────────────────

const CDN_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

let _ffmpeg: FFmpeg | null = null;
let _loadPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (_ffmpeg) return _ffmpeg;
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    const ff = new FFmpeg();
    const [coreURL, wasmURL] = await Promise.all([
      toBlobURL(`${CDN_BASE}/ffmpeg-core.js`, "text/javascript"),
      toBlobURL(`${CDN_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    ]);
    await ff.load({ coreURL, wasmURL });
    _ffmpeg = ff;
    return ff;
  })();

  return _loadPromise;
}

// ─── Execution mutex (single-threaded WASM, one job at a time) ────────────

let _executing = false;
const _queue: Array<() => void> = [];

function withFFmpegLock<T>(fn: () => Promise<T>): Promise<T> {
  if (!_executing) {
    _executing = true;
    const run = async (): Promise<T> => {
      try {
        return await fn();
      } finally {
        _executing = false;
        const next = _queue.shift();
        if (next) next();
      }
    };
    return run();
  }
  return new Promise<T>((resolve, reject) => {
    _queue.push(() => {
      withFFmpegLock(fn).then(resolve, reject);
    });
  });
}

// ─── Compression / quality options ────────────────────────────────────────

export interface MediaOptions {
  /** CRF value: 18 = high quality / large, 34 = max compression / small. Default 23. */
  videoCrf?: number;
  /** Downscale resolution. "original" keeps the source height. */
  videoResolution?: "original" | "1080p" | "720p" | "480p" | "360p";
  /** Audio bitrate for the encoded output. Default "192k". */
  videoAudioBitrate?: "64k" | "128k" | "192k" | "256k";
}

// ─── Codec argument builders ───────────────────────────────────────────────

function audioCodecArgs(to: FileFormat): string[] {
  switch (to) {
    case "mp3":  return ["-c:a", "libmp3lame", "-q:a", "2"];
    case "wav":  return ["-c:a", "pcm_s16le"];
    case "ogg":  return ["-c:a", "libvorbis", "-q:a", "4"];
    case "flac": return ["-c:a", "flac"];
    case "aac":  return ["-c:a", "aac", "-b:a", "192k"];
    case "m4a":  return ["-c:a", "aac", "-b:a", "192k"];
    default:     return [];
  }
}

function resolutionScale(res?: string): string | null {
  switch (res) {
    case "1080p": return "scale=-2:1080";
    case "720p":  return "scale=-2:720";
    case "480p":  return "scale=-2:480";
    case "360p":  return "scale=-2:360";
    default:      return null;
  }
}

function videoCodecArgs(to: FileFormat, opts?: MediaOptions): string[] {
  const crf   = String(opts?.videoCrf   ?? 23);
  const abr   = opts?.videoAudioBitrate ?? "192k";
  const scale = resolutionScale(opts?.videoResolution);
  const vfArgs = scale ? ["-vf", scale] : [];

  switch (to) {
    case "mp4":
    case "mov":
    case "mkv":
      return [...vfArgs, "-c:v", "libx264", "-preset", "fast", "-crf", crf, "-c:a", "aac", "-b:a", abr];
    case "webm":
      return [...vfArgs, "-c:v", "libvpx-vp9", "-crf", crf, "-b:v", "0", "-c:a", "libvorbis"];
    case "avi":
      return [...vfArgs, "-c:v", "libx264", "-preset", "fast", "-crf", crf, "-c:a", "mp3"];
    default:
      return [];
  }
}

function buildArgs(
  inputName: string,
  outputName: string,
  from: FileFormat,
  to: FileFormat,
  opts?: MediaOptions,
): string[] {
  const base = ["-i", inputName];

  // Video → GIF
  if (to === "gif") {
    return [...base, "-vf", "fps=10,scale=480:-1:flags=lanczos", "-loop", "0", outputName];
  }

  // Video → Audio (extract audio track)
  if (VIDEO_FORMATS.has(from) && AUDIO_FORMATS.has(to)) {
    return [...base, "-vn", ...audioCodecArgs(to), outputName];
  }

  // Audio → Audio
  if (AUDIO_FORMATS.has(from) && AUDIO_FORMATS.has(to)) {
    return [...base, ...audioCodecArgs(to), outputName];
  }

  // Video → Video (same-format compression counts too)
  if (VIDEO_FORMATS.has(from) && VIDEO_FORMATS.has(to)) {
    return [...base, ...videoCodecArgs(to, opts), outputName];
  }

  throw new Error(`Unsupported media conversion: ${from} → ${to}`);
}

// ─── Main export ───────────────────────────────────────────────────────────

export interface MediaConversionResult {
  blob: Blob;
  mimeType: string;
  fileName: string;
}

export async function convertMedia(
  file: File,
  fromFormat: FileFormat,
  toFormat: FileFormat,
  onProgress: (percent: number) => void,
  opts?: MediaOptions,
): Promise<MediaConversionResult> {
  return withFFmpegLock(async () => {
    const ff = await getFFmpeg();

    const ext = fromFormat === "m4a" ? "m4a" : fromFormat;
    const inputName  = `input.${ext}`;
    const outputName = `output.${toFormat}`;

    onProgress(0);
    await ff.writeFile(inputName, await fetchFile(file));

    const onFFmpegProgress = ({ progress }: { progress: number }) => {
      onProgress(Math.min(Math.floor(progress * 100), 99));
    };
    ff.on("progress", onFFmpegProgress);

    let exitCode: number;
    try {
      exitCode = await ff.exec(buildArgs(inputName, outputName, fromFormat, toFormat, opts));
    } finally {
      ff.off("progress", onFFmpegProgress);
    }

    if (exitCode !== 0) {
      await ff.deleteFile(inputName).catch(() => {});
      throw new Error(
        `FFmpeg exited with code ${exitCode}. The input file may be corrupted or the codec is unavailable.`
      );
    }

    const data = (await ff.readFile(outputName)) as Uint8Array;

    await ff.deleteFile(inputName).catch(() => {});
    await ff.deleteFile(outputName).catch(() => {});

    const mimeType = FORMAT_META[toFormat].mime;
    // Copy into a standard ArrayBuffer (FFmpeg may return SharedArrayBuffer-backed views)
    const copy = data.slice().buffer as ArrayBuffer;
    const blob = new Blob([copy], { type: mimeType });
    const baseName = file.name.replace(/\.[^.]+$/, "");
    const fileName = `${baseName}${FORMAT_META[toFormat].extension}`;

    return { blob, mimeType, fileName };
  });
}
