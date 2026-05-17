/**
 * Styled HTML renderer — applies a StyleConfig to convert Markdown
 * into a fully-styled HTML document.
 *
 * This is the new style-aware converter. The legacy mdToHtml() in text.ts
 * remains for backward compatibility. New code should prefer this.
 */
import { configureMarked } from "@/lib/marked-config";
import { marked } from "marked";
import type { StyleConfig } from "@/types/style";
import { styleConfigToCss, resolveCoverPageHtml, resolveTocHtml, slugify } from "@/lib/styles/engine";

configureMarked();

const MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";

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

function addHeadingAnchors(html: string): string {
  // Match h1-h6 with any existing attributes, then ensure an id="..." anchor exists.
  return html.replace(/<(h[1-6])([^>]*)>([\s\S]+?)<\/\1>/g, (_, tag, attrs, text) => {
    if (/\bid\s*=/.test(attrs)) return `<${tag}${attrs}>${text}</${tag}>`;
    const clean = text.replace(/<[^>]+>/g, "");
    return `<${tag}${attrs} id="${slugify(clean)}">${text}</${tag}>`;
  });
}

export async function mdToStyledHtml(markdown: string, style: StyleConfig): Promise<string> {
  const segments = splitMermaid(markdown);
  const hasMermaid = segments.some((s) => s.type === "mermaid");

  const bodyParts: string[] = [];
  for (const seg of segments) {
    if (seg.type === "text") {
      const parsed = await marked.parse(seg.content);
      bodyParts.push(addHeadingAnchors(parsed));
    } else {
      bodyParts.push(`<div class="mermaid">\n${seg.content}\n</div>`);
    }
  }
  const body = bodyParts.join("\n");

  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const docTitle = titleMatch ? titleMatch[1].replace(/[*_`#]/g, "").trim() : "Document";

  const coverHtml = resolveCoverPageHtml(style, docTitle);
  const tocHtml = resolveTocHtml(style, markdown);
  const css = styleConfigToCss(style);

  const mermaidScript = hasMermaid
    ? `<script src="${MERMAID_CDN}"></script>
       <script>mermaid.initialize({ startOnLoad: true, theme: '${style.colors.background === "#FFFFFF" ? "default" : "dark"}' });</script>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(docTitle)}</title>
  <style>${css}</style>
  ${mermaidScript}
</head>
<body>
${coverHtml}
${tocHtml}
${body}
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
