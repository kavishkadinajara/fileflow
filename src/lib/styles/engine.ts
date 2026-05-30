/**
 * Style Engine
 *
 * Converts a StyleConfig into output-format-specific styling artifacts:
 *  - styleConfigToCss(): full CSS stylesheet for HTML/PDF output
 *  - styleConfigToDocxStyles(): style options for the `docx` package
 *  - resolveCoverPageHtml(): HTML for the cover page
 *  - resolveTocHtml(): HTML for the TOC (linked anchors)
 */
import type { StyleConfig, HeadingConfig, FontConfig } from "@/types/style";

// ─── HTML / CSS Output ──────────────────────────────────────────────────────

export function styleConfigToCss(s: StyleConfig): string {
  const { page, colors, typography: t, codeBlock, inlineCode, blockquote, table, list, image, link, structure } = s;

  const fontFace = (f: FontConfig) => `
    font-family: ${f.family};
    font-size: ${f.size}pt;
    font-weight: ${f.weight};
    color: ${f.color};
    line-height: ${f.lineHeight};
    ${f.letterSpacing ? `letter-spacing: ${f.letterSpacing}em;` : ""}
    ${f.align ? `text-align: ${f.align};` : ""}
  `;

  const headingRule = (sel: string, h: HeadingConfig) => `
    ${sel} {
      ${fontFace(h)}
      margin-top: ${h.marginTop}pt;
      margin-bottom: ${h.marginBottom}pt;
      ${h.borderBottom ? `border-bottom: ${h.borderBottom.width}px ${h.borderBottom.style} ${h.borderBottom.color};` : ""}
      ${h.textTransform ? `text-transform: ${h.textTransform};` : ""}
      ${h.pageBreakBefore ? "page-break-before: always; break-before: page;" : ""}
      /* Professional polish: never leave a heading orphaned at the bottom of a page */
      page-break-after: avoid; break-after: avoid;
      page-break-inside: avoid; break-inside: avoid;
      ${h.decoration === "background-fill" ? `background: ${colors.primary}; color: ${colors.background}; padding: 8px 12px; border-radius: 4px;` : ""}
      ${h.decoration === "side-bar" ? `border-left: 4px solid ${colors.primary}; padding-left: 12px;` : ""}
    }
    ${sel}:first-of-type { page-break-before: avoid; break-before: avoid; }
  `;

  const bulletChar = (() => {
    switch (list.bulletStyle) {
      case "arrow": return "'→  '";
      case "check": return "'✓  '";
      case "custom": return `'${list.customBullet ?? "•"}  '`;
      case "square": return "'▪  '";
      case "circle": return "'○  '";
      default: return "'•  '";
    }
  })();

  const tableStripe = table.style === "striped" ? `tr:nth-child(even) td { background: ${table.rowAltBackground}; }` : "";
  const tableBorders = table.style === "minimal"
    ? `td, th { border: none; border-bottom: 1px solid ${table.borderColor}; }`
    : `td, th { border: ${table.borderWidth}px solid ${table.borderColor}; }`;

  return `
    @page {
      size: ${page.size} ${page.orientation};
      margin: ${page.margin.top}mm ${page.margin.right}mm ${page.margin.bottom}mm ${page.margin.left}mm;
    }
    * { box-sizing: border-box; }
    body {
      ${fontFace(t.body)}
      background: ${page.background};
      margin: 0;
      padding: 0;
      ${page.columns > 1 ? `column-count: ${page.columns}; column-gap: ${page.columnGap ?? 10}mm;` : ""}
    }
    p {
      margin: 0 0 ${t.paragraphSpacing}pt 0;
      ${t.paragraphIndent ? `text-indent: ${t.paragraphIndent}pt;` : ""}
      orphans: 3; widows: 3;
    }
    /* Professional polish: heading must stay with the paragraph that follows it */
    h1 + p, h2 + p, h3 + p, h4 + p, h5 + p, h6 + p,
    h1 + ul, h2 + ul, h3 + ul, h4 + ul,
    h1 + ol, h2 + ol, h3 + ol, h4 + ol,
    h1 + table, h2 + table, h3 + table, h4 + table,
    h1 + pre, h2 + pre, h3 + pre, h4 + pre,
    h1 + blockquote, h2 + blockquote, h3 + blockquote, h4 + blockquote {
      page-break-before: avoid; break-before: avoid;
    }
    ${headingRule("h1", t.h1)}
    ${headingRule("h2", t.h2)}
    ${headingRule("h3", t.h3)}
    ${headingRule("h4", t.h4)}
    ${headingRule("h5", t.h5)}
    ${headingRule("h6", t.h6)}
    ${t.dropCap ? `
      h1 + p::first-letter {
        float: left;
        font-size: ${t.body.size * 4}pt;
        line-height: 0.85;
        padding-right: 8px;
        font-weight: bold;
        color: ${colors.primary};
      }
    ` : ""}
    a { color: ${link.color}; text-decoration: ${link.underline ? "underline" : "none"}; }
    a:hover { color: ${link.hoverColor ?? colors.primary}; }
    pre {
      background: ${codeBlock.background};
      color: ${codeBlock.textColor};
      padding: ${codeBlock.padding}px;
      border-radius: ${codeBlock.borderRadius}px;
      font-family: ${codeBlock.font};
      font-size: ${codeBlock.fontSize}pt;
      overflow-x: auto;
      page-break-inside: avoid;
      ${codeBlock.borderLeft ? `border-left: ${codeBlock.borderLeft.width}px solid ${codeBlock.borderLeft.color};` : ""}
    }
    pre code { background: none; padding: 0; color: inherit; }
    code {
      font-family: ${inlineCode.font};
      background: ${inlineCode.background};
      color: ${inlineCode.textColor};
      padding: ${inlineCode.padding};
      border-radius: ${inlineCode.borderRadius}px;
      font-size: 0.9em;
    }
    blockquote {
      ${fontFace(blockquote.font)}
      background: ${blockquote.background};
      border-left: ${blockquote.borderLeft.width}px solid ${blockquote.borderLeft.color};
      padding: ${blockquote.padding}px;
      margin: 16px 0;
      ${blockquote.italic ? "font-style: italic;" : ""}
      ${blockquote.style === "callout" ? `border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);` : ""}
      ${blockquote.style === "minimal" ? "border-left: none; background: transparent; padding-left: 0;" : ""}
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
      font-size: ${table.fontSize}pt;
      page-break-inside: avoid;
    }
    ${tableBorders}
    th {
      background: ${table.headerBackground};
      color: ${table.headerColor};
      ${table.headerBold ? "font-weight: bold;" : ""}
      padding: ${table.cellPadding}px;
      text-align: left;
    }
    td { padding: ${table.cellPadding}px; background: ${table.rowBackground}; }
    ${tableStripe}
    ul, ol {
      padding-left: ${list.indent}pt;
      margin: ${list.spacing}pt 0;
    }
    ul { list-style: none; }
    ul > li::before {
      content: ${bulletChar};
      color: ${colors.primary};
      font-weight: bold;
      margin-left: -${list.indent * 0.6}pt;
    }
    ${list.numberStyle ? `ol { list-style-type: ${list.numberStyle}; }` : ""}
    li { margin: ${list.spacing}pt 0; line-height: ${t.body.lineHeight}; }
    img {
      max-width: ${image.maxWidth};
      display: block;
      margin: 16px ${image.align === "center" ? "auto" : image.align === "right" ? "0 0 auto" : "0"};
      border-radius: ${image.borderRadius}px;
      ${image.shadow ? "box-shadow: 0 4px 12px rgba(0,0,0,0.12);" : ""}
    }
    hr {
      border: none;
      border-top: 1px solid ${colors.border};
      margin: 24px 0;
    }
    /* Cover page */
    .cover-page {
      min-height: 90vh;
      display: flex;
      flex-direction: column;
      page-break-after: always;
      ${structure.cover.backgroundColor ? `background: ${structure.cover.backgroundColor};` : ""}
    }
    .cover-page.layout-centered { justify-content: center; align-items: center; text-align: center; }
    .cover-page.layout-left-aligned { justify-content: flex-end; align-items: flex-start; text-align: left; padding: 0 20mm 30mm; }
    .cover-page.layout-banner { justify-content: center; align-items: center; text-align: center; background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary}); color: white; }
    .cover-page.layout-gradient { justify-content: center; align-items: center; text-align: center; background: linear-gradient(180deg, ${colors.background} 0%, ${colors.surface} 100%); }
    .cover-title { font-size: 36pt; font-weight: 700; margin: 0 0 12px; color: ${structure.cover.accentColor ?? colors.primary}; }
    .cover-subtitle { font-size: 16pt; color: ${colors.muted}; margin-bottom: 24px; }
    .cover-meta { color: ${colors.muted}; font-size: 11pt; margin-top: 16px; }
    .cover-logo { max-width: 120px; margin-bottom: 32px; }
    /* TOC */
    .toc { page-break-after: always; }
    .toc-title {
      font-size: 22pt;
      color: ${colors.primary};
      border-bottom: 2px solid ${colors.primary};
      padding-bottom: 8px;
      margin-bottom: 16px;
    }
    .toc ul { list-style: none; padding: 0; }
    .toc li { padding: 4px 0; font-size: 11pt; }
    .toc li.depth-2 { padding-left: 20px; }
    .toc li.depth-3 { padding-left: 40px; }
    .toc a { color: ${structure.toc.linkColor ?? colors.link}; text-decoration: none; }
    .toc.style-dotted a::after { content: leader('.'); }
    ${s.customCss ?? ""}
  `;
}

// ─── Cover page HTML ────────────────────────────────────────────────────────

export function resolveCoverPageHtml(s: StyleConfig, docTitle: string): string {
  const c = s.structure.cover;
  if (!c.enabled) return "";

  const dateStr = (() => {
    if (!c.showDate) return "";
    const d = new Date();
    switch (c.dateFormat) {
      case "short": return d.toLocaleDateString("en-US");
      case "iso": return d.toISOString().split("T")[0];
      default: return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    }
  })();

  return `
    <div class="cover-page layout-${c.layout}">
      ${c.showLogo && c.logoUrl ? `<img class="cover-logo" src="${c.logoUrl}" alt="logo" />` : ""}
      ${c.showTitle ? `<h1 class="cover-title">${escapeHtml(docTitle)}</h1>` : ""}
      ${c.showSubtitle && c.subtitle ? `<div class="cover-subtitle">${escapeHtml(c.subtitle)}</div>` : ""}
      ${c.showAuthor && c.author ? `<div class="cover-meta">by ${escapeHtml(c.author)}</div>` : ""}
      ${dateStr ? `<div class="cover-meta">${dateStr}</div>` : ""}
    </div>
  `;
}

// ─── TOC HTML (extracted from markdown headings) ────────────────────────────

export function resolveTocHtml(s: StyleConfig, markdown: string): string {
  const toc = s.structure.toc;
  if (!toc.enabled) return "";

  const headingRegex = new RegExp(`^(#{1,${toc.maxDepth}})\\s+(.+)$`, "gm");
  const items: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = headingRegex.exec(markdown)) !== null) {
    const level = m[1].length;
    const text = m[2].replace(/[*_`#]/g, "").trim();
    const anchor = slugify(text);
    items.push(`<li class="depth-${level}"><a href="#${anchor}">${escapeHtml(text)}</a></li>`);
  }
  if (items.length < 2) return ""; // skip TOC for short docs

  return `
    <div class="toc style-${toc.style}">
      <h2 class="toc-title">${escapeHtml(toc.title)}</h2>
      <ul>${items.join("")}</ul>
    </div>
  `;
}

// ─── Utilities ──────────────────────────────────────────────────────────────

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
