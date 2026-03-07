/**
 * DOCX ↔ HTML / MD / TXT converters (server-side via mammoth)
 */
import mammoth from "mammoth";
import { htmlToPdf } from "./pdf";
import { htmlToMd, mdToDocx } from "./text";

export async function docxToHtml(buffer: Buffer): Promise<string> {
  const result = await mammoth.convertToHtml({ buffer });
  return result.value;
}

export async function docxToMd(buffer: Buffer): Promise<string> {
  const html = await docxToHtml(buffer);
  return htmlToMd(html);
}

export async function docxToTxt(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function docxToPdf(buffer: Buffer): Promise<Buffer> {
  const html = await docxToHtml(buffer);
  const styledHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>body { font-family: sans-serif; max-width: 860px; margin: 40px auto; padding: 0 20px; line-height: 1.7; }</style>
</head><body>${html}</body></html>`;
  return htmlToPdf(styledHtml);
}

// Re-export mdToDocx so callers can import from one place
export { mdToDocx };
