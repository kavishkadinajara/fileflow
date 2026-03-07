import type { ConversionPair, FileFormat, FormatMeta } from "@/types";

// ─── Format Metadata ────────────────────────────────────────────────────────

export const FORMAT_META: Record<FileFormat, FormatMeta> = {
  md: {
    label: "Markdown",
    mime: "text/markdown",
    extension: ".md",
    description: "Markdown document",
    icon: "FileText",
    category: "document",
  },
  mermaid: {
    label: "Mermaid",
    mime: "text/plain",
    extension: ".mmd",
    description: "Mermaid diagram source",
    icon: "GitFork",
    category: "diagram",
  },
  html: {
    label: "HTML",
    mime: "text/html",
    extension: ".html",
    description: "Web page",
    icon: "Code2",
    category: "document",
  },
  pdf: {
    label: "PDF",
    mime: "application/pdf",
    extension: ".pdf",
    description: "Portable Document Format",
    icon: "FilePdf",
    category: "document",
  },
  docx: {
    label: "DOCX",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: ".docx",
    description: "Microsoft Word document",
    icon: "FileType2",
    category: "document",
  },
  txt: {
    label: "Plain Text",
    mime: "text/plain",
    extension: ".txt",
    description: "Plain text file",
    icon: "FileText",
    category: "document",
  },
  json: {
    label: "JSON",
    mime: "application/json",
    extension: ".json",
    description: "JSON data",
    icon: "Braces",
    category: "data",
  },
  yaml: {
    label: "YAML",
    mime: "text/yaml",
    extension: ".yaml",
    description: "YAML data",
    icon: "FileCode2",
    category: "data",
  },
  csv: {
    label: "CSV",
    mime: "text/csv",
    extension: ".csv",
    description: "Comma-separated values",
    icon: "Table",
    category: "data",
  },
  png: {
    label: "PNG",
    mime: "image/png",
    extension: ".png",
    description: "PNG image",
    icon: "Image",
    category: "image",
  },
  jpeg: {
    label: "JPEG",
    mime: "image/jpeg",
    extension: ".jpg",
    description: "JPEG image",
    icon: "Image",
    category: "image",
  },
  svg: {
    label: "SVG",
    mime: "image/svg+xml",
    extension: ".svg",
    description: "Scalable Vector Graphics",
    icon: "Pen",
    category: "image",
  },
  mssql: {
    label: "MSSQL",
    mime: "text/plain",
    extension: ".sql",
    description: "Microsoft SQL Server",
    icon: "Database",
    category: "sql",
  },
  mysql: {
    label: "MySQL",
    mime: "text/plain",
    extension: ".sql",
    description: "MySQL / MariaDB",
    icon: "Database",
    category: "sql",
  },
  pgsql: {
    label: "PostgreSQL",
    mime: "text/plain",
    extension: ".sql",
    description: "PostgreSQL",
    icon: "Database",
    category: "sql",
  },
};

// ─── Supported Conversion Matrix ────────────────────────────────────────────
// All supported from→to pairs

export const SUPPORTED_CONVERSIONS: ConversionPair[] = [
  // Markdown →
  { from: "md", to: "html" },
  { from: "md", to: "pdf" },
  { from: "md", to: "docx" },
  { from: "md", to: "txt" },
  // Mermaid →
  { from: "mermaid", to: "svg" },
  { from: "mermaid", to: "png" },
  { from: "mermaid", to: "pdf" },
  { from: "mermaid", to: "html" },
  // HTML →
  { from: "html", to: "md" },
  { from: "html", to: "pdf" },
  { from: "html", to: "docx" },
  { from: "html", to: "txt" },
  { from: "html", to: "png" },
  // DOCX →
  { from: "docx", to: "html" },
  { from: "docx", to: "md" },
  { from: "docx", to: "txt" },
  { from: "docx", to: "pdf" },
  // JSON →
  { from: "json", to: "yaml" },
  { from: "json", to: "csv" },
  { from: "json", to: "txt" },
  // YAML →
  { from: "yaml", to: "json" },
  { from: "yaml", to: "txt" },
  // CSV →
  { from: "csv", to: "json" },
  { from: "csv", to: "yaml" },
  { from: "csv", to: "html" },
  // Plain text →
  { from: "txt", to: "md" },
  { from: "txt", to: "html" },
  { from: "txt", to: "pdf" },
  // Images →
  { from: "png", to: "jpeg" },
  { from: "png", to: "svg" },
  { from: "jpeg", to: "png" },
  { from: "svg", to: "png" },
  { from: "svg", to: "pdf" },
  // SQL dialect conversions
  { from: "mssql", to: "mysql" },
  { from: "mssql", to: "pgsql" },
  { from: "mysql", to: "mssql" },
  { from: "mysql", to: "pgsql" },
  { from: "pgsql", to: "mssql" },
  { from: "pgsql", to: "mysql" },
];

export function getSupportedOutputs(from: FileFormat): FileFormat[] {
  return SUPPORTED_CONVERSIONS.filter((p) => p.from === from).map((p) => p.to);
}

export function isConversionSupported(from: FileFormat, to: FileFormat): boolean {
  return SUPPORTED_CONVERSIONS.some((p) => p.from === from && p.to === to);
}

// ─── Detect format from MIME / extension ────────────────────────────────────

const MIME_TO_FORMAT: Record<string, FileFormat> = {
  "text/markdown": "md",
  "text/x-markdown": "md",
  "text/plain": "txt",
  "text/html": "html",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/json": "json",
  "text/yaml": "yaml",
  "application/x-yaml": "yaml",
  "text/csv": "csv",
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/svg+xml": "svg",
};

const EXT_TO_FORMAT: Record<string, FileFormat> = {
  ".md": "md",
  ".markdown": "md",
  ".mmd": "mermaid",
  ".mermaid": "mermaid",
  ".html": "html",
  ".htm": "html",
  ".pdf": "pdf",
  ".docx": "docx",
  ".txt": "txt",
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".csv": "csv",
  ".png": "png",
  ".jpg": "jpeg",
  ".jpeg": "jpeg",
  ".svg": "svg",
  ".sql": "mssql",
};

export function detectFormat(file: File): FileFormat | undefined {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (ext && EXT_TO_FORMAT[ext]) return EXT_TO_FORMAT[ext];
  if (MIME_TO_FORMAT[file.type]) return MIME_TO_FORMAT[file.type];
  return undefined;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// ─── Auto-detect format from text content ───────────────────────────────────

export function detectTextFormat(content: string): FileFormat {
  const trimmed = content.trim();

  // JSON detection
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      // Not JSON
    }
  }

  // HTML detection
  if (/^<!DOCTYPE\s+html|^<html[\s>]/i.test(trimmed) || /<\/(div|p|span|body|head|table|h[1-6])>/i.test(trimmed)) {
    return "html";
  }

  // SVG detection
  if (/^<svg[\s>]/i.test(trimmed) || /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/i.test(trimmed)) {
    return "svg";
  }

  // Mermaid detection
  if (/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|journey)\b/m.test(trimmed)) {
    return "mermaid";
  }

  // SQL detection with dialect analysis
  if (
    /\b(SELECT|INSERT|UPDATE|DELETE|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)\b/i.test(trimmed)
  ) {
    // Check for dialect-specific markers
    const mssqlMarkers = [/\bGO\b/m, /\bTOP\s*\(/i, /\bNVARCHAR\b/i, /\bIDENTITY\s*\(/i, /\bISNULL\s*\(/i, /\bGETDATE\s*\(\)/i, /\[\w+\]/];
    const mysqlMarkers = [/\bAUTO_INCREMENT\b/i, /\bENGINE\s*=/i, /`\w+`/, /\bIFNULL\s*\(/i, /\bSHOW\s+TABLES/i, /\bLIMIT\s+\d+/i];
    const pgsqlMarkers = [/\bSERIAL\b/i, /\bRETURNING\b/i, /\bBOOLEAN\b/i, /\bTIMESTAMPTZ\b/i, /\bJSONB\b/i, /\b::\w+/, /\bCREATE\s+EXTENSION/i];

    let mssqlScore = 0, mysqlScore = 0, pgsqlScore = 0;
    for (const p of mssqlMarkers) if (p.test(trimmed)) mssqlScore++;
    for (const p of mysqlMarkers) if (p.test(trimmed)) mysqlScore++;
    for (const p of pgsqlMarkers) if (p.test(trimmed)) pgsqlScore++;

    if (mssqlScore >= mysqlScore && mssqlScore >= pgsqlScore) return "mssql";
    if (mysqlScore >= pgsqlScore) return "mysql";
    return "pgsql";
  }

  // YAML detection (key: value patterns, starts with ---)
  if (/^---\s*$/m.test(trimmed) || /^\w[\w\s]*:\s+\S/m.test(trimmed)) {
    // Make sure it's not markdown with front matter
    const yamlishLines = trimmed.split("\n").filter((l) => /^\w[\w\s]*:\s+/.test(l)).length;
    const totalLines = trimmed.split("\n").length;
    if (yamlishLines / totalLines > 0.3) return "yaml";
  }

  // CSV detection (comma-separated with consistent column counts)
  const csvLines = trimmed.split("\n").filter((l) => l.trim());
  if (csvLines.length >= 2) {
    const colCounts = csvLines.slice(0, 5).map((l) => l.split(",").length);
    const consistent = colCounts.every((c) => c === colCounts[0]) && colCounts[0] >= 2;
    if (consistent) return "csv";
  }

  // Markdown detection (headings, lists, emphasis, links)
  const mdIndicators = [/^#{1,6}\s/m, /\*\*.+?\*\*/, /\[.+?\]\(.+?\)/, /^[-*+]\s+/m, /^```/m, /^\|.*\|/m];
  const mdScore = mdIndicators.filter((p) => p.test(trimmed)).length;
  if (mdScore >= 2) return "md";

  // Default to plain text
  return "txt";
}
