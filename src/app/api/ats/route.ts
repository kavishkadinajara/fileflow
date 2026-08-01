/**
 * ATS Resume Optimizer. Two modes:
 *
 *   mode: "analyze"  — resume file + job description → deterministic match report
 *                      (overall + sub-scores, matched/missing skills & keywords,
 *                      parse-ability issues). Runs on the Python backend.
 *   mode: "optimize" — existing resume bullet points + the gaps from the analysis →
 *                      bullets rewritten to weave in the missing keywords. Grounded:
 *                      the model is told to rephrase only real experience, never to
 *                      invent jobs, skills, or achievements.
 */
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getModel, modelIdFor } from "@/lib/ai/provider";
import { analyzeResume } from "@/lib/ats";

export const runtime = "nodejs";
export const maxDuration = 60;

const Schema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("analyze"),
    fileBase64: z.string().min(1),
    fileName: z.string().min(1).max(255),
    jd: z.string().min(1),
  }),
  z.object({
    mode: z.literal("optimize"),
    bullets: z.string().min(1),
    missingKeywords: z.array(z.string()).default([]),
    missingSkills: z.array(z.string()).default([]),
  }),
]);

const OPTIMIZE_SYSTEM = `You are a resume optimization assistant that helps a candidate pass Applicant Tracking Systems (ATS).

You will be given the candidate's EXISTING resume bullet points and a list of keywords/skills from the job description that are currently missing.

STRICT RULES — follow exactly:
1. Rewrite ONLY the bullet points provided. Do not add new bullets unless a missing keyword genuinely fits an existing one.
2. NEVER invent experience, employers, projects, tools, or achievements the candidate did not state. Truthfulness is mandatory — an embellished resume gets the candidate rejected.
3. Weave in a missing keyword ONLY where it is plausibly implied by the existing bullet. If a keyword cannot be added truthfully, leave it out.
4. Use strong action verbs and quantify impact where the original already implies it. Keep each bullet concise (one line).
5. Return ONLY the rewritten bullet points, one per line, each starting with "- ". No preamble, no explanation, no commentary about what you changed.`;

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
    if (parsed.data.mode === "analyze") {
      let buffer: Buffer;
      try {
        buffer = Buffer.from(parsed.data.fileBase64, "base64");
      } catch {
        return NextResponse.json({ success: false, error: "Invalid base64 file data" }, { status: 400 });
      }
      const report = await analyzeResume(buffer, parsed.data.fileName, parsed.data.jd);
      return NextResponse.json({ success: true, report });
    }

    // optimize — grounded bullet rewrite.
    const wanted = [...parsed.data.missingKeywords, ...parsed.data.missingSkills].slice(0, 20);
    const { text } = await generateText({
      model: getModel("modify"),
      system: OPTIMIZE_SYSTEM,
      messages: [
        {
          role: "user",
          content:
            `Missing keywords/skills to weave in where truthful:\n${wanted.join(", ") || "(none)"}\n\n` +
            `Existing bullet points:\n${parsed.data.bullets.slice(0, 6000)}\n\nRewrite them now.`,
        },
      ],
      maxOutputTokens: 1200,
      temperature: 0.4,
    });
    return NextResponse.json({ success: true, optimized: text.trim(), model: modelIdFor("modify") });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "ATS request failed" },
      { status: 500 },
    );
  }
}
