/**
 * PDF → tables (Excel / CSV). Two modes:
 *
 *   mode: "extract" — detect tables and return them for preview (JSON).
 *   mode: "export"  — render the detected tables to an XLSX or CSV file (base64).
 *
 * Detection is deterministic (ruled + char-projection borderless) on the Python
 * PyMuPDF backend, with per-column type inference and a confidence score.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { extractTables, tablesToFile } from "@/lib/converters/pdfTables";

export const runtime = "nodejs";
export const maxDuration = 60;

const Schema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("extract"),
    fileBase64: z.string().min(1),
    fileName: z.string().min(1).max(255),
  }),
  z.object({
    mode: z.literal("export"),
    fileBase64: z.string().min(1),
    fileName: z.string().min(1).max(255),
    format: z.enum(["xlsx", "csv"]),
  }),
]);

const MIME = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
} as const;

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
      const tables = await extractTables(buffer);
      return NextResponse.json({ success: true, tables });
    }

    const { format } = parsed.data;
    const { buffer: out, tableCount } = await tablesToFile(buffer, format);
    return NextResponse.json({
      success: true,
      tableCount,
      fileBase64: out.toString("base64"),
      fileName: parsed.data.fileName.replace(/\.pdf$/i, "") + `-tables.${format}`,
      mimeType: MIME[format],
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Table extraction failed" },
      { status: 500 },
    );
  }
}
