// ─── File & Conversion Types ────────────────────────────────────────────────

export type FileFormat =
  | "md"
  | "mermaid"
  | "html"
  | "pdf"
  | "docx"
  | "txt"
  | "json"
  | "yaml"
  | "csv"
  | "png"
  | "jpeg"
  | "svg"
  | "mssql"
  | "mysql"
  | "pgsql"
  // Audio
  | "mp3"
  | "wav"
  | "ogg"
  | "flac"
  | "aac"
  | "m4a"
  // Video
  | "mp4"
  | "webm"
  | "avi"
  | "mov"
  | "mkv"
  | "gif";

export interface FormatMeta {
  label: string;
  mime: string;
  extension: string;
  description: string;
  icon: string;
  category: "document" | "data" | "image" | "diagram" | "sql" | "audio" | "video";
}

export interface ConversionPair {
  from: FileFormat;
  to: FileFormat;
}

export interface ConversionJob {
  id: string;
  fileName: string;
  fromFormat: FileFormat;
  toFormat: FileFormat;
  status: "idle" | "processing" | "done" | "error";
  progress: number;
  resultUrl?: string;
  resultBlob?: Blob;
  error?: string;
  createdAt: Date;
  sourceContent?: string;
  /** Original File object — retained for SFI quality scoring */
  sourceFile?: File;
  options?: ConvertOptions;
}

export interface ConvertRequest {
  fileBase64: string;
  fileName: string;
  fromFormat: FileFormat;
  toFormat: FileFormat;
  options?: ConvertOptions;
}

export interface ConvertResponse {
  success: boolean;
  fileBase64?: string;
  fileName?: string;
  mimeType?: string;
  error?: string;
}

export interface ConvertOptions {
  /** PDF/image options */
  pdfPageSize?: "A4" | "A3" | "Letter" | "Legal";
  pdfOrientation?: "portrait" | "landscape";
  imageQuality?: number; // 1-100
  imageWidth?: number;
  imageHeight?: number;
  /** Mermaid diagram options */
  mermaidTheme?: "default" | "dark" | "forest" | "neutral";
  /** Markdown options */
  mdHighlightCode?: boolean;
  /** Video compression options */
  videoCrf?: number;                  // 18–51: lower = better quality, larger file
  videoResolution?: "original" | "1080p" | "720p" | "480p" | "360p";
  videoAudioBitrate?: "64k" | "128k" | "192k" | "256k";
}

export interface DropzoneFile {
  file: File;
  id: string;
  preview?: string;
  detectedFormat?: FileFormat;
}
