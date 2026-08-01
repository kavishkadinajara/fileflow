import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runChain } from "@/lib/roundtrip/engine";
import { recommendPaths, RT_FORMATS } from "@/lib/roundtrip/analysis";
import type { FileFormat } from "@/types";

export const maxDuration = 120; // chains + embeddings can take a while

const RtFormat = z.enum(["md", "html", "docx", "pdf", "txt"]);

const RunSchema = z.object({
  mode: z.literal("run"),
  fileBase64: z.string().min(1),
  startFormat: RtFormat,
  chain: z.array(RtFormat).min(2).max(6),
});

const RecommendSchema = z.object({
  mode: z.literal("recommend"),
  start: RtFormat,
  end: RtFormat,
  maxHops: z.number().int().min(1).max(5).optional(),
});

const BodySchema = z.discriminatedUnion("mode", [RunSchema, RecommendSchema]);

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
    if (parsed.mode === "recommend") {
      const paths = recommendPaths(parsed.start as FileFormat, parsed.end as FileFormat, parsed.maxHops ?? 4);
      return NextResponse.json({ success: true, paths, formats: RT_FORMATS });
    }

    // mode === "run"
    const origin = req.nextUrl.origin;
    const report = await runChain({
      origin,
      fileBase64: parsed.fileBase64,
      startFormat: parsed.startFormat as FileFormat,
      chain: parsed.chain as FileFormat[],
    });
    return NextResponse.json({ success: true, report });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Round-trip analysis failed" },
      { status: 500 },
    );
  }
}
