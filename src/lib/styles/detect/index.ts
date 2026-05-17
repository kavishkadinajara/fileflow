/**
 * Style Detection — auto-generate a StyleConfig from a source document.
 *
 * This is the "Preserve Original" intelligence layer. Instead of forcing
 * the user into a one-size-fits-all preserve template, we analyse the
 * source for visual + structural signals and synthesise a StyleConfig
 * that recreates the look in the target format.
 *
 * Per-format detectors live in sibling files:
 *  - md.ts    — structural inference from markdown
 *  - docx.ts  — XML parsing of .docx archives
 *  - pdf.ts   — pdfjs font + colour extraction
 *  - html.ts  — CSS + computed style analysis
 *
 * Each detector returns a Partial<StyleConfig> + a DetectionReport
 * explaining what was found (useful for the UI "Why?" tooltip).
 */
import type { FileFormat } from "@/types";
import type { StyleConfig } from "@/types/style";
import { DEFAULT_STYLE, mergeStyle, type DeepPartial } from "@/lib/styles/defaults";
import { detectFromMarkdown } from "./md";
import { detectFromDocx } from "./docx";

export interface DetectionReport {
  /** Confidence score 0-1 — how much we trust the detected style. */
  confidence: number;
  /** Inferred genre — drives heuristics (e.g. "thesis" → numbered headings). */
  genre: DocumentGenre;
  /** Human-readable list of signals we found. */
  signals: string[];
  /** Per-field breakdown of what was detected vs defaulted. */
  detected: Partial<Record<keyof StyleConfig | "headings" | "blocks" | "structure", string>>;
}

export type DocumentGenre =
  | "academic-paper"
  | "thesis"
  | "business-report"
  | "technical-docs"
  | "blog-post"
  | "book"
  | "letter"
  | "resume"
  | "generic";

export interface DetectionResult {
  style: StyleConfig;
  report: DetectionReport;
}

/**
 * Main entrypoint. Routes to the format-specific detector and merges
 * the result onto DEFAULT_STYLE so converters never receive an incomplete config.
 */
export async function detectStyle(
  format: FileFormat,
  source: string | Buffer,
): Promise<DetectionResult> {
  const detector = DETECTORS[format];
  if (!detector) {
    return fallback(format, "Unsupported format for detection");
  }

  try {
    const result = await detector(source);
    const merged = mergeStyle(DEFAULT_STYLE, result.partial);
    return {
      style: { ...merged, name: `Detected: ${result.report.genre.replace(/-/g, " ")}`, mode: "preserve" },
      report: result.report,
    };
  } catch (err) {
    console.error(`[detectStyle] ${format} detection failed:`, err);
    return fallback(format, `Detection error: ${err instanceof Error ? err.message : "unknown"}`);
  }
}

// ─── Per-format detector registry ───────────────────────────────────────────

type Detector = (source: string | Buffer) => Promise<{
  partial: DeepPartial<StyleConfig>;
  report: DetectionReport;
}>;

const DETECTORS: Partial<Record<FileFormat, Detector>> = {
  md:   async (source) => detectFromMarkdown(typeof source === "string" ? source : source.toString("utf-8")),
  docx: async (source) => detectFromDocx(typeof source === "string" ? Buffer.from(source, "binary") : source),
  // pdf / html plug in here when their detectors land
};

// ─── Fallback ───────────────────────────────────────────────────────────────

function fallback(format: FileFormat, reason: string): DetectionResult {
  return {
    style: { ...DEFAULT_STYLE, name: "Preserve Original", mode: "preserve" },
    report: {
      confidence: 0,
      genre: "generic",
      signals: [reason],
      detected: {},
    },
  };
}
