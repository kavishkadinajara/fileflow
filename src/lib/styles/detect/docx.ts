/**
 * DOCX style detector.
 *
 * .docx is a ZIP of XML files. The visual style lives in three places:
 *   - word/styles.xml          → named heading styles (Heading 1/2/3, Normal)
 *   - word/document.xml        → per-run overrides (font, size, color)
 *   - word/theme/theme1.xml    → theme fonts and accent colors
 *
 * We parse the relevant fragments with a tolerant regex pass (no DOMParser
 * server-side, no heavy XML lib needed) and extract enough signal to
 * reproduce the document's look in another format.
 */
import JSZip from "jszip";
import type { DeepPartial } from "@/lib/styles/defaults";
import type { StyleConfig } from "@/types/style";
import type { DetectionReport, DocumentGenre } from "./index";

export async function detectFromDocx(buffer: Buffer): Promise<{
  partial: DeepPartial<StyleConfig>;
  report: DetectionReport;
}> {
  const signals: string[] = [];
  const zip = await JSZip.loadAsync(buffer);

  const stylesXml   = await zip.file("word/styles.xml")?.async("string");
  const themeXml    = await zip.file("word/theme/theme1.xml")?.async("string");
  const documentXml = await zip.file("word/document.xml")?.async("string");

  if (!stylesXml && !documentXml) {
    return fallback("DOCX has no styles.xml or document.xml — cannot detect");
  }

  // ── Theme: brand fonts + accent colours ───────────────────────────────────
  const theme = themeXml ? parseTheme(themeXml) : {};
  if (theme.majorFont)  signals.push(`Theme major font: ${theme.majorFont}`);
  if (theme.minorFont)  signals.push(`Theme minor (body) font: ${theme.minorFont}`);
  if (theme.accent1)    signals.push(`Theme accent colour: #${theme.accent1}`);

  // ── Styles: heading sizes + colours ───────────────────────────────────────
  const headingStyles = stylesXml ? parseHeadingStyles(stylesXml) : {};
  for (const lvl of [1, 2, 3] as const) {
    const h = headingStyles[lvl];
    if (h) signals.push(`Heading ${lvl}: ${h.size ?? "?"}pt, colour #${h.color ?? "default"}, font ${h.font ?? "inherit"}`);
  }

  // ── Document body: font + structure markers ───────────────────────────────
  const body = documentXml ? parseBodyStats(documentXml) : { bodyFont: undefined, bodySize: undefined, hasToc: false, hasNumberedHeadings: false, h1Count: 0, h2Count: 0, totalChars: 0 };
  if (body.bodyFont) signals.push(`Body font (from first paragraph): ${body.bodyFont}`);
  if (body.bodySize) signals.push(`Body size: ${body.bodySize}pt`);
  if (body.hasToc)   signals.push("Table of Contents field detected");
  if (body.hasNumberedHeadings) signals.push("Numbered headings detected");

  // ── Genre inference ───────────────────────────────────────────────────────
  const genre = inferDocxGenre(body, headingStyles, theme, signals);

  // ── Synthesise StyleConfig ────────────────────────────────────────────────
  const bodyFamily = pickFontStack(body.bodyFont ?? theme.minorFont);
  const headingFamily = pickFontStack(headingStyles[1]?.font ?? theme.majorFont ?? body.bodyFont);
  const accent = theme.accent1 ? `#${theme.accent1}` : (headingStyles[1]?.color ? `#${headingStyles[1].color}` : "#1F2937");

  const partial: DeepPartial<StyleConfig> = {
    colors: {
      primary: accent,
      secondary: accent,
      link: accent,
    },
    typography: {
      body: {
        family: bodyFamily,
        size: body.bodySize ?? 11,
        lineHeight: 1.5,
      },
      h1: {
        family: headingFamily,
        size: headingStyles[1]?.size ?? 22,
        color: headingStyles[1]?.color ? `#${headingStyles[1].color}` : accent,
        pageBreakBefore: true,
      },
      h2: {
        family: headingFamily,
        size: headingStyles[2]?.size ?? 17,
        color: headingStyles[2]?.color ? `#${headingStyles[2].color}` : accent,
      },
      h3: {
        family: headingFamily,
        size: headingStyles[3]?.size ?? 14,
        color: headingStyles[3]?.color ? `#${headingStyles[3].color}` : undefined,
      },
    },
    structure: {
      cover: { enabled: genre === "thesis" || genre === "academic-paper" || genre === "business-report" || genre === "book" },
      toc:   { enabled: body.hasToc, style: "modern" },
      h1NewPage: genre !== "blog-post" && genre !== "resume" && genre !== "letter",
    },
  };

  const totalSignals = signals.length;
  const confidence = Math.min(1, 0.4 + totalSignals * 0.08);

  return {
    partial,
    report: {
      confidence,
      genre,
      signals,
      detected: {
        page: "A4 portrait",
        colors: `primary ${accent}`,
        typography: `body ${bodyFamily.split(",")[0]} @ ${body.bodySize ?? "?"}pt`,
        structure: `cover=${partial.structure?.cover?.enabled ? "yes" : "no"}, toc=${partial.structure?.toc?.enabled ? "yes" : "no"}`,
      },
    },
  };
}

// ─── Theme parser ───────────────────────────────────────────────────────────

interface ThemeInfo {
  majorFont?: string;
  minorFont?: string;
  accent1?: string; // hex without #
}

function parseTheme(xml: string): ThemeInfo {
  const info: ThemeInfo = {};
  const majorMatch = xml.match(/<a:majorFont>[\s\S]*?<a:latin\s+typeface="([^"]+)"/i);
  const minorMatch = xml.match(/<a:minorFont>[\s\S]*?<a:latin\s+typeface="([^"]+)"/i);
  const accentMatch = xml.match(/<a:accent1>\s*<a:srgbClr\s+val="([0-9A-F]{6})"/i);
  if (majorMatch)  info.majorFont = majorMatch[1];
  if (minorMatch)  info.minorFont = minorMatch[1];
  if (accentMatch) info.accent1   = accentMatch[1];
  return info;
}

// ─── Heading style parser ───────────────────────────────────────────────────

interface HeadingStyle {
  size?: number;   // pt (already converted from half-points)
  color?: string;  // hex without #
  font?: string;
}

function parseHeadingStyles(xml: string): Record<number, HeadingStyle> {
  const out: Record<number, HeadingStyle> = {};
  // Each heading style block lives in <w:style w:styleId="Heading1"> ... </w:style>
  const styleRe = /<w:style\b[^>]*w:styleId="(Heading[1-6])"[^>]*>([\s\S]*?)<\/w:style>/g;
  let m: RegExpExecArray | null;
  while ((m = styleRe.exec(xml)) !== null) {
    const level = parseInt(m[1].replace("Heading", ""), 10);
    const block = m[2];
    const sizeMatch = block.match(/<w:sz\s+w:val="(\d+)"/);
    const colorMatch = block.match(/<w:color\s+w:val="([0-9A-Fa-f]{6})"/);
    const fontMatch  = block.match(/<w:rFonts[^/]*\b(?:w:ascii|w:hAnsi|w:cs)="([^"]+)"/);
    out[level] = {
      size: sizeMatch ? parseInt(sizeMatch[1], 10) / 2 : undefined,  // half-points → pt
      color: colorMatch ? colorMatch[1].toUpperCase() : undefined,
      font: fontMatch ? fontMatch[1] : undefined,
    };
  }
  return out;
}

// ─── Body parser ────────────────────────────────────────────────────────────

interface BodyStats {
  bodyFont?: string;
  bodySize?: number;
  hasToc: boolean;
  hasNumberedHeadings: boolean;
  h1Count: number;
  h2Count: number;
  totalChars: number;
}

function parseBodyStats(xml: string): BodyStats {
  const stats: BodyStats = {
    hasToc: false,
    hasNumberedHeadings: false,
    h1Count: 0,
    h2Count: 0,
    totalChars: 0,
  };

  // First paragraph run with rFonts → body font hint
  const firstFont = xml.match(/<w:p\b[\s\S]*?<w:rFonts[^/]*\b(?:w:ascii|w:hAnsi)="([^"]+)"/);
  if (firstFont) stats.bodyFont = firstFont[1];

  const firstSize = xml.match(/<w:p\b[\s\S]*?<w:sz\s+w:val="(\d+)"/);
  if (firstSize) stats.bodySize = parseInt(firstSize[1], 10) / 2;

  // TOC = SDT with TOC docPart, or fldChar instruction containing "TOC"
  if (/<w:sdt\b[\s\S]{0,2000}TOC/i.test(xml) || /<w:instrText[^>]*>\s*TOC\b/i.test(xml)) {
    stats.hasToc = true;
  }

  // Numbered headings = paragraph using a heading style + numPr
  if (/<w:pStyle\s+w:val="Heading\d"\b[\s\S]{0,200}<w:numPr/.test(xml)) {
    stats.hasNumberedHeadings = true;
  }

  // Heading counts via pStyle
  stats.h1Count = (xml.match(/<w:pStyle\s+w:val="Heading1"/g) ?? []).length;
  stats.h2Count = (xml.match(/<w:pStyle\s+w:val="Heading2"/g) ?? []).length;

  // Total characters = sum of <w:t> contents
  const textRe = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let tm: RegExpExecArray | null;
  while ((tm = textRe.exec(xml)) !== null) stats.totalChars += tm[1].length;

  return stats;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Wrap a raw font name into a CSS font stack with sensible fallbacks. */
function pickFontStack(font: string | undefined): string {
  if (!font) return "'Segoe UI', Calibri, sans-serif";
  const serifs = ["Times", "Times New Roman", "Georgia", "Garamond", "Cambria", "Book Antiqua", "Palatino"];
  const isSerif = serifs.some((s) => font.toLowerCase().includes(s.toLowerCase()));
  const fallback = isSerif ? "Georgia, serif" : "Calibri, sans-serif";
  return `'${font}', ${fallback}`;
}

function inferDocxGenre(
  body: BodyStats,
  headings: Record<number, HeadingStyle>,
  theme: ThemeInfo,
  signals: string[],
): DocumentGenre {
  const isSerifBody = body.bodyFont && /Times|Georgia|Garamond|Cambria/i.test(body.bodyFont);

  if (body.hasToc && body.hasNumberedHeadings && body.h1Count + body.h2Count >= 8) {
    signals.push("Thesis signature: numbered headings + TOC + many sections");
    return "thesis";
  }
  if (body.hasNumberedHeadings && body.hasToc) {
    signals.push("Business report signature: TOC + numbered sections");
    return "business-report";
  }
  if (isSerifBody && body.h1Count <= 3 && body.totalChars > 5000) {
    signals.push("Serif body + few H1 + long-form prose → academic paper");
    return "academic-paper";
  }
  if (body.totalChars < 3000) {
    signals.push("Very short DOCX → letter / resume");
    return body.totalChars < 1500 ? "letter" : "resume";
  }
  // Use _ prefix to silence unused-var without losing the named parameter for docs.
  void headings; void theme;
  return "generic";
}

function fallback(reason: string): { partial: DeepPartial<StyleConfig>; report: DetectionReport } {
  return {
    partial: {},
    report: {
      confidence: 0,
      genre: "generic",
      signals: [reason],
      detected: {},
    },
  };
}
