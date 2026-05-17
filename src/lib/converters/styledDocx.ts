/**
 * Styled DOCX renderer — applies a StyleConfig to convert Markdown
 * into a styled Word document.
 *
 * Maps StyleConfig values (colors, fonts, sizes, decorations) onto the
 * `docx` package's primitives. Pt sizes are doubled for docx half-points.
 */
import {
  AlignmentType,
  BorderStyle as DocxBorderStyle,
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
  type IStylesOptions,
} from "docx";
import type { StyleConfig, HeadingConfig, FontConfig } from "@/types/style";
import { mermaidToPng } from "./mermaid";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Strip leading '#' from hex colors for the docx package. */
function hex(c: string): string {
  return c.replace(/^#/, "").toUpperCase();
}

/** Pt → docx half-points. */
function pt(n: number): number {
  return Math.round(n * 2);
}

/** Mm → twentieths-of-a-point (twips). 1 mm ≈ 56.7 twips. */
function mmToTwip(mm: number): number {
  return Math.round(mm * 56.6929);
}

/** Page sizes in twips. Letter/Legal in inches; everything else in mm. */
const PAGE_SIZES_TWIPS = {
  A3:      { width: 16838, height: 23811 },
  A4:      { width: 11906, height: 16838 },
  A5:      { width:  8391, height: 11906 },
  Letter:  { width: 12240, height: 15840 },
  Legal:   { width: 12240, height: 20160 },
  Tabloid: { width: 15840, height: 24480 },
} as const;

function getPageDims(size: keyof typeof PAGE_SIZES_TWIPS, orientation: "portrait" | "landscape") {
  const base = PAGE_SIZES_TWIPS[size] ?? PAGE_SIZES_TWIPS.A4;
  return orientation === "landscape"
    ? { width: base.height, height: base.width }
    : base;
}

interface Segment {
  type: "text" | "mermaid";
  content: string;
}

function splitMermaid(md: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /```mermaid\s*\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(md)) !== null) {
    if (m.index > last) segments.push({ type: "text", content: md.slice(last, m.index) });
    segments.push({ type: "mermaid", content: m[1].trim() });
    last = m.index + m[0].length;
  }
  if (last < md.length) segments.push({ type: "text", content: md.slice(last) });
  return segments;
}

function getPngDimensions(buf: Buffer): { width: number; height: number } {
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  return { width: 800, height: 400 };
}

function parseInline(text: string, body: FontConfig): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|(.+?)(?=\*\*|\*|`|$))/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[2]) runs.push(new TextRun({ text: match[2], bold: true, font: body.family, size: pt(body.size), color: hex(body.color) }));
    else if (match[3]) runs.push(new TextRun({ text: match[3], italics: true, font: body.family, size: pt(body.size), color: hex(body.color) }));
    else if (match[4]) runs.push(new TextRun({ text: match[4], font: "Consolas", size: pt(body.size - 1) }));
    else if (match[5]) runs.push(new TextRun({ text: match[5], font: body.family, size: pt(body.size), color: hex(body.color) }));
  }
  return runs.length ? runs : [new TextRun({ text, font: body.family, size: pt(body.size), color: hex(body.color) })];
}

// ─── Main: MD → Styled DOCX ─────────────────────────────────────────────────

export async function mdToStyledDocx(markdown: string, style: StyleConfig): Promise<Buffer> {
  const { colors, typography: t, codeBlock, blockquote, table, structure, page } = style;
  const segments = splitMermaid(markdown);
  const children: (Paragraph | Table)[] = [];

  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const docTitle = titleMatch ? titleMatch[1].trim() : "Document";

  // ── Cover Page ────────────────────────────────────────────────────────────
  const sections: ISectionOptions[] = [];

  if (structure.cover.enabled) {
    const cover = structure.cover;
    const accent = cover.accentColor ?? colors.primary;
    const dateStr = cover.showDate
      ? new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "";

    sections.push({
      properties: {
        page: {
          size: getPageDims(page.size as keyof typeof PAGE_SIZES_TWIPS, page.orientation),
          margin: { top: mmToTwip(page.margin.top), bottom: mmToTwip(page.margin.bottom), left: mmToTwip(page.margin.left), right: mmToTwip(page.margin.right) },
          pageNumbers: { start: 0 },
        },
        titlePage: true,
      },
      children: [
        new Paragraph({ spacing: { before: 4000 } }),
        cover.showTitle ? new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({
            text: docTitle, bold: true, size: pt(t.h1.size + 6), color: hex(accent), font: t.h1.family,
          })],
        }) : new Paragraph({ text: "" }),
        cover.showSubtitle && cover.subtitle ? new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [new TextRun({
            text: cover.subtitle, size: pt(14), color: hex(colors.muted), font: t.body.family, italics: true,
          })],
        }) : new Paragraph({ text: "" }),
        cover.showAuthor && cover.author ? new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 300 },
          children: [new TextRun({
            text: `by ${cover.author}`, size: pt(12), color: hex(colors.text), font: t.body.family,
          })],
        }) : new Paragraph({ text: "" }),
        dateStr ? new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 300 },
          children: [new TextRun({ text: dateStr, size: pt(11), color: hex(colors.muted), font: t.body.family })],
        }) : new Paragraph({ text: "" }),
      ],
    });
  }

  // ── TOC Section ───────────────────────────────────────────────────────────
  if (structure.toc.enabled) {
    sections.push({
      properties: {
        page: {
          size: getPageDims(page.size as keyof typeof PAGE_SIZES_TWIPS, page.orientation),
          margin: { top: mmToTwip(page.margin.top), bottom: mmToTwip(page.margin.bottom), left: mmToTwip(page.margin.left), right: mmToTwip(page.margin.right) },
        },
      },
      children: [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 300 },
          children: [new TextRun({ text: structure.toc.title, bold: true, size: pt(t.h1.size), color: hex(colors.primary), font: t.h1.family })],
        }),
        new TableOfContents(structure.toc.title, {
          hyperlink: true,
          headingStyleRange: `1-${structure.toc.maxDepth}`,
          stylesWithLevels: [
            new StyleLevel("Heading1", 1),
            new StyleLevel("Heading2", 2),
            new StyleLevel("Heading3", 3),
          ],
        }),
      ],
    });
  }

  // ── Content rendering ─────────────────────────────────────────────────────
  let isFirstH1 = true;
  for (const seg of segments) {
    if (seg.type === "mermaid") {
      try {
        const pngBuffer = await mermaidToPng(seg.content, "default");
        const dims = getPngDimensions(pngBuffer);
        const maxW = 560;
        let w = dims.width, h = dims.height;
        if (w > maxW * 3) {
          const s = (maxW * 3) / w;
          w = Math.round(w * s); h = Math.round(h * s);
        }
        w = Math.round(w / 3); h = Math.round(h / 3);
        children.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ data: pngBuffer, transformation: { width: w, height: h } })],
          spacing: { before: 240, after: 240 },
        }));
      } catch (err) {
        console.error("[mdToStyledDocx] mermaid render failed:", err);
        children.push(new Paragraph({
          children: [new TextRun({ text: "[Diagram render failed]", italics: true, color: "EF4444" })],
        }));
      }
      continue;
    }

    const lines = seg.content.split("\n");
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // Code blocks
      if (/^```/.test(line)) {
        const lang = line.replace(/^```/, "").trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !/^```$/.test(lines[i])) { codeLines.push(lines[i]); i++; }
        i++;
        if (lang) {
          children.push(new Paragraph({
            spacing: { before: 200 },
            // Language label must stay attached to the code below it.
            keepNext: true,
            children: [new TextRun({ text: lang.toUpperCase(), bold: true, size: pt(7), color: hex(colors.muted), font: t.body.family })],
          }));
        }
        for (const cl of codeLines) {
          children.push(new Paragraph({
            children: [new TextRun({ text: cl || " ", font: codeBlock.font, size: pt(codeBlock.fontSize), color: hex(codeBlock.textColor) })],
            shading: { type: ShadingType.SOLID, fill: hex(codeBlock.background), color: hex(codeBlock.background) },
            spacing: { line: 276 },
            // Keep all lines of a code block together — don't split across pages.
            keepLines: true,
            border: codeBlock.borderLeft ? {
              left: { style: DocxBorderStyle.SINGLE, size: codeBlock.borderLeft.width * 4, color: hex(codeBlock.borderLeft.color), space: 8 },
            } : undefined,
          }));
        }
        children.push(new Paragraph({ spacing: { after: 120 }, text: "" }));
        continue;
      }

      // Tables
      if (/^\|.*\|/.test(line) && i + 1 < lines.length && /^\|[\s-:|]+\|/.test(lines[i + 1])) {
        const tableRows: string[][] = [];
        while (i < lines.length && /^\|.*\|/.test(lines[i])) {
          const row = lines[i].replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
          if (!/^[\s-:]+$/.test(row.join(""))) tableRows.push(row);
          i++;
        }
        if (tableRows.length > 0) {
          const colCount = tableRows[0].length;
          const docxRows = tableRows.map((row, rIdx) =>
            new TableRow({
              // Keep each row intact — don't break a cell across pages.
              cantSplit: true,
              // First row is header — repeat on each page if table spans multiple pages.
              tableHeader: rIdx === 0,
              children: row.map((cell) =>
                new TableCell({
                  children: [new Paragraph({
                    spacing: { before: 40, after: 40 },
                    children: [new TextRun({
                      text: cell, bold: rIdx === 0 && table.headerBold,
                      size: pt(table.fontSize), font: t.body.family,
                      color: hex(rIdx === 0 ? table.headerColor : colors.text),
                    })],
                  })],
                  width: { size: Math.floor(9000 / colCount), type: WidthType.DXA },
                  shading: rIdx === 0
                    ? { type: ShadingType.SOLID, fill: hex(table.headerBackground), color: hex(table.headerBackground) }
                    : (table.style === "striped" && rIdx % 2 === 0)
                    ? { type: ShadingType.SOLID, fill: hex(table.rowAltBackground), color: hex(table.rowAltBackground) }
                    : undefined,
                  borders: {
                    top:    { style: DocxBorderStyle.SINGLE, size: table.borderWidth * 4, color: hex(table.borderColor) },
                    bottom: { style: DocxBorderStyle.SINGLE, size: table.borderWidth * 4, color: hex(table.borderColor) },
                    left:   { style: DocxBorderStyle.SINGLE, size: table.borderWidth * 4, color: hex(table.borderColor) },
                    right:  { style: DocxBorderStyle.SINGLE, size: table.borderWidth * 4, color: hex(table.borderColor) },
                  },
                })
              ),
            })
          );
          children.push(new Table({ rows: docxRows, width: { size: 9000, type: WidthType.DXA } }));
          children.push(new Paragraph({ spacing: { after: 120 }, text: "" }));
        }
        continue;
      }

      // Headings
      if (/^#{1,6}\s/.test(line)) {
        const hMatch = line.match(/^(#{1,6})\s+(.*)/);
        if (hMatch) {
          const level = hMatch[1].length;
          const text = hMatch[2];
          const headingLevel = [
            HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3,
            HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6,
          ][level - 1];
          const hConfig: HeadingConfig = (t as any)[`h${level}`];

          const needsBreak = (level === 1 && !isFirstH1 && structure.h1NewPage)
                          || (level === 2 && structure.h2NewPage)
                          || (hConfig.pageBreakBefore && !isFirstH1);
          if (level === 1) isFirstH1 = false;

          const runs: TextRun[] = [];
          if (needsBreak) runs.push(new TextRun({ children: [new PageBreak()] }));
          runs.push(new TextRun({
            text, bold: true, size: pt(hConfig.size),
            font: hConfig.family, color: hex(hConfig.color),
          }));

          children.push(new Paragraph({
            heading: headingLevel,
            alignment: hConfig.align === "center" ? AlignmentType.CENTER : hConfig.align === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT,
            spacing: { before: needsBreak ? 0 : pt(hConfig.marginTop), after: pt(hConfig.marginBottom) },
            children: runs,
            // Professional polish: keep heading with the paragraph that follows,
            // and don't split a heading across pages.
            keepNext: true,
            keepLines: true,
            border: hConfig.borderBottom ? {
              bottom: { style: DocxBorderStyle.SINGLE, size: hConfig.borderBottom.width * 4, color: hex(hConfig.borderBottom.color), space: 4 },
            } : undefined,
          }));
        }
        i++; continue;
      }

      // HR
      if (/^[-*_]{3,}\s*$/.test(line)) {
        children.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "─".repeat(50), color: hex(colors.border), size: 16 })],
          spacing: { before: 200, after: 200 },
        }));
        i++; continue;
      }

      // Bullet list
      if (/^[-*+]\s+/.test(line)) {
        const text = line.replace(/^[-*+]\s+/, "");
        children.push(new Paragraph({
          children: [
            new TextRun({ text: "  •  ", color: hex(colors.primary), bold: true }),
            ...parseInline(text, t.body),
          ],
          indent: { left: 360 },
          spacing: { before: 40, after: 40 },
        }));
        i++; continue;
      }

      // Numbered list
      if (/^\d+\.\s+/.test(line)) {
        const nMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (nMatch) {
          children.push(new Paragraph({
            children: [
              new TextRun({ text: `  ${nMatch[1]}.  `, color: hex(colors.primary), bold: true }),
              ...parseInline(nMatch[2], t.body),
            ],
            indent: { left: 360 },
            spacing: { before: 40, after: 40 },
          }));
        }
        i++; continue;
      }

      // Blockquote
      if (/^>\s+/.test(line)) {
        const text = line.replace(/^>\s+/, "");
        children.push(new Paragraph({
          children: [new TextRun({
            text, italics: blockquote.italic,
            color: hex(blockquote.font.color), size: pt(blockquote.font.size),
            font: blockquote.font.family,
          })],
          indent: { left: 600 },
          border: { left: { style: DocxBorderStyle.SINGLE, size: blockquote.borderLeft.width * 4, color: hex(blockquote.borderLeft.color), space: 12 } },
          shading: blockquote.background !== "transparent" ? { type: ShadingType.SOLID, fill: hex(blockquote.background), color: hex(blockquote.background) } : undefined,
          spacing: { before: 80, after: 80 },
        }));
        i++; continue;
      }

      // Empty
      if (line.trim() === "") {
        children.push(new Paragraph({ spacing: { before: 60, after: 60 }, text: "" }));
        i++; continue;
      }

      // Normal paragraph
      children.push(new Paragraph({
        children: parseInline(line, t.body),
        alignment: t.body.align === "justify" ? AlignmentType.JUSTIFIED : t.body.align === "center" ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { before: 60, after: pt(t.paragraphSpacing), line: Math.round(t.body.lineHeight * 240) },
        indent: t.paragraphIndent ? { firstLine: pt(t.paragraphIndent) } : undefined,
      }));
      i++;
    }
  }

  // ── Header & Footer ───────────────────────────────────────────────────────
  const header = structure.header.enabled ? new Header({
    children: [new Paragraph({
      alignment: structure.header.align === "right" ? AlignmentType.RIGHT : structure.header.align === "center" ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({
        text: structure.header.text ?? docTitle,
        size: pt(structure.header.fontSize), color: hex(structure.header.color),
        font: t.body.family, italics: true,
      })],
      border: structure.header.borderBottom?.width ? {
        bottom: { style: DocxBorderStyle.SINGLE, size: structure.header.borderBottom.width * 4, color: hex(structure.header.borderBottom.color), space: 4 },
      } : undefined,
    })],
  }) : undefined;

  const footer = (structure.footer.enabled || structure.pageNumbers.enabled) ? new Footer({
    children: [new Paragraph({
      alignment: structure.pageNumbers.position.includes("right") ? AlignmentType.RIGHT
              : structure.pageNumbers.position.includes("left") ? AlignmentType.LEFT
              : AlignmentType.CENTER,
      border: structure.footer.borderBottom?.width ? {
        top: { style: DocxBorderStyle.SINGLE, size: structure.footer.borderBottom.width * 4, color: hex(structure.footer.borderBottom.color), space: 4 },
      } : undefined,
      children: structure.pageNumbers.enabled ? buildPageNumberRuns(structure.pageNumbers.format, structure.pageNumbers.fontSize, structure.pageNumbers.color, t.body.family) : [
        new TextRun({ text: structure.footer.text ?? "", size: pt(structure.footer.fontSize), color: hex(structure.footer.color), font: t.body.family }),
      ],
    })],
  }) : undefined;

  sections.push({
    properties: {
      page: {
        size: getPageDims(page.size as keyof typeof PAGE_SIZES_TWIPS, page.orientation),
        margin: { top: mmToTwip(page.margin.top), bottom: mmToTwip(page.margin.bottom), left: mmToTwip(page.margin.left), right: mmToTwip(page.margin.right) },
        pageNumbers: { start: structure.pageNumbers.startFrom, formatType: NumberFormat.DECIMAL },
      },
    },
    headers: header ? { default: header } : undefined,
    footers: footer ? { default: footer } : undefined,
    children,
  });

  // ── Styles ────────────────────────────────────────────────────────────────
  const styles: IStylesOptions = {
    default: {
      document: {
        run: { size: pt(t.body.size), font: t.body.family, color: hex(t.body.color) },
        paragraph: { spacing: { line: Math.round(t.body.lineHeight * 240) } },
      },
      heading1: { run: { size: pt(t.h1.size), bold: true, font: t.h1.family, color: hex(t.h1.color) }, paragraph: { spacing: { before: pt(t.h1.marginTop), after: pt(t.h1.marginBottom) } } },
      heading2: { run: { size: pt(t.h2.size), bold: true, font: t.h2.family, color: hex(t.h2.color) }, paragraph: { spacing: { before: pt(t.h2.marginTop), after: pt(t.h2.marginBottom) } } },
      heading3: { run: { size: pt(t.h3.size), bold: true, font: t.h3.family, color: hex(t.h3.color) }, paragraph: { spacing: { before: pt(t.h3.marginTop), after: pt(t.h3.marginBottom) } } },
      heading4: { run: { size: pt(t.h4.size), bold: true, font: t.h4.family, color: hex(t.h4.color) }, paragraph: { spacing: { before: pt(t.h4.marginTop), after: pt(t.h4.marginBottom) } } },
    },
  };

  const doc = new Document({
    features: { updateFields: true },
    styles,
    sections,
  });

  return Packer.toBuffer(doc);
}

function buildPageNumberRuns(format: string, fontSize: number, color: string, family: string): TextRun[] {
  const runs: TextRun[] = [];
  const parts = format.split(/(\{n\}|\{total\})/);
  for (const p of parts) {
    if (p === "{n}") {
      runs.push(new TextRun({ children: [PageNumber.CURRENT], size: pt(fontSize), color: hex(color), font: family }));
    } else if (p === "{total}") {
      runs.push(new TextRun({ children: [PageNumber.TOTAL_PAGES], size: pt(fontSize), color: hex(color), font: family }));
    } else if (p) {
      runs.push(new TextRun({ text: p, size: pt(fontSize), color: hex(color), font: family }));
    }
  }
  return runs;
}
