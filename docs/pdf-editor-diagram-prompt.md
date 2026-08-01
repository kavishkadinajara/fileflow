# PDF Editor — Architecture Diagram Prompt

Copy the prompt below into Claude (or any AI that generates diagrams / SVG / images)
to produce a clean, beginner-friendly architecture & data-flow diagram of the
FileFlowOne **PDF Editor** feature.

Two versions are provided:
- **Prompt A** — for an AI that renders a visual image / SVG (e.g. Claude artifacts, image gen).
- **Prompt B** — for generating a Mermaid diagram you can paste anywhere (GitHub, docs, the app itself).

---

## Prompt A — Visual diagram (image / SVG)

```
Create a clean, modern architecture and data-flow diagram for a feature called the
"PDF Editor" in a web app. The diagram should be easy for a non-technical person to
understand at a glance. Use a left-to-right flow, soft rounded boxes, clear arrows
with short labels, and group related parts into labelled lanes/zones with light
background tints. Use a calm professional palette (blues, greys, one accent colour
for AI steps). Add small icons where helpful (upload, document, gears, sparkle for AI).

Title at the top: "FileFlowOne — PDF Editor: Upload → Edit → Output"

Show THREE horizontal lanes (zones), labelled on the left:

LANE 1 — "Browser (Frontend)"  [light blue tint]
  - "User uploads a PDF" (upload icon)
  - "PdfEditor opens (Edit PDF tab)"
  - "Editable text area + format toggles + Find/Replace box"
  - "User picks ONE of three actions" (a small fork with 3 buttons:
      "Patch original (surgical)", "Rebuild PDF", "Decorate original")

LANE 2 — "Next.js API (Server)"  [light grey tint]
  - On open: "POST /api/convert (pdf → md)"  → extracts text to show in the editor
  - "POST /api/pdf-patch"     (for Patch)
  - "POST /api/convert md→pdf" (for Rebuild)
  - "POST /api/pdf-overlay"    (for Decorate)
  - Also show an optional AI box (accent colour): "POST /api/pdf-autoformat
      (LLM suggests TOC / header / footer)"

LANE 3 — "Python Backend (PyMuPDF + algorithms)"  [light green tint]
  Show the algorithm engines as connected gear boxes, with the data flowing through them:
  - "Structure Engine (pdf_structure.py)":
       sub-steps in a small vertical stack →
       "Harvest spans (font, size, colour, position)" →
       "Font-size clustering → heading levels" →
       "Recursive XY-cut → columns / reading order" →
       "Line + block rebuild → Markdown"
  - "Font-matching Overlay (pdf_overlay.py)":
       "Read matched span style" → "Map to base-14 font" → "Redact + redraw in same font/colour"
  - "Diff Engine (pdf_diff.py)":
       "Diff edited vs original text" → "Find minimal changed words" →
       "Locate each (page + occurrence)" → "Send to Overlay engine"

Now draw the THREE end-to-end paths clearly (use 3 distinct arrow colours and a small legend):

PATH 1 — SURGICAL PATCH (the highlight feature):
  User edits text → "Patch original" → /api/pdf-patch → Diff Engine →
  (re-extract via Structure Engine to compare) → Font-matching Overlay →
  "Only changed words replaced; rest of PDF stays pixel-identical" →
  new PDF appears in the job list → download.

PATH 2 — REBUILD:
  User edits text (+ toggles header/footer/TOC) → "Rebuild PDF" → /api/convert (md→pdf) →
  "Build styled HTML → print to PDF (Puppeteer)" → brand-new polished PDF → download.

PATH 3 — DECORATE ORIGINAL:
  "Decorate original" → /api/pdf-overlay (decorate mode) →
  "Stamp header / footer / page numbers onto original, layout untouched" → download.

Add a callout note near Path 1: "Original file is NEVER modified — every action
produces a NEW file." and near the AI box: "Optional — needs an API key
(Groq / Gemini / OpenAI / DeepSeek)."

Keep text short inside boxes. Make it look like a polished product/architecture
explainer, not a cluttered engineering schematic.
```

---

## Prompt B — Mermaid diagram (paste-anywhere code)

```
Generate a Mermaid flowchart (flowchart LR) for the "PDF Editor" feature described
below. Use subgraphs for the three layers, short node labels, and three clearly
different paths. Make it valid Mermaid that renders without errors.

Layers (subgraphs):
1) "Browser (Frontend)": upload PDF, PdfEditor tab opens, editable text + toggles +
   find/replace, three action buttons (Patch / Rebuild / Decorate).
2) "Next.js API": /api/convert (pdf→md on open), /api/pdf-patch, /api/convert (md→pdf),
   /api/pdf-overlay, and an optional /api/pdf-autoformat (AI).
3) "Python Backend": Structure Engine (harvest spans → font-size clustering →
   XY-cut columns → line/block rebuild → Markdown), Font-matching Overlay
   (read span style → map base-14 font → redact + redraw), Diff Engine
   (diff edited vs original → minimal changed words → locate page+occurrence → overlay).

Three end-to-end paths:
- Patch (surgical): edit text → /api/pdf-patch → Diff Engine → Overlay →
  "only changed words replaced, rest pixel-identical" → new PDF.
- Rebuild: edit text + toggles → /api/convert md→pdf → styled HTML → Puppeteer PDF.
- Decorate: /api/pdf-overlay → stamp header/footer/page-numbers on original.

Add a note that the original file is never modified (every action makes a new file).
```

---

## Tips

- For a **slide / report**, use Prompt A and ask for SVG or PNG.
- For **the repo / GitHub README**, use Prompt B and paste the resulting Mermaid into a
  ```` ```mermaid ```` block — it renders automatically.
- You can even drop the Mermaid output into FileFlowOne itself (Mermaid → PNG/SVG/PDF)
  to export the diagram as an image.
