/**
 * Surgical PDF patching — diff the user's edited text against the text extracted
 * from the original PDF, then patch ONLY the changed phrases in place (font
 * matched). Untouched content stays pixel-identical. Delegates to the Python
 * PyMuPDF backend.
 *
 * Request (JSON):  { fileBase64, fileName, editedText }
 * Response (JSON): { success, fileBase64, fileName, mimeType, patchCount }
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { patchPdf } from "@/lib/converters/pdfEdit";

export const runtime = "nodejs";
export const maxDuration = 60;

const Schema = z.object({
  fileBase64: z.string().min(1),
  fileName: z.string().min(1).max(255),
  editedText: z.string().min(1),
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

  const { fileBase64, fileName, editedText } = parsed.data;

  let buffer: Buffer;
  try {
    buffer = Buffer.from(fileBase64, "base64");
  } catch {
    return NextResponse.json({ success: false, error: "Invalid base64 file data" }, { status: 400 });
  }

  try {
    const { buffer: out, patchCount } = await patchPdf(buffer, editedText);
    return NextResponse.json({
      success: true,
      fileBase64: out.toString("base64"),
      fileName: fileName.replace(/\.pdf$/i, "") + "-patched.pdf",
      mimeType: "application/pdf",
      patchCount,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "PDF patch failed" },
      { status: 500 },
    );
  }
}
