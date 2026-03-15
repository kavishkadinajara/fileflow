/**
 * Markdown ↔ HTML / PDF / DOCX / TXT converters (server-side)
 * Supports embedded Mermaid diagram blocks (```mermaid ... ```)
 */
import { configureMarked } from "@/lib/marked-config";
import {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    Header,
    HeadingLevel,
    ImageRun,
    NumberFormat,
    Packer,
    PageBreak,
    PageNumber,
    Paragraph,
    ShadingType,
    StyleLevel,
    Table,
    TableCell,
    TableOfContents,
    TableRow,
    TextRun,
    WidthType,
    type ISectionOptions,
    type IStylesOptions
} from "docx";
import { marked } from "marked";
import { mermaidToPng } from "./mermaid";

const MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";

// Configure marked with syntax highlighting + emoji support
configureMarked();

// ─── Helpers: Extract mermaid blocks from markdown ───────────────────────────

interface MdSegment {
  type: "text" | "mermaid";
  content: string;
}

/**
 * Split markdown into alternating text / mermaid segments.
 * Handles ```mermaid ... ``` fenced blocks.
 */
function splitMermaidBlocks(markdown: string): MdSegment[] {
  const segments: MdSegment[] = [];
  const regex = /```mermaid\s*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markdown)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: markdown.slice(lastIndex, match.index) });
    }
    segments.push({ type: "mermaid", content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < markdown.length) {
    segments.push({ type: "text", content: markdown.slice(lastIndex) });
  }

  return segments;
}

// ─── MD → HTML (with Mermaid.js rendering) ──────────────────────────────────

export async function mdToHtml(markdown: string): Promise<string> {
  const segments = splitMermaidBlocks(markdown);
  const hasMermaid = segments.some((s) => s.type === "mermaid");

  // Build body: render text segments as markdown, mermaid segments as <div class="mermaid">
  const bodyParts: string[] = [];
  for (const seg of segments) {
    if (seg.type === "text") {
      bodyParts.push(await marked.parse(seg.content));
    } else {
      bodyParts.push(`<div class="mermaid">\n${seg.content}\n</div>`);
    }
  }
  const body = bodyParts.join("\n");

  const mermaidScript = hasMermaid
    ? `<script src="${MERMAID_CDN}"></script>\n  <script>mermaid.initialize({ startOnLoad: true, theme: 'default' });</script>`
    : "";

  // Generate TOC from markdown headings
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  const tocItems: string[] = [];
  let hMatch: RegExpExecArray | null;
  while ((hMatch = headingRegex.exec(markdown)) !== null) {
    const level = hMatch[1].length;
    const text = hMatch[2].replace(/[*_`#]/g, "").trim();
    const anchor = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const indent = (level - 1) * 20;
    tocItems.push(`<li style="margin-left:${indent}px;"><a href="#${anchor}">${text}</a></li>`);
  }
  const tocHtml = tocItems.length > 2
    ? `<div class="toc"><h2 class="toc-title">Table of Contents</h2><ul>${tocItems.join("\n")}</ul></div><div style="page-break-after:always;"></div>`
    : "";

  // Extract title from first H1
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const docTitle = titleMatch ? titleMatch[1].replace(/[*_`#]/g, "").trim() : "Document";

  // Cover page
  const coverHtml = `<div class="cover-page">
    <div class="cover-title">${docTitle}</div>
    <div class="cover-line">─────────────────────────────────────────</div>
    <div class="cover-date">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
  </div>
  <div style="page-break-after:always;"></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${docTitle}</title>
  <style>
    @page { size: A4; margin: 25mm 20mm; }
    * { box-sizing: border-box; }
    body { font-family: Calibri, 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 100%; margin: 0 auto; padding: 0 20px; line-height: 1.7; color: #1F2937; font-size: 11pt; }
    /* Cover page */
    .cover-page { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 80vh; text-align: center; }
    .cover-title { font-size: 28pt; font-weight: bold; color: #1F2937; margin-bottom: 16px; }
    .cover-line { color: #9CA3AF; font-size: 10pt; margin-bottom: 12px; }
    .cover-date { font-size: 11pt; color: #6B7280; }
    /* TOC */
    .toc { page-break-after: always; }
    .toc-title { font-size: 18pt; color: #1F2937; border-bottom: 2px solid #3B82F6; padding-bottom: 8px; margin-bottom: 16px; }
    .toc ul { list-style: none; padding: 0; }
    .toc li { padding: 4px 0; font-size: 10.5pt; }
    .toc a { color: #3B82F6; text-decoration: none; }
    .toc a:hover { text-decoration: underline; }
    /* Headings */
    h1 { font-size: 22pt; color: #111827; page-break-before: always; border-bottom: 3px solid #3B82F6; padding-bottom: 8px; margin-top: 0; }
    h1:first-of-type { page-break-before: avoid; }
    h2 { font-size: 17pt; color: #1F2937; page-break-before: always; border-bottom: 2px solid #D1D5DB; padding-bottom: 6px; }
    h3 { font-size: 14pt; color: #374151; margin-top: 24px; }
    h4 { font-size: 12pt; color: #4B5563; }
    h5, h6 { font-size: 11pt; color: #6B7280; }
    /* Code */
    pre { background: #F3F4F6; border-radius: 6px; padding: 16px; overflow-x: auto; border-left: 4px solid #3B82F6; font-size: 9.5pt; page-break-inside: avoid; }
    code { background: #F3F4F6; padding: 2px 5px; border-radius: 3px; font-size: 0.9em; font-family: Consolas, 'Courier New', monospace; }
    pre code { background: none; padding: 0; }
    /* Blockquote */
    blockquote { border-left: 4px solid #3B82F6; margin: 16px 0; padding: 12px 16px; color: #6B7280; background: #EFF6FF; border-radius: 0 6px 6px 0; font-style: italic; }
    /* Table */
    table { border-collapse: collapse; width: 100%; page-break-inside: avoid; margin: 16px 0; }
    th { background: #374151; color: #FFFFFF; padding: 10px 12px; text-align: left; font-size: 10pt; }
    td { border: 1px solid #D1D5DB; padding: 8px 12px; font-size: 10pt; }
    tr:nth-child(even) { background: #F9FAFB; }
    img { max-width: 100%; }
    a { color: #3B82F6; }
    .mermaid { display: flex; justify-content: center; margin: 24px 0; page-break-inside: avoid; }
    .mermaid svg { max-width: 100%; height: auto; }
    /* Prevent orphans/widows */
    p, li { orphans: 3; widows: 3; }
    h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
  </style>
  ${mermaidScript}
</head>
<body>
${coverHtml}
${tocHtml}
${body}
</body>
</html>`;
}

// ─── MD → TXT ───────────────────────────────────────────────────────────────

export function mdToTxt(markdown: string): string {
  // Strip markdown syntax naively
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`{3}[\s\S]*?`{3}/g, "")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/!\[.*?\]\(.+?\)/g, "")
    .replace(/^[-*+]\s+/gm, "• ")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/---+/g, "─────────────────")
    .trim();
}

// ─── MD → DOCX (Professional report with TOC, headers, page numbers) ───────

export async function mdToDocx(markdown: string): Promise<Buffer> {
  const segments = splitMermaidBlocks(markdown);
  const children: (Paragraph | Table)[] = [];

  // Extract document title from first H1 if available
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const docTitle = titleMatch ? titleMatch[1].trim() : "Document";

  // ── Build cover page ──────────────────────────────────────────────────────
  const coverSection: ISectionOptions = {
    properties: {
      page: {
        margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        pageNumbers: { start: 0 },
      },
      titlePage: true,
    },
    children: [
      new Paragraph({ spacing: { before: 4000 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: docTitle,
            bold: true,
            size: 56, // 28pt
            color: "1F2937",
            font: "Calibri",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "─".repeat(40),
            color: "9CA3AF",
            size: 20,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 300 },
        children: [
          new TextRun({
            text: new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            size: 22,
            color: "6B7280",
            font: "Calibri",
          }),
        ],
      }),
    ],
  };

  // ── Build Table of Contents section ────────────────────────────────────────
  const tocSection: ISectionOptions = {
    properties: {
      page: {
        margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
      },
    },
    children: [
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
        children: [
          new TextRun({ text: "Table of Contents", bold: true, size: 36, color: "1F2937" }),
        ],
      }),
      new TableOfContents("Table of Contents", {
        hyperlink: true,
        headingStyleRange: "1-3",
        stylesWithLevels: [
          new StyleLevel("Heading1", 1),
          new StyleLevel("Heading2", 2),
          new StyleLevel("Heading3", 3),
        ],
      }),
    ],
  };

  // ── Process markdown content into docx elements ────────────────────────────
  let isFirstH1 = true; // skip page break for the very first H1 (title)
  for (const seg of segments) {
    if (seg.type === "mermaid") {
      try {
        const pngBuffer = await mermaidToPng(seg.content, "default");
        const dims = getPngDimensions(pngBuffer);
        const maxWidth = 560;
        let w = dims.width;
        let h = dims.height;
        // Since mermaid uses 3x scale, scale down for DOCX embedding
        if (w > maxWidth * 3) {
          const scale = (maxWidth * 3) / w;
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        // Divide by deviceScaleFactor for display size
        w = Math.round(w / 3);
        h = Math.round(h / 3);

        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: pngBuffer,
                transformation: { width: w, height: h },
              }),
            ],
            spacing: { before: 240, after: 240 },
          })
        );
      } catch (err) {
        console.error("[mdToDocx] Mermaid render failed:", err);
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "[Mermaid Diagram – render failed]", bold: true, italics: true, color: "EF4444" })],
            spacing: { before: 100 },
          })
        );
        for (const codeLine of seg.content.split("\n")) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: codeLine, font: "Consolas", size: 16 })],
              shading: { type: ShadingType.SOLID, fill: "FEF2F2", color: "FEF2F2" },
            })
          );
        }
      }
    } else {
      const lines = seg.content.split("\n");
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];

        // Fenced code blocks
        if (/^```/.test(line)) {
          const lang = line.replace(/^```/, "").trim();
          const codeLines: string[] = [];
          i++;
          while (i < lines.length && !/^```$/.test(lines[i])) {
            codeLines.push(lines[i]);
            i++;
          }
          i++;
          if (lang) {
            children.push(
              new Paragraph({
                spacing: { before: 200 },
                children: [
                  new TextRun({ text: lang.toUpperCase(), bold: true, size: 16, color: "6B7280", font: "Calibri" }),
                ],
              })
            );
          }
          for (const cl of codeLines) {
            children.push(
              new Paragraph({
                children: [new TextRun({ text: cl || " ", font: "Consolas", size: 18, color: "1F2937" })],
                shading: { type: ShadingType.SOLID, fill: "F3F4F6", color: "F3F4F6" },
                spacing: { line: 276 },
              })
            );
          }
          children.push(new Paragraph({ spacing: { after: 120 }, text: "" }));
          continue;
        }

        // Markdown tables
        if (/^\|.*\|/.test(line) && i + 1 < lines.length && /^\|[\s-:|]+\|/.test(lines[i + 1])) {
          const tableRows: string[][] = [];
          while (i < lines.length && /^\|.*\|/.test(lines[i])) {
            const row = lines[i]
              .replace(/^\|/, "")
              .replace(/\|$/, "")
              .split("|")
              .map((c) => c.trim());
            if (!/^[\s-:]+$/.test(row.join(""))) {
              tableRows.push(row);
            }
            i++;
          }
          if (tableRows.length > 0) {
            const colCount = tableRows[0].length;
            const docxRows = tableRows.map(
              (row, rIdx) =>
                new TableRow({
                  children: row.map(
                    (cell) =>
                      new TableCell({
                        children: [
                          new Paragraph({
                            spacing: { before: 40, after: 40 },
                            children: [
                              new TextRun({
                                text: cell,
                                bold: rIdx === 0,
                                size: 20,
                                font: "Calibri",
                                color: rIdx === 0 ? "FFFFFF" : "374151",
                              }),
                            ],
                          }),
                        ],
                        width: { size: Math.floor(9000 / colCount), type: WidthType.DXA },
                        shading: rIdx === 0
                          ? { type: ShadingType.SOLID, fill: "374151", color: "374151" }
                          : rIdx % 2 === 0
                          ? { type: ShadingType.SOLID, fill: "F9FAFB", color: "F9FAFB" }
                          : undefined,
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
                          bottom: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
                          left: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
                          right: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
                        },
                      })
                  ),
                })
            );
            children.push(
              new Table({ rows: docxRows, width: { size: 9000, type: WidthType.DXA } })
            );
            children.push(new Paragraph({ spacing: { after: 120 }, text: "" }));
          }
          continue;
        }

        // Headings with page breaks for H1 and H2
        if (/^#{1,6}\s/.test(line)) {
          const hMatch = line.match(/^(#{1,6})\s+(.*)/);
          if (hMatch) {
            const level = hMatch[1].length;
            const text = hMatch[2];
            const headingLevel = [
              HeadingLevel.HEADING_1,
              HeadingLevel.HEADING_2,
              HeadingLevel.HEADING_3,
              HeadingLevel.HEADING_4,
              HeadingLevel.HEADING_5,
              HeadingLevel.HEADING_6,
            ][level - 1];

            // Page break before H1 (except the first one) and H2
            const needsPageBreak = (level === 1 && !isFirstH1) || level === 2;
            if (level === 1) isFirstH1 = false;

            const headingRuns: TextRun[] = [];
            if (needsPageBreak) {
              headingRuns.push(new TextRun({ break: 1, children: [new PageBreak()] }));
            }
            headingRuns.push(
              new TextRun({
                text,
                bold: true,
                size: [52, 40, 32, 26, 22, 20][level - 1],
                font: "Calibri",
                color: level <= 2 ? "111827" : "374151",
              })
            );

            // Add underline bar for H1 and H2
            children.push(
              new Paragraph({
                heading: headingLevel,
                spacing: { before: needsPageBreak ? 0 : 360, after: level <= 2 ? 60 : 120 },
                children: headingRuns,
              })
            );

            if (level <= 2) {
              children.push(
                new Paragraph({
                  spacing: { after: 200 },
                  children: [
                    new TextRun({
                      text: "─".repeat(level === 1 ? 60 : 45),
                      color: level === 1 ? "3B82F6" : "9CA3AF",
                      size: 16,
                    }),
                  ],
                })
              );
            }
          }
          i++;
          continue;
        }

        // Horizontal rule
        if (/^[-*_]{3,}\s*$/.test(line)) {
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "─".repeat(50), color: "D1D5DB", size: 16 })],
              spacing: { before: 200, after: 200 },
            })
          );
          i++;
          continue;
        }

        // Bullet list
        if (/^[-*+]\s+/.test(line)) {
          const text = line.replace(/^[-*+]\s+/, "");
          const runs = parseInlineMarkdown(text);
          children.push(
            new Paragraph({
              children: [new TextRun({ text: "  •  ", color: "6B7280" }), ...runs],
              indent: { left: 360 },
              spacing: { before: 40, after: 40 },
            })
          );
          i++;
          continue;
        }

        // Numbered list
        if (/^\d+\.\s+/.test(line)) {
          const nMatch = line.match(/^(\d+)\.\s+(.*)/);
          if (nMatch) {
            const runs = parseInlineMarkdown(nMatch[2]);
            children.push(
              new Paragraph({
                children: [new TextRun({ text: `  ${nMatch[1]}.  `, color: "6B7280", bold: true }), ...runs],
                indent: { left: 360 },
                spacing: { before: 40, after: 40 },
              })
            );
          }
          i++;
          continue;
        }

        // Blockquote
        if (/^>\s+/.test(line)) {
          const text = line.replace(/^>\s+/, "");
          children.push(
            new Paragraph({
              children: [new TextRun({ text, italics: true, color: "6B7280", size: 22, font: "Calibri" })],
              indent: { left: 600 },
              border: { left: { style: BorderStyle.SINGLE, size: 8, color: "3B82F6", space: 12 } },
              shading: { type: ShadingType.SOLID, fill: "EFF6FF", color: "EFF6FF" },
              spacing: { before: 80, after: 80 },
            })
          );
          i++;
          continue;
        }

        // Empty line
        if (line.trim() === "") {
          children.push(new Paragraph({ spacing: { before: 60, after: 60 }, text: "" }));
          i++;
          continue;
        }

        // Normal paragraph
        const runs = parseInlineMarkdown(line);
        children.push(
          new Paragraph({
            children: runs,
            spacing: { before: 60, after: 60, line: 320 },
          })
        );
        i++;
      }
    }
  }

  // ── Page header & footer ──────────────────────────────────────────────────
  const pageHeader = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: docTitle, size: 16, color: "9CA3AF", font: "Calibri", italics: true }),
        ],
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB", space: 4 } },
      }),
    ],
  });

  const pageFooter = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB", space: 4 } },
        children: [
          new TextRun({ text: "Page ", size: 16, color: "9CA3AF", font: "Calibri" }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "6B7280", font: "Calibri" }),
          new TextRun({ text: " of ", size: 16, color: "9CA3AF", font: "Calibri" }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "6B7280", font: "Calibri" }),
        ],
      }),
    ],
  });

  // ── Content section ─────────────────────────────────────────────────────
  const contentSection: ISectionOptions = {
    properties: {
      page: {
        margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        pageNumbers: {
          start: 1,
          formatType: NumberFormat.DECIMAL,
        },
      },
    },
    headers: { default: pageHeader },
    footers: { default: pageFooter },
    children,
  };

  // ── Document styles ─────────────────────────────────────────────────────
  const styles: IStylesOptions = {
    default: {
      document: {
        run: { size: 22, font: "Calibri", color: "1F2937" },
        paragraph: { spacing: { line: 300 } },
      },
      heading1: {
        run: { size: 52, bold: true, font: "Calibri", color: "111827" },
        paragraph: { spacing: { before: 360, after: 120 } },
      },
      heading2: {
        run: { size: 40, bold: true, font: "Calibri", color: "1F2937" },
        paragraph: { spacing: { before: 300, after: 100 } },
      },
      heading3: {
        run: { size: 32, bold: true, font: "Calibri", color: "374151" },
        paragraph: { spacing: { before: 240, after: 80 } },
      },
      heading4: {
        run: { size: 26, bold: true, font: "Calibri", color: "4B5563" },
        paragraph: { spacing: { before: 200, after: 60 } },
      },
    },
  };

  const doc = new Document({
    features: { updateFields: true },
    styles,
    sections: [coverSection, tocSection, contentSection],
  });

  return Packer.toBuffer(doc);
}

/**
 * Read PNG width/height from the IHDR chunk (bytes 16-23).
 */
function getPngDimensions(buf: Buffer): { width: number; height: number } {
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  return { width: 800, height: 400 }; // fallback
}

function parseInlineMarkdown(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|(.+?)(?=\*\*|\*|`|$))/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[2]) runs.push(new TextRun({ text: match[2], bold: true }));
    else if (match[3]) runs.push(new TextRun({ text: match[3], italics: true }));
    else if (match[4]) runs.push(new TextRun({ text: match[4], font: "Courier New" }));
    else if (match[5]) runs.push(new TextRun({ text: match[5] }));
  }
  return runs.length ? runs : [new TextRun({ text })];
}

// ─── HTML → MD ──────────────────────────────────────────────────────────────

export function htmlToMd(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n")
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n")
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1\n")
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*")
    .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "```\n$1\n```\n")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "$1\n\n")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<\/?(ul|ol|div|span|section|article|header|footer|main)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── HTML → TXT ─────────────────────────────────────────────────────────────

export function htmlToTxt(html: string): string {
  return htmlToMd(html).replace(/[#*`\[\]()!_~]/g, "").trim();
}
