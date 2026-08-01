import { FORMAT_META, isConversionSupported } from "@/lib/formats";
import { getTemplate, PRESERVE_TEMPLATE_ID } from "@/lib/styles/templates";
import { DEFAULT_STYLE, mergeStyle } from "@/lib/styles/defaults";
import { detectStyle } from "@/lib/styles/detect";
import type { StyleConfig } from "@/types/style";
import type { FileFormat } from "@/types";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ─── Converters ──────────────────────────────────────────────────────────────
import {
  csvToHtml,
  csvToJson, csvToYaml,
  jsonToCsv, jsonToTxt,
  jsonToYaml,
  yamlToJson, yamlToTxt,
} from "@/lib/converters/data";
import { docxToHtml, docxToMd, docxToPdf, docxToTxt } from "@/lib/converters/docx";
import { pdfToDocx, pdfToHtml, pdfToMd, pdfToTxt } from "@/lib/converters/pdfExtract";
import { imageToJpeg, imageToPng, pngToSvg, svgToPng } from "@/lib/converters/image";
import { mermaidToHtml, mermaidToPdf, mermaidToPng, mermaidToSvg } from "@/lib/converters/mermaid";
import { htmlToPdf, htmlToPng } from "@/lib/converters/pdf";
import { rebuildPdfFromMarkdown, rebuildOptionsFromConvert } from "@/lib/converters/pdfEdit";
import type { ConvertOptions } from "@/types";
import { convertSql } from "@/lib/converters/sql";
import { htmlToMd, htmlToTxt, mdToDocx, mdToHtml, mdToTxt } from "@/lib/converters/text";
import { mdToStyledHtml } from "@/lib/converters/styledHtml";
import { mdToStyledDocx } from "@/lib/converters/styledDocx";

// ─── Validation ──────────────────────────────────────────────────────────────

const RequestSchema = z.object({
  fileBase64: z.string().min(1),
  fileName: z.string().min(1).max(255),
  fromFormat: z.string(),
  toFormat: z.string(),
  options: z
    .object({
      pdfPageSize: z.enum(["A4", "A3", "Letter", "Legal"]).optional(),
      pdfOrientation: z.enum(["portrait", "landscape"]).optional(),
      imageQuality: z.number().min(1).max(100).optional(),
      mermaidTheme: z.enum(["default", "dark", "forest", "neutral"]).optional(),
    })
    .optional(),
  /** Apply a built-in template by id (e.g. "academic", "business-report") */
  styleId: z.string().optional(),
  /** Apply a custom StyleConfig (overrides styleId). Schema is loose to keep route flexible. */
  customStyle: z.record(z.string(), z.any()).optional(),
  /** Run the style-detection engine on the source and apply the inferred style. */
  autoDetect: z.boolean().optional(),
});

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
  }

  const { fileBase64, fileName, fromFormat, toFormat, options = {}, styleId, customStyle, autoDetect } = parsed.data;

  // Decode early — both conversion and detection need the buffer.
  let fileBufferEarly: Buffer;
  try {
    fileBufferEarly = Buffer.from(fileBase64, "base64");
  } catch {
    return NextResponse.json({ success: false, error: "Invalid base64 file data" }, { status: 400 });
  }
  const fileTextEarly = fileBufferEarly.toString("utf-8");

  // Resolve StyleConfig.
  //   1. autoDetect    — run detection engine on source
  //   2. customStyle   — user-built in Studio, wins outright
  //   3. styleId       — built-in template gallery
  //   4. fallback      — preserve-original template
  let style: StyleConfig | undefined;
  let detectionReport: import("@/lib/styles/detect").DetectionReport | undefined;
  if (autoDetect) {
    // Binary formats (docx/pdf) need the raw buffer; text formats use the decoded string.
    const binaryFormats: FileFormat[] = ["docx", "pdf", "png", "jpeg"];
    const source: string | Buffer = binaryFormats.includes(fromFormat as FileFormat) ? fileBufferEarly : fileTextEarly;
    const detected = await detectStyle(fromFormat as FileFormat, source);
    style = detected.style;
    detectionReport = detected.report;
  } else if (customStyle) {
    style = mergeStyle(DEFAULT_STYLE, customStyle as Parameters<typeof mergeStyle<StyleConfig>>[1]);
  } else if (styleId) {
    const tpl = getTemplate(styleId);
    if (tpl) style = tpl.config;
  } else {
    const preserve = getTemplate(PRESERVE_TEMPLATE_ID);
    if (preserve) style = preserve.config;
  }

  if (!isConversionSupported(fromFormat as FileFormat, toFormat as FileFormat)) {
    return NextResponse.json(
      { success: false, error: `Conversion from '${fromFormat}' to '${toFormat}' is not supported.` },
      { status: 400 }
    );
  }

  const fileBuffer = fileBufferEarly;
  const fileText = fileTextEarly;

  try {
    const { resultBuffer, resultText, mimeType, ext } = await runConversion({
      fromFormat: fromFormat as FileFormat,
      toFormat: toFormat as FileFormat,
      fileBuffer,
      fileText,
      options,
      style,
    });

    const outBase64 = resultBuffer
      ? resultBuffer.toString("base64")
      : Buffer.from(resultText ?? "", "utf-8").toString("base64");

    const base = fileName.replace(/\.[^.]+$/, "");
    const outFileName = base + (ext ?? FORMAT_META[toFormat as FileFormat].extension);

    return NextResponse.json({
      success: true,
      fileBase64: outBase64,
      fileName: outFileName,
      mimeType: mimeType ?? FORMAT_META[toFormat as FileFormat].mime,
      // When detection ran, include the report so the UI can show what was inferred.
      detection: detectionReport,
    });
  } catch (err) {
    console.error("[convert] error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Conversion failed" },
      { status: 500 }
    );
  }
}

// ─── Dispatch Logic ──────────────────────────────────────────────────────────

interface ConversionInput {
  fromFormat: FileFormat;
  toFormat: FileFormat;
  fileBuffer: Buffer;
  fileText: string;
  options: Record<string, unknown>;
  style?: StyleConfig;
}

interface ConversionResult {
  resultBuffer?: Buffer;
  resultText?: string;
  mimeType?: string;
  ext?: string;
}

async function runConversion(input: ConversionInput): Promise<ConversionResult> {
  const { fromFormat, toFormat, fileBuffer, fileText, options, style } = input;

  // ── Markdown ──────────────────────────────────────────────────────────────
  if (fromFormat === "md" && toFormat === "html") {
    return { resultText: style ? await mdToStyledHtml(fileText, style) : await mdToHtml(fileText) };
  }
  if (fromFormat === "md" && toFormat === "txt") {
    return { resultText: mdToTxt(fileText) };
  }
  if (fromFormat === "md" && toFormat === "docx") {
    const buf = style ? await mdToStyledDocx(fileText, style) : await mdToDocx(fileText);
    return { resultBuffer: buf };
  }
  if (fromFormat === "md" && toFormat === "pdf") {
    // PDF Editor rebuild — any pdf* auto-format toggle routes through the
    // editor pipeline so the chosen header/footer/TOC/page-numbers are applied.
    const o = options as ConvertOptions;
    const hasEditorToggles =
      o.pdfAddToc || o.pdfAddPageNumbers || o.pdfHeaderText || o.pdfFooterText || o.pdfCoverPage;
    if (hasEditorToggles) {
      const buf = await rebuildPdfFromMarkdown(fileText, rebuildOptionsFromConvert(o));
      return { resultBuffer: buf };
    }
    if (style) {
      const html = await mdToStyledHtml(fileText, style);
      const buf = await htmlToPdf(html, {
        format: style.page.size as "A4",
        landscape: style.page.orientation === "landscape",
        styled: true,
      });
      return { resultBuffer: buf };
    }
    const html = await mdToHtml(fileText);
    const buf = await htmlToPdf(html, {
      format: (options.pdfPageSize as "A4") ?? "A4",
      landscape: options.pdfOrientation === "landscape",
    });
    return { resultBuffer: buf };
  }

  // ── Mermaid ───────────────────────────────────────────────────────────────
  const mermaidTheme = (options.mermaidTheme as string) ?? "default";
  if (fromFormat === "mermaid" && toFormat === "svg") {
    return { resultText: await mermaidToSvg(fileText, mermaidTheme) };
  }
  if (fromFormat === "mermaid" && toFormat === "png") {
    return { resultBuffer: await mermaidToPng(fileText, mermaidTheme) };
  }
  if (fromFormat === "mermaid" && toFormat === "pdf") {
    return { resultBuffer: await mermaidToPdf(fileText, mermaidTheme) };
  }
  if (fromFormat === "mermaid" && toFormat === "html") {
    return { resultText: await mermaidToHtml(fileText, mermaidTheme) };
  }

  // ── HTML ──────────────────────────────────────────────────────────────────
  if (fromFormat === "html" && toFormat === "md") {
    return { resultText: htmlToMd(fileText) };
  }
  if (fromFormat === "html" && toFormat === "txt") {
    return { resultText: htmlToTxt(fileText) };
  }
  if (fromFormat === "html" && toFormat === "pdf") {
    const buf = await htmlToPdf(fileText, {
      format: (options.pdfPageSize as "A4") ?? "A4",
      landscape: options.pdfOrientation === "landscape",
    });
    return { resultBuffer: buf };
  }
  if (fromFormat === "html" && toFormat === "docx") {
    const md = htmlToMd(fileText);
    const buf = await mdToDocx(md);
    return { resultBuffer: buf };
  }
  if (fromFormat === "html" && toFormat === "png") {
    return { resultBuffer: await htmlToPng(fileText) };
  }

  // ── DOCX ──────────────────────────────────────────────────────────────────
  if (fromFormat === "docx" && toFormat === "html") {
    return { resultText: await docxToHtml(fileBuffer) };
  }
  if (fromFormat === "docx" && toFormat === "md") {
    return { resultText: await docxToMd(fileBuffer) };
  }
  if (fromFormat === "docx" && toFormat === "txt") {
    return { resultText: await docxToTxt(fileBuffer) };
  }
  if (fromFormat === "docx" && toFormat === "pdf") {
    return { resultBuffer: await docxToPdf(fileBuffer) };
  }

  // ── PDF ───────────────────────────────────────────────────────────────────
  if (fromFormat === "pdf" && toFormat === "txt") {
    return { resultText: await pdfToTxt(fileBuffer) };
  }
  if (fromFormat === "pdf" && toFormat === "md") {
    return { resultText: await pdfToMd(fileBuffer) };
  }
  if (fromFormat === "pdf" && toFormat === "html") {
    return { resultText: await pdfToHtml(fileBuffer) };
  }
  if (fromFormat === "pdf" && toFormat === "docx") {
    return { resultBuffer: await pdfToDocx(fileBuffer) };
  }

  // ── JSON ──────────────────────────────────────────────────────────────────
  if (fromFormat === "json" && toFormat === "yaml") {
    return { resultText: jsonToYaml(fileText) };
  }
  if (fromFormat === "json" && toFormat === "csv") {
    return { resultText: jsonToCsv(fileText) };
  }
  if (fromFormat === "json" && toFormat === "txt") {
    return { resultText: jsonToTxt(fileText) };
  }

  // ── YAML ──────────────────────────────────────────────────────────────────
  if (fromFormat === "yaml" && toFormat === "json") {
    return { resultText: yamlToJson(fileText) };
  }
  if (fromFormat === "yaml" && toFormat === "txt") {
    return { resultText: yamlToTxt(fileText) };
  }

  // ── CSV ───────────────────────────────────────────────────────────────────
  if (fromFormat === "csv" && toFormat === "json") {
    return { resultText: csvToJson(fileText) };
  }
  if (fromFormat === "csv" && toFormat === "yaml") {
    return { resultText: csvToYaml(fileText) };
  }
  if (fromFormat === "csv" && toFormat === "html") {
    return { resultText: csvToHtml(fileText) };
  }

  // ── TXT ───────────────────────────────────────────────────────────────────
  if (fromFormat === "txt" && toFormat === "md") {
    return { resultText: fileText };
  }
  if (fromFormat === "txt" && toFormat === "html") {
    const html = `<pre style="font-family:sans-serif;line-height:1.6;padding:24px">${fileText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
    return { resultText: html };
  }
  if (fromFormat === "txt" && toFormat === "pdf") {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:sans-serif;padding:40px;line-height:1.7;white-space:pre-wrap}</style></head><body>${fileText}</body></html>`;
    const buf = await htmlToPdf(html);
    return { resultBuffer: buf };
  }

  // ── Images ────────────────────────────────────────────────────────────────
  if (fromFormat === "png" && toFormat === "jpeg") {
    return { resultBuffer: await imageToJpeg(fileBuffer, (options.imageQuality as number) ?? 90) };
  }
  if (fromFormat === "png" && toFormat === "svg") {
    return { resultText: await pngToSvg(fileBuffer) };
  }
  if (fromFormat === "jpeg" && toFormat === "png") {
    return { resultBuffer: await imageToPng(fileBuffer) };
  }
  if (fromFormat === "svg" && toFormat === "png") {
    return { resultBuffer: await svgToPng(fileBuffer) };
  }
  if (fromFormat === "svg" && toFormat === "pdf") {
    const pngBuf = await svgToPng(fileBuffer);
    const html = `<html><body style="margin:0"><img src="data:image/png;base64,${pngBuf.toString("base64")}" style="max-width:100%"/></body></html>`;
    return { resultBuffer: await htmlToPdf(html) };
  }

  // ── SQL Dialect ─────────────────────────────────────────────────────────
  const sqlFormats = ["mssql", "mysql", "pgsql"];
  if (sqlFormats.includes(fromFormat) && sqlFormats.includes(toFormat)) {
    const result = convertSql(fileText, fromFormat as "mssql" | "mysql" | "pgsql", toFormat as "mssql" | "mysql" | "pgsql");
    return { resultText: result, ext: ".sql" };
  }

  throw new Error(`Unsupported conversion: ${fromFormat} → ${toFormat}`);
}
