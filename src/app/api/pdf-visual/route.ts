/**
 * Visual (WYSIWYG) PDF fill-in editor. Two modes:
 *
 *   mode: "extract" — original PDF → pages, each with a rendered background image
 *                     and its positioned, editable text blocks. The UI paints the
 *                     image and overlays a transparent field on every block, so the
 *                     user sees the real form and types straight into the blanks.
 *   mode: "patch"   — the edited block texts (reading order) → a new PDF where only
 *                     the changed words are redrawn font-matched in place, keeping
 *                     the original background, images, and layout pixel-identical.
 *
 * Extraction renders pages via the Python PyMuPDF backend; the patch reuses the
 * surgical diff patcher (same coordinate space, so edits round-trip cleanly).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { extractVisual, patchPdf, composePdf, type AddedTextBox } from "@/lib/converters/pdfEdit";

export const runtime = "nodejs";
export const maxDuration = 60;

const BoxSchema = z.object({
  page: z.number().int().min(0),
  x: z.number(), y: z.number(), w: z.number(), h: z.number(),
  text: z.string(),
  size: z.number().optional(),
  color: z.tuple([z.number(), z.number(), z.number()]).optional(),
  font: z.string().optional(),
  align: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

const Schema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("extract"),
    fileBase64: z.string().min(1),
    fileName: z.string().min(1).max(255),
    dpi: z.number().int().min(72).max(300).optional(),
  }),
  z.object({
    mode: z.literal("patch"),
    fileBase64: z.string().min(1),
    fileName: z.string().min(1).max(255),
    // The visible text as edited, one line per block in reading order. The
    // surgical patcher diffs this against the original and redraws only the
    // changed words in place.
    editedText: z.string().min(1),
  }),
  z.object({
    mode: z.literal("compose"),
    fileBase64: z.string().min(1),
    fileName: z.string().min(1).max(255),
    // Existing-text edits (diffed → font-matched patches). May be empty if the
    // user only added new boxes.
    editedText: z.string().default(""),
    // Brand-new text boxes placed at empty areas (form blanks, dotted lines).
    boxes: z.array(BoxSchema).default([]),
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

  let buffer: Buffer;
  try {
    buffer = Buffer.from(parsed.data.fileBase64, "base64");
  } catch {
    return NextResponse.json({ success: false, error: "Invalid base64 file data" }, { status: 400 });
  }

  try {
    if (parsed.data.mode === "extract") {
      const pages = await extractVisual(buffer, parsed.data.dpi ?? 144);
      return NextResponse.json({ success: true, pages });
    }

    if (parsed.data.mode === "patch") {
      // patch — font-match only the changed words onto the original PDF.
      const { buffer: out, patchCount } = await patchPdf(buffer, parsed.data.editedText);
      return NextResponse.json({
        success: true,
        patchCount,
        fileBase64: out.toString("base64"),
        fileName: parsed.data.fileName.replace(/\.pdf$/i, "") + "-filled.pdf",
        mimeType: "application/pdf",
      });
    }

    // compose — font-matched edits to existing text + new text boxes, in one pass.
    const { buffer: out, patchCount, boxCount } = await composePdf(
      buffer,
      parsed.data.editedText,
      parsed.data.boxes as AddedTextBox[],
    );
    return NextResponse.json({
      success: true,
      patchCount,
      boxCount,
      fileBase64: out.toString("base64"),
      fileName: parsed.data.fileName.replace(/\.pdf$/i, "") + "-filled.pdf",
      mimeType: "application/pdf",
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Visual PDF edit failed" },
      { status: 500 },
    );
  }
}
