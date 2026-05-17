/**
 * Markdown style detector.
 *
 * Markdown has no visual style of its own — so we infer the *intended* style
 * from structural + linguistic signals: heading depth, density of code/tables,
 * presence of citations, length distribution, numbering patterns, etc.
 *
 * The output is a StyleConfig that should look right when the user picks
 * "Preserve Original" — i.e. the converter chooses a sensible style for the
 * detected document genre, instead of a one-size-fits-all default.
 */
import type { DeepPartial } from "@/lib/styles/defaults";
import type { StyleConfig } from "@/types/style";
import type { DetectionReport, DocumentGenre } from "./index";

export async function detectFromMarkdown(md: string): Promise<{
  partial: DeepPartial<StyleConfig>;
  report: DetectionReport;
}> {
  const signals: string[] = [];
  const stats = analyseMarkdown(md);
  const genre = inferGenre(stats, signals);
  const partial = styleFromGenre(genre, stats, signals);

  return {
    partial,
    report: {
      confidence: stats.confidence,
      genre,
      signals,
      detected: {
        page: `${partial.page?.size ?? "A4"} ${partial.page?.orientation ?? "portrait"}`,
        colors: `primary ${partial.colors?.primary ?? "default"}`,
        typography: `body ${partial.typography?.body?.family?.split(",")[0] ?? "default"} @ ${partial.typography?.body?.size ?? "?"}pt`,
        structure: `cover=${partial.structure?.cover?.enabled ? "yes" : "no"}, toc=${partial.structure?.toc?.enabled ? "yes" : "no"}`,
      },
    },
  };
}

// ─── Statistical analysis ────────────────────────────────────────────────────

interface MdStats {
  totalChars: number;
  totalLines: number;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  /** Headings that are numbered like "1.2 Section" */
  numberedHeadingCount: number;
  codeBlockCount: number;
  /** Total lines inside fenced code blocks */
  codeLineCount: number;
  tableCount: number;
  /** Total table rows across all tables */
  tableRowCount: number;
  blockquoteCount: number;
  linkCount: number;
  imageCount: number;
  mermaidCount: number;
  /** Heuristic markers found in the prose */
  hasAbstract: boolean;
  hasReferences: boolean;
  hasContents: boolean;
  hasResume: boolean;
  hasCodeSpans: boolean;
  /** Density metrics derived after counting */
  codeDensity: number;     // codeLines / totalLines
  tableDensity: number;    // tableRows / totalLines
  /** 0-1 — how confident we are that detection is meaningful */
  confidence: number;
}

function analyseMarkdown(md: string): MdStats {
  const lines = md.split("\n");
  const stats: MdStats = {
    totalChars: md.length,
    totalLines: lines.length,
    h1Count: 0,
    h2Count: 0,
    h3Count: 0,
    numberedHeadingCount: 0,
    codeBlockCount: 0,
    codeLineCount: 0,
    tableCount: 0,
    tableRowCount: 0,
    blockquoteCount: 0,
    linkCount: 0,
    imageCount: 0,
    mermaidCount: 0,
    hasAbstract: false,
    hasReferences: false,
    hasContents: false,
    hasResume: false,
    hasCodeSpans: false,
    codeDensity: 0,
    tableDensity: 0,
    confidence: 0,
  };

  let inFence = false;
  let inTable = false;
  for (const raw of lines) {
    const line = raw.trim();

    // Fenced code block tracking
    if (/^```/.test(line)) {
      if (!inFence) {
        inFence = true;
        stats.codeBlockCount++;
        if (/^```mermaid/i.test(line)) stats.mermaidCount++;
      } else {
        inFence = false;
      }
      continue;
    }
    if (inFence) {
      stats.codeLineCount++;
      continue;
    }

    // Headings — also run section-keyword detection here, since the keyword
    // tests live on heading lines themselves.
    const h = line.match(/^(#{1,6})\s+(.+)/);
    if (h) {
      const level = h[1].length;
      if (level === 1) stats.h1Count++;
      else if (level === 2) stats.h2Count++;
      else if (level === 3) stats.h3Count++;
      if (/^\d+(\.\d+)*\s+/.test(h[2])) stats.numberedHeadingCount++;

      const lowerH = line.toLowerCase();
      const num = "(?:\\d+(?:\\.\\d+)*\\.?\\s+)?";
      if (!stats.hasAbstract   && new RegExp(`^#{1,3}\\s+${num}abstract\\b`).test(lowerH)) stats.hasAbstract = true;
      if (!stats.hasReferences && new RegExp(`^#{1,3}\\s+${num}(references|bibliography)\\b`).test(lowerH)) stats.hasReferences = true;
      if (!stats.hasContents   && new RegExp(`^#{1,3}\\s+${num}(contents|table of contents)\\b`).test(lowerH)) stats.hasContents = true;
      if (!stats.hasResume     && new RegExp(`^#{1,3}\\s+${num}(experience|education|skills|employment)\\b`).test(lowerH)) stats.hasResume = true;
      continue;
    }

    // Tables
    if (/^\|.*\|/.test(line)) {
      if (!inTable) { stats.tableCount++; inTable = true; }
      stats.tableRowCount++;
    } else if (inTable && line === "") {
      inTable = false;
    }

    // Inline counts
    stats.blockquoteCount += /^>\s/.test(line) ? 1 : 0;
    stats.linkCount       += (line.match(/\[[^\]]+\]\([^)]+\)/g) ?? []).length;
    stats.imageCount      += (line.match(/!\[[^\]]*\]\([^)]+\)/g) ?? []).length;
    if (!stats.hasCodeSpans && /`[^`]+`/.test(line)) stats.hasCodeSpans = true;
  }

  stats.codeDensity  = stats.totalLines ? stats.codeLineCount  / stats.totalLines : 0;
  stats.tableDensity = stats.totalLines ? stats.tableRowCount  / stats.totalLines : 0;

  // Confidence: more content → more confident detection
  const totalSignals = stats.h1Count + stats.h2Count + stats.codeBlockCount + stats.tableCount;
  stats.confidence = Math.min(1, 0.3 + totalSignals * 0.05);
  return stats;
}

// ─── Genre inference ────────────────────────────────────────────────────────

function inferGenre(stats: MdStats, signals: string[]): DocumentGenre {
  // Resume — short, has skills/experience headings
  if (stats.hasResume && stats.totalChars < 8000) {
    signals.push("Resume keywords (Experience/Education/Skills) detected");
    return "resume";
  }

  // Academic — abstract + references
  if (stats.hasAbstract && stats.hasReferences) {
    signals.push("Abstract + References sections → academic paper");
    return "academic-paper";
  }

  // Thesis — long, numbered headings, has Contents, many H1/H2
  if (
    stats.numberedHeadingCount >= 5 &&
    stats.h1Count + stats.h2Count >= 8 &&
    stats.totalChars > 15000
  ) {
    signals.push(`Numbered headings (${stats.numberedHeadingCount}) + long document → thesis/dissertation`);
    return "thesis";
  }

  // Business report — has Contents, numbered sections, moderate length
  if (stats.hasContents && stats.numberedHeadingCount >= 3) {
    signals.push("Table of Contents + numbered sections → business report");
    return "business-report";
  }

  // Technical docs — code-heavy + multiple headings
  if (stats.codeDensity > 0.15 && stats.h1Count + stats.h2Count >= 4) {
    signals.push(`High code density (${(stats.codeDensity * 100).toFixed(0)}%) → technical documentation`);
    return "technical-docs";
  }

  // Book — long-form prose, low code, many H1 (chapters)
  if (stats.h1Count >= 5 && stats.codeDensity < 0.05 && stats.totalChars > 20000) {
    signals.push(`Many H1 (${stats.h1Count}) + low code → book / e-book`);
    return "book";
  }

  // Blog post — short, conversational, no contents/abstract
  if (stats.totalChars < 6000 && stats.h1Count <= 2 && !stats.hasAbstract && !stats.hasContents) {
    signals.push("Short single-topic article → blog post");
    return "blog-post";
  }

  // Letter — very short, no code/tables, no real headings
  if (stats.totalChars < 3000 && stats.codeBlockCount === 0 && stats.tableCount === 0 && stats.h1Count <= 1) {
    signals.push("Very short prose with no structure → letter / correspondence");
    return "letter";
  }

  signals.push("No strong genre signals — using generic professional style");
  return "generic";
}

// ─── Genre → StyleConfig overrides ──────────────────────────────────────────

function styleFromGenre(
  genre: DocumentGenre,
  stats: MdStats,
  signals: string[],
): DeepPartial<StyleConfig> {
  switch (genre) {
    case "thesis":
      signals.push("Applying thesis style: Times New Roman, 1.5 spacing, numbered H1-H3 chapters");
      return {
        page: { margin: { top: 30, right: 25, bottom: 25, left: 35 } },
        colors: { primary: "#1E3A8A", text: "#111827" },
        typography: {
          body: { family: "'Times New Roman', Times, serif", size: 12, lineHeight: 1.5, align: "justify" },
          h1: { family: "'Times New Roman', Times, serif", size: 22, color: "#1E3A8A", pageBreakBefore: true, align: "center", textTransform: "uppercase" },
          h2: { family: "'Times New Roman', Times, serif", size: 16, color: "#1E3A8A" },
          h3: { family: "'Times New Roman', Times, serif", size: 13, color: "#111827" },
          paragraphIndent: 24,
        },
        structure: {
          cover: { enabled: true, layout: "centered", showSubtitle: true, subtitle: "Thesis / Dissertation", showAuthor: true },
          toc: { enabled: stats.hasContents || stats.h2Count >= 5, maxDepth: 3, style: "dotted" },
          h1NewPage: true,
        },
      };

    case "academic-paper":
      signals.push("Applying academic style: Times serif, uppercase H1, justified body");
      return {
        colors: { primary: "#1F2937", text: "#111827" },
        typography: {
          body: { family: "'Times New Roman', Times, serif", size: 11, lineHeight: 1.5, align: "justify" },
          h1: { family: "'Times New Roman', Times, serif", size: 18, color: "#111827", align: "center", textTransform: "uppercase", pageBreakBefore: true },
          h2: { family: "'Times New Roman', Times, serif", size: 14, color: "#111827" },
          paragraphIndent: 18,
        },
        structure: {
          cover: { enabled: true, layout: "centered", showSubtitle: true, subtitle: "Research Paper" },
          toc: { enabled: false },
          h1NewPage: true,
        },
      };

    case "business-report":
      signals.push("Applying business style: blue accents, banner cover, professional sans-serif");
      return {
        colors: { primary: "#1E40AF", secondary: "#3B82F6", text: "#0F172A", link: "#1E40AF" },
        typography: {
          body: { family: "'Segoe UI', Calibri, sans-serif", size: 11, lineHeight: 1.6 },
          h1: { family: "'Segoe UI', Calibri, sans-serif", size: 24, color: "#1E40AF", decoration: "underline-bar", borderBottom: { width: 3, style: "solid", color: "#1E40AF" }, pageBreakBefore: true },
          h2: { family: "'Segoe UI', Calibri, sans-serif", size: 18, color: "#1E40AF", decoration: "side-bar" },
        },
        structure: {
          cover: { enabled: true, layout: "banner", showSubtitle: true, subtitle: "Report" },
          toc: { enabled: true, style: "modern" },
          h1NewPage: true,
        },
      };

    case "technical-docs":
      signals.push("Applying technical style: Inter sans, dark code blocks with line numbers");
      return {
        colors: { primary: "#0EA5E9", text: "#0F172A", surface: "#F1F5F9", link: "#0EA5E9" },
        typography: {
          body: { family: "'Inter', sans-serif", size: 11, lineHeight: 1.7 },
          h1: { family: "'Inter', sans-serif", size: 24, color: "#0F172A", pageBreakBefore: true, borderBottom: { width: 2, style: "solid", color: "#E2E8F0" } },
          h2: { family: "'Inter', sans-serif", size: 18, color: "#0F172A", borderBottom: { width: 1, style: "solid", color: "#E2E8F0" } },
        },
        codeBlock: { background: "#0F172A", textColor: "#E2E8F0", theme: "atom-one-dark", showLineNumbers: true },
        structure: {
          cover: { enabled: true, layout: "left-aligned", showSubtitle: true, subtitle: "Technical Documentation" },
          toc: { enabled: true, maxDepth: 3 },
          h1NewPage: true,
        },
      };

    case "book":
      signals.push("Applying book style: A5 pages, Garamond serif, drop caps, chapter pages");
      return {
        page: { size: "A5", margin: { top: 22, right: 18, bottom: 22, left: 18 } },
        colors: { primary: "#451A03", text: "#1C1917" },
        typography: {
          body: { family: "'Garamond', 'Georgia', serif", size: 10.5, lineHeight: 1.65, align: "justify" },
          h1: { family: "'Garamond', 'Georgia', serif", size: 30, color: "#451A03", align: "center", pageBreakBefore: true },
          h2: { family: "'Garamond', 'Georgia', serif", size: 16, align: "center" },
          paragraphIndent: 24,
          dropCap: true,
        },
        structure: {
          cover: { enabled: true, layout: "centered", showAuthor: true, showSubtitle: true, subtitle: "A Novel" },
          toc: { enabled: true, title: "Contents", style: "classic" },
          h1NewPage: true,
        },
      };

    case "blog-post":
      signals.push("Applying blog style: serif body, no cover, no TOC, generous spacing");
      return {
        page: { margin: { top: 28, right: 35, bottom: 28, left: 35 } },
        colors: { primary: "#059669", link: "#059669" },
        typography: {
          body: { family: "'Source Serif Pro', Georgia, serif", size: 12, lineHeight: 1.85 },
          h1: { family: "'Inter', sans-serif", size: 30, color: "#0F172A", pageBreakBefore: false },
          h2: { family: "'Inter', sans-serif", size: 19, color: "#0F172A" },
          paragraphSpacing: 12,
        },
        structure: {
          cover: { enabled: false },
          toc: { enabled: false },
          header: { enabled: false },
          footer: { enabled: false },
          pageNumbers: { enabled: false },
          h1NewPage: false,
        },
      };

    case "resume":
      signals.push("Applying resume style: compact, no cover, accent section headers");
      return {
        page: { margin: { top: 18, right: 18, bottom: 18, left: 18 } },
        colors: { primary: "#0F766E", link: "#0F766E" },
        typography: {
          body: { family: "'Inter', Calibri, sans-serif", size: 10, lineHeight: 1.5 },
          h1: { family: "'Inter', Calibri, sans-serif", size: 24, color: "#0F172A", pageBreakBefore: false },
          h2: { family: "'Inter', Calibri, sans-serif", size: 13, color: "#0F766E", textTransform: "uppercase", letterSpacing: 0.1, borderBottom: { width: 1, style: "solid", color: "#0F766E" } },
          paragraphSpacing: 4,
        },
        list: { indent: 14, spacing: 2 },
        structure: {
          cover: { enabled: false },
          toc: { enabled: false },
          header: { enabled: false },
          footer: { enabled: false },
          pageNumbers: { enabled: false },
          h1NewPage: false,
        },
      };

    case "letter":
      signals.push("Applying letter style: Garamond serif, no headers/footers, indented paragraphs");
      return {
        page: { margin: { top: 30, right: 25, bottom: 30, left: 25 } },
        typography: {
          body: { family: "'Garamond', 'Georgia', serif", size: 12, lineHeight: 1.6 },
          h1: { family: "'Garamond', 'Georgia', serif", size: 20, align: "center", pageBreakBefore: false },
          paragraphIndent: 28,
        },
        structure: {
          cover: { enabled: false },
          toc: { enabled: false },
          header: { enabled: false },
          footer: { enabled: false },
          pageNumbers: { enabled: false },
          h1NewPage: false,
        },
      };

    case "generic":
    default:
      return {
        // Use defaults — but turn off cover/TOC for very short docs
        structure: stats.totalChars < 4000 ? {
          cover: { enabled: false },
          toc: { enabled: false },
        } : {},
      };
  }
}
