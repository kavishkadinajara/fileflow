/**
 * PDF overlay editing — operates on the ORIGINAL PDF, preserving its layout,
 * fonts, and images (via the Python PyMuPDF backend). Two modes:
 *
 *   mode: "overlay"  — find/replace text spans in place.
 *   mode: "decorate" — stamp header / footer / page numbers onto every page.
 *
 * Request (JSON):
 *   { fileBase64, fileName, mode, replacements?, headerText?, footerText?, addPageNumbers? }
 * Response (JSON):
 *   { success, fileBase64, fileName, mimeType }
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { overlayEditPdf, decoratePdf } from "@/lib/converters/pdfEdit";

export const runtime = "nodejs";
export const maxDuration = 60;

const Schema = z.object({
  fileBase64: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mode: z.enum(["overlay", "decorate"]),
  replacements: z.array(z.object({ find: z.string(), replace: z.string() })).optional(),
  headerText: z.string().optional(),
  footerText: z.string().optional(),
  addPageNumbers: z.boolean().optional(),
});

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

  const { fileBase64, fileName, mode, replacements, headerText, footerText, addPageNumbers } = parsed.data;

  let buffer: Buffer;
  try {
    buffer = Buffer.from(fileBase64, "base64");
  } catch {
    return NextResponse.json({ success: false, error: "Invalid base64 file data" }, { status: 400 });
  }

  try {
    let out: Buffer;
    if (mode === "overlay") {
      if (!replacements || replacements.length === 0) {
        return NextResponse.json(
          { success: false, error: "overlay mode requires at least one replacement" },
          { status: 400 },
        );
      }
      out = await overlayEditPdf(buffer, replacements);
    } else {
      out = await decoratePdf(buffer, { headerText, footerText, addPageNumbers });
    }

    return NextResponse.json({
      success: true,
      fileBase64: out.toString("base64"),
      fileName: fileName.replace(/\.pdf$/i, "") + "-edited.pdf",
      mimeType: "application/pdf",
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "PDF overlay failed" },
      { status: 500 },
    );
  }
}
