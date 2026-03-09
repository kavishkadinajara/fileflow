import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export const runtime = "nodejs";
export const maxDuration = 60;

const MODIFY_SYSTEM_PROMPT = `You are FileFlowOne's file modification engine. The user will give you:
1. The FULL content of a file (Markdown, HTML, JSON, YAML, CSV, SQL, SVG, Mermaid, or plain text)
2. A modification instruction

Your job is to apply the requested modification ACCURATELY and return ONLY the modified file content.

RULES:
- Return ONLY the raw file content. No explanations, no markdown code fences, no commentary.
- Preserve the original file structure and formatting as much as possible.
- Apply the change precisely. If the user says "make theme light green", inject appropriate CSS/styling for light green into the content.
- For Markdown → PDF conversions with styling requests: inject inline HTML/CSS or YAML frontmatter to achieve the desired look.
- For JSON/YAML: make structural changes as requested while keeping valid syntax.
- For SQL: adjust queries/schemas as requested while keeping valid SQL.
- For Mermaid: modify diagram syntax as requested.
- If you cannot understand the modification, return the original content unchanged.
- NEVER wrap output in \`\`\` code blocks or add any prefix/suffix text.
- The output must be valid content that can be directly saved as the original file format.

EXAMPLES OF MODIFICATIONS:
- "make theme color light green" → Add CSS styling with light green colors to the document
- "add a table of contents" → Insert a TOC section
- "change all headings to uppercase" → Transform heading text
- "add professional formatting" → Inject professional CSS/styling
- "translate to Sinhala" → Translate content
- "add page numbers" → Add page numbering CSS
- "make it dark theme" → Apply dark background/light text styling
- "add a cover page with title" → Prepend a styled cover page section`;

export async function POST(req: NextRequest) {
  try {
    const { fileContent, fileName, fileFormat, instruction } = await req.json();

    if (!fileContent || !instruction) {
      return NextResponse.json(
        { success: false, error: "Missing fileContent or instruction" },
        { status: 400 }
      );
    }

    // Truncate extremely large files to avoid token limits
    const maxChars = 30000;
    const truncated = fileContent.length > maxChars;
    const content = truncated
      ? fileContent.slice(0, maxChars) + "\n\n[... content truncated for processing ...]"
      : fileContent;

    const userPrompt = `FILE NAME: ${fileName || "unknown"}
FILE FORMAT: ${fileFormat || "text"}
MODIFICATION REQUEST: ${instruction}

--- FILE CONTENT START ---
${content}
--- FILE CONTENT END ---

Apply the modification and return ONLY the modified file content:`;

    const result = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      system: MODIFY_SYSTEM_PROMPT,
      prompt: userPrompt,
      maxOutputTokens: 8000,
      temperature: 0.1,
    });

    let modifiedContent = result.text;

    // Strip any accidental code fence wrapping
    modifiedContent = modifiedContent
      .replace(/^```[\w]*\n?/, "")
      .replace(/\n?```$/, "")
      .trim();

    return NextResponse.json({
      success: true,
      modifiedContent,
      truncated,
    });
  } catch (err) {
    console.error("[ai-modify] error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "AI modification failed",
      },
      { status: 500 }
    );
  }
}
