/**
 * PDF Editor converters.
 *
 * The "rebuild" path takes edited markdown (extracted from a PDF, then changed
 * by the user) and produces a fresh, polished PDF with optional auto-formatting
 * — table of contents, page numbers, header, footer, cover page.
 *
 * It deliberately reuses the existing style-aware pipeline rather than adding
 * any new PDF logic: build a StyleConfig from the toggle options, render styled
 * HTML, then print with Puppeteer.
 *
 * The "overlay" / "decorate" paths defer to the Python backend (PyMuPDF) for
 * true in-place editing that preserves the original PDF's layout and images.
 */
import { mergeStyle, DEFAULT_STYLE } from "@/lib/styles/defaults";
import { mdToStyledHtml } from "./styledHtml";
import { htmlToPdf } from "./pdf";
import type { StyleConfig } from "@/types/style";
import type { ConvertOptions } from "@/types";

const PYTHON_BACKEND = process.env.PYTHON_BACKEND_URL ?? "http://localhost:8000";

/** Auto-format options the PDF editor exposes. Mirrors ConvertOptions pdf* fields. */
export interface PdfRebuildOptions {
  addToc?: boolean;
  addPageNumbers?: boolean;
  headerText?: string;
  footerText?: string;
  coverPage?: boolean;
  pageSize?: "A4" | "A3" | "Letter" | "Legal";
  orientation?: "portrait" | "landscape";
}

/** Map the flat ConvertOptions pdf* fields onto PdfRebuildOptions. */
export function rebuildOptionsFromConvert(o: ConvertOptions): PdfRebuildOptions {
  return {
    addToc: o.pdfAddToc,
    addPageNumbers: o.pdfAddPageNumbers,
    headerText: o.pdfHeaderText,
    footerText: o.pdfFooterText,
    coverPage: o.pdfCoverPage,
    pageSize: o.pdfPageSize,
    orientation: o.pdfOrientation,
  };
}

/**
 * Build a StyleConfig from the editor toggles. Starts from DEFAULT_STYLE and
 * turns each structural feature on/off based on what the user asked for, so the
 * resulting PDF only carries the decorations they enabled.
 */
function styleFromOptions(opts: PdfRebuildOptions): StyleConfig {
  const headerText = opts.headerText?.trim();
  const footerText = opts.footerText?.trim();

  return mergeStyle(DEFAULT_STYLE, {
    name: "PDF Editor",
    mode: "custom",
    page: {
      size: opts.pageSize ?? "A4",
      orientation: opts.orientation ?? "portrait",
    },
    structure: {
      cover: { enabled: !!opts.coverPage },
      toc: { enabled: !!opts.addToc },
      header: {
        enabled: !!headerText,
        text: headerText || undefined,
      },
      footer: {
        enabled: !!footerText,
        text: footerText || undefined,
      },
      pageNumbers: { enabled: !!opts.addPageNumbers },
    },
  });
}

/**
 * Rebuild a PDF from edited markdown with the chosen auto-formatting applied.
 * Original file stays untouched — this produces a brand-new PDF buffer.
 */
export async function rebuildPdfFromMarkdown(
  markdown: string,
  opts: PdfRebuildOptions = {},
): Promise<Buffer> {
  const style = styleFromOptions(opts);
  const html = await mdToStyledHtml(markdown, style);
  return htmlToPdf(html, {
    format: style.page.size as "A4",
    landscape: style.page.orientation === "landscape",
    styled: true,
  });
}

// ─── Overlay editing (Python / PyMuPDF) ──────────────────────────────────────

async function postToPython(path: string, form: FormData): Promise<Buffer> {
  let res: Response;
  try {
    res = await fetch(`${PYTHON_BACKEND}${path}`, { method: "POST", body: form });
  } catch {
    throw new Error(
      "PDF overlay editing requires the Python backend. Start it with: cd python_backend && python -m uvicorn app.main:app --reload",
    );
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `PDF overlay failed (${res.status})`);
  }
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

export interface TextReplacement {
  find: string;
  replace: string;
  /** Which matches to replace: "all" (default), "first", or a 1-based index. */
  occurrence?: "all" | "first" | number;
  /** Case-sensitive matching (default true). */
  matchCase?: boolean;
}

/**
 * In-place text edit on the original PDF (find/replace), preserving layout,
 * fonts, and images. Delegates to the Python PyMuPDF endpoint.
 */
export async function overlayEditPdf(
  buffer: Buffer,
  replacements: TextReplacement[],
): Promise<Buffer> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)], { type: "application/pdf" }), "input.pdf");
  form.append("replacements", JSON.stringify(replacements));
  return postToPython("/api/pdf-overlay", form);
}

export interface DecorateOptions {
  headerText?: string;
  footerText?: string;
  addPageNumbers?: boolean;
}

/**
 * Stamp header / footer / page numbers onto an existing PDF without altering
 * its content. Delegates to the Python PyMuPDF endpoint.
 */
export async function decoratePdf(buffer: Buffer, opts: DecorateOptions): Promise<Buffer> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)], { type: "application/pdf" }), "input.pdf");
  form.append("options", JSON.stringify(opts));
  return postToPython("/api/pdf-decorate", form);
}
