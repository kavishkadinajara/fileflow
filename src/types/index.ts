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
  | "pgsql";

export interface FormatMeta {
  label: string;
  mime: string;
  extension: string;
  description: string;
  icon: string;
  category: "document" | "data" | "image" | "diagram" | "sql";
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
}

export interface DropzoneFile {
  file: File;
  id: string;
  preview?: string;
  detectedFormat?: FileFormat;
}
