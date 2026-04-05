/**
 * PDF → text/md/html/docx converters using pdf-parse for text extraction.
 */

import pdfParse from "pdf-parse";
import { htmlToPdf } from "./pdf";
import { mdToDocx } from "./text";

// ── Extract plain text from PDF ───────────────────────────────────────────────

export async function pdfToTxt(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

// ── PDF → Markdown ────────────────────────────────────────────────────────────
// Best-effort: preserve paragraph structure and detect headings heuristically.

export async function pdfToMd(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  const raw  = data.text;

  const lines  = raw.split("\n");
  const output: string[] = [];
  let   blankRun = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      blankRun++;
      // Collapse multiple blanks into a single paragraph break
      if (blankRun === 1) output.push("");
      continue;
    }
    blankRun = 0;

    // Heading heuristic: short line, title-cased or all-caps, no terminal punctuation
    const isHeading =
      trimmed.length < 80 &&
      !trimmed.endsWith(".") &&
      !trimmed.endsWith(",") &&
      !trimmed.endsWith(";") &&
      (trimmed === trimmed.toUpperCase() || trimmed === trimmed.replace(/\b\w/g, (c) => c.toUpperCase()));

    // Bullet list heuristic
    const isBullet = /^[\u2022\u2023\u25e6\-\*\+]\s/.test(trimmed);
    const isNumbered = /^\d+[\.\)]\s/.test(trimmed);

    if (isHeading && trimmed.length < 50) {
      output.push(`## ${trimmed}`);
    } else if (isBullet) {
      output.push(`- ${trimmed.replace(/^[\u2022\u2023\u25e6\-\*\+]\s+/, "")}`);
    } else if (isNumbered) {
      output.push(trimmed); // keep as-is
    } else {
      output.push(trimmed);
    }
  }

  return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ── PDF → HTML ────────────────────────────────────────────────────────────────

export async function pdfToHtml(buffer: Buffer): Promise<string> {
  const text = await pdfToMd(buffer);
  // Convert the markdown output to simple HTML paragraphs
  const lines = text.split("\n");
  const htmlLines = lines.map((line) => {
    if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
    if (line.startsWith("# "))  return `<h1>${line.slice(2)}</h1>`;
    if (line.startsWith("### ")) return `<h3>${line.slice(4)}</h3>`;
    if (line.startsWith("- "))  return `<li>${line.slice(2)}</li>`;
    if (line.trim() === "")     return "";
    return `<p>${line}</p>`;
  });

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body { font-family: sans-serif; max-width: 860px; margin: 40px auto; padding: 0 24px; line-height: 1.7; color: #1a1a1a; }
  h1,h2,h3 { margin-top: 1.5em; }
  p { margin: 0.6em 0; }
  li { margin: 0.3em 0; }
</style>
</head><body>
${htmlLines.join("\n")}
</body></html>`;
}

// ── PDF → DOCX ────────────────────────────────────────────────────────────────

export async function pdfToDocx(buffer: Buffer): Promise<Buffer> {
  const md = await pdfToMd(buffer);
  return mdToDocx(md);
}
