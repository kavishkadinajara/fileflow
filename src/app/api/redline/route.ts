import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { compareDocuments } from "@/lib/redline";

export const maxDuration = 60;

const BodySchema = z.object({
  originalBase64: z.string().min(1),
  originalName: z.string().min(1).max(255),
  revisedBase64: z.string().min(1),
  revisedName: z.string().min(1).max(255),
  semantic: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = BodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof z.ZodError ? err.errors[0]?.message : "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const result = await compareDocuments(
      Buffer.from(parsed.originalBase64, "base64"),
      parsed.originalName,
      Buffer.from(parsed.revisedBase64, "base64"),
      parsed.revisedName,
      parsed.semantic ?? true,
    );
    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Comparison failed" },
      { status: 500 },
    );
  }
}
