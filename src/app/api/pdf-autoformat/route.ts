/**
 * PDF Auto-format — given extracted markdown, ask the LLM to infer sensible
 * document formatting: whether to add a table of contents, page numbers, a
 * cover page, and what header/footer text fits. Also lightly cleans the
 * markdown (fixes broken headings, stray line breaks from PDF extraction).
 *
 * Returns a structured JSON object the PDF Editor uses to pre-fill its toggles.
 * Provider-agnostic: uses generateText + JSON parse so it works on Groq, Gemini,
 * OpenAI, or DeepSeek alike (not all support native structured output).
 */
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { getModel, modelIdFor } from "@/lib/ai/provider";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `You are a document formatting assistant for a PDF editor. You receive Markdown text that was extracted from a PDF. Decide how it should be formatted when rebuilt into a clean PDF, and tidy the Markdown.

Return ONLY a valid JSON object — no markdown, no code fences, no commentary:

{
  "addToc": <boolean — true if the document has 3+ headings worth a table of contents>,
  "addPageNumbers": <boolean — true for multi-page/long documents>,
  "coverPage": <boolean — true if there's a clear single title that suits a cover page>,
  "headerText": <string — a short running header (e.g. the document title), or "" for none>,
  "footerText": <string — a short footer (e.g. author, org, or ""), or "" for none>,
  "cleanedMarkdown": <string — the input Markdown with fixed headings (use #, ##, ### appropriately), merged broken lines, and removed extraction artifacts. Preserve ALL content and meaning. Do not summarize or drop anything.>
}

Rules:
- Detect headings from context (short lines, title-case, section-like) and mark them with proper # levels.
- Merge lines that were split mid-sentence by PDF extraction.
- Keep all factual content. Never invent content.
- headerText/footerText must be short (< 60 chars) or "".`;

export async function POST(req: NextRequest) {
  try {
    const { markdown } = await req.json();
    if (!markdown || typeof markdown !== "string") {
      return NextResponse.json({ success: false, error: "markdown is required" }, { status: 400 });
    }

    // Keep within token limits — cleanedMarkdown is echoed back, so cap input.
    const maxChars = 18000;
    const truncated = markdown.length > maxChars;
    const input = markdown.slice(0, maxChars);

    const { text } = await generateText({
      model: getModel("pdf-format"),
      system: SYSTEM,
      prompt: `Format and clean this extracted Markdown:\n\n${input}`,
      maxOutputTokens: 8000,
      temperature: 0.2,
    });

    let parsed: Record<string, unknown>;
    try {
      const stripped = text.replace(/<think>[\s\S]*?<\/think>/g, "");
      const jsonMatch = stripped.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : stripped);
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to parse AI formatting response" },
        { status: 502 },
      );
    }

    // If the model didn't return cleaned markdown (or it was truncated), keep
    // the original so the editor never loses the user's content.
    const cleaned = typeof parsed.cleanedMarkdown === "string" && parsed.cleanedMarkdown.trim()
      ? parsed.cleanedMarkdown
      : markdown;

    return NextResponse.json({
      success: true,
      addToc: !!parsed.addToc,
      addPageNumbers: !!parsed.addPageNumbers,
      coverPage: !!parsed.coverPage,
      headerText: typeof parsed.headerText === "string" ? parsed.headerText : "",
      footerText: typeof parsed.footerText === "string" ? parsed.footerText : "",
      cleanedMarkdown: truncated ? markdown : cleaned,
      truncated,
      model: modelIdFor("pdf-format"),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "AI auto-format failed" },
      { status: 500 },
    );
  }
}
