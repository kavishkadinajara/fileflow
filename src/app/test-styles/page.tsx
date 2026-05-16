"use client";

/**
 * Phase 2 demo page — verify all 12 templates render correctly.
 *
 * Pick a template + output format, click Convert, and download/preview the result.
 * This route is dev-only and may be removed once the production UI ships.
 */
import { useMemo, useState } from "react";
import { BUILTIN_TEMPLATES } from "@/lib/styles/templates";

const SAMPLE_MD = `# The Universal File Convertor

A demonstration document showcasing the Style System.

## Introduction

This document is rendered through **FileFlowOne's** new style engine. The same Markdown source can be converted into *any* output format with *any* style template — Academic, Business, Magazine, Thesis, and 8 others.

> "Style without substance is decoration. Substance without style is invisible."
> — *Project mantra*

### Why this matters

The traditional approach forces users into a single output style. Our approach gives them three modes:

1. **Preserve** — auto-detect from the source
2. **Template** — pick from a curated gallery
3. **Custom** — design from scratch in the Style Studio

## Features

- Twelve built-in templates across six categories
- Deep customization: colors, fonts, spacing, layout, decorations
- Same StyleConfig drives HTML, PDF, and DOCX output
- Backward compatible with the existing converter API

### Code example

\`\`\`typescript
import { mdToStyledHtml } from "@/lib/converters/styledHtml";
import { getTemplate } from "@/lib/styles/templates";

const tpl = getTemplate("academic");
const html = await mdToStyledHtml(markdown, tpl.config);
\`\`\`

### Comparison table

| Template       | Best for           | Page style    |
|----------------|--------------------|---------------|
| Academic       | Research papers    | Times, formal |
| Business       | Corporate reports  | Bold blue     |
| Magazine       | Editorial features | Serif, drop cap |
| Minimalist     | Focus reading      | Monochrome    |

## Conclusion

The Style System turns FileFlowOne from a file converter into a **document publishing platform**. Every conversion becomes a design decision the user controls.
`;

type OutputFormat = "html" | "pdf" | "docx";

export default function TestStylesPage() {
  const [styleId, setStyleId] = useState<string>(BUILTIN_TEMPLATES[0].id);
  const [output, setOutput] = useState<OutputFormat>("html");
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultName, setResultName] = useState<string>("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => BUILTIN_TEMPLATES.find((t) => t.id === styleId),
    [styleId]
  );

  async function convert() {
    setLoading(true);
    setError(null);
    setResultUrl(null);
    setPreviewHtml(null);
    try {
      const base64 = btoa(unescape(encodeURIComponent(SAMPLE_MD)));
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64: base64,
          fileName: "sample.md",
          fromFormat: "md",
          toFormat: output,
          styleId,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Conversion failed");

      const binary = atob(data.fileBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: data.mimeType });
      const url = URL.createObjectURL(blob);

      setResultUrl(url);
      setResultName(data.fileName);

      // Inline preview for HTML
      if (output === "html") {
        const text = new TextDecoder("utf-8").decode(bytes);
        setPreviewHtml(text);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: 24, fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Style System Demo</h1>
      <p style={{ color: "#64748B", marginTop: 0, marginBottom: 24 }}>
        Pick a template, pick an output format, click Convert. Verifies Phase 1 + 2 of the Style System.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24 }}>
        {/* Controls */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Template</label>
          <select
            value={styleId}
            onChange={(e) => setStyleId(e.target.value)}
            style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", marginBottom: 16 }}
          >
            {BUILTIN_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>{t.name} — {t.category}</option>
            ))}
          </select>

          {selectedTemplate && (
            <div style={{ background: "#F8FAFC", padding: 12, borderRadius: 6, fontSize: 12, color: "#475569", marginBottom: 16 }}>
              {selectedTemplate.description}
              <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                {selectedTemplate.tags.map((tag) => (
                  <span key={tag} style={{ background: "#E2E8F0", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>{tag}</span>
                ))}
              </div>
            </div>
          )}

          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Output format</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {(["html", "pdf", "docx"] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setOutput(fmt)}
                style={{
                  flex: 1, padding: 8, borderRadius: 6, border: "1px solid #CBD5E1",
                  background: output === fmt ? "#0EA5E9" : "white",
                  color: output === fmt ? "white" : "#0F172A",
                  cursor: "pointer", textTransform: "uppercase", fontSize: 12, fontWeight: 600,
                }}
              >{fmt}</button>
            ))}
          </div>

          <button
            onClick={convert}
            disabled={loading}
            style={{
              width: "100%", padding: 12, borderRadius: 6, border: "none",
              background: loading ? "#94A3B8" : "#0EA5E9", color: "white",
              fontWeight: 700, fontSize: 14, cursor: loading ? "wait" : "pointer",
            }}
          >{loading ? "Converting..." : "Convert"}</button>

          {error && (
            <div style={{ marginTop: 16, padding: 12, background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 6, color: "#991B1B", fontSize: 13 }}>
              {error}
            </div>
          )}

          {resultUrl && (
            <a
              href={resultUrl}
              download={resultName}
              style={{
                display: "block", marginTop: 12, padding: 10, borderRadius: 6,
                background: "#10B981", color: "white", textAlign: "center",
                textDecoration: "none", fontWeight: 600, fontSize: 13,
              }}
            >Download {resultName}</a>
          )}
        </div>

        {/* Preview */}
        <div style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: 0, minHeight: 600, background: "#F8FAFC", overflow: "hidden" }}>
          {previewHtml ? (
            <iframe srcDoc={previewHtml} style={{ width: "100%", height: 800, border: "none", background: "white" }} title="preview" />
          ) : (
            <div style={{ padding: 40, color: "#94A3B8", textAlign: "center" }}>
              {output === "html" ? "Click Convert to see live HTML preview." : `Click Convert to generate the ${output.toUpperCase()} file.`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
