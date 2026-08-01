/**
 * Smart Reflow — layout-preserving editable PDF rebuild. Two modes:
 *
 *   mode: "extract" — original PDF → positioned, editable layout pages.
 *   mode: "render"  — edited layout pages → a new PDF that keeps every block at
 *                     its original position, font, size, and colour.
 *
 * Extraction reads glyph geometry via the Python PyMuPDF backend; rendering emits
 * absolute-positioned HTML there and prints it with Puppeteer here.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { extractLayout, reflowToPdf, type ReflowPage } from "@/lib/converters/pdfEdit";

export const runtime = "nodejs";
export const maxDuration = 60;

const BlockSchema = z.object({
  id: z.string(),
  text: z.string(),
  x: z.number(), y: z.number(), w: z.number(), h: z.number(),
  size: z.number(),
  font: z.string(),
  color: z.string(),
  bold: z.boolean(),
  italic: z.boolean(),
});
const PageSchema = z.object({
  width: z.number(),
  height: z.number(),
  blocks: z.array(BlockSchema),
});

const Schema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("extract"),
    fileBase64: z.string().min(1),
    fileName: z.string().min(1).max(255),
  }),
  z.object({
    mode: z.literal("render"),
    fileName: z.string().min(1).max(255),
    pages: z.array(PageSchema).min(1),
  }),
]);

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
  }

  try {
    if (parsed.data.mode === "extract") {
      let buffer: Buffer;
      try {
        buffer = Buffer.from(parsed.data.fileBase64, "base64");
      } catch {
        return NextResponse.json({ success: false, error: "Invalid base64 file data" }, { status: 400 });
      }
      const pages = await extractLayout(buffer);
      return NextResponse.json({ success: true, pages });
    }

    // render
    const out = await reflowToPdf(parsed.data.pages as ReflowPage[]);
    return NextResponse.json({
      success: true,
      fileBase64: out.toString("base64"),
      fileName: parsed.data.fileName.replace(/\.pdf$/i, "") + "-reflow.pdf",
      mimeType: "application/pdf",
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Smart Reflow failed" },
      { status: 500 },
    );
  }
}
