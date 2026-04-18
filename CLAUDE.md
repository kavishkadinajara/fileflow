# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
npx tsc --noEmit # Type-check without emitting
```

No test suite is configured. There is one required environment variable: `GROQ_API_KEY` (Groq console, free) — optional if AI features are not used.

## Architecture

**FileFlowOne** is a Next.js 14 (App Router) universal file converter that runs all conversions server-side with no cloud uploads. It supports 27+ formats across documents, images, data, diagrams, SQL dialects, and media.

### Request lifecycle

```
FileUploader / TextEditor
  → Format auto-detection (detectTextFormat in lib/formats.ts)
  → ConversionConfig (user selects output format + options)
  → Zustand store: addJob() / addMediaJob()
  → POST /api/convert  (or client-side FFmpeg.wasm for media)
  → Converter module dispatched by route.ts
  → Base64 result returned → job status updated → download
```

### Key layers

| Layer | Location | Purpose |
|---|---|---|
| Main orchestrator | `src/components/ConverterWorkspace.tsx` | Upload → config → convert → download |
| Job state | `src/store/conversionStore.ts` | Zustand store: job queue, active file, editing context, batch ZIP |
| API dispatcher | `src/app/api/convert/route.ts` | Zod-validated POST, routes to converter modules, base64 I/O |
| Format registry | `src/lib/formats.ts` | `FORMAT_META`, `isConversionSupported()`, `detectTextFormat()` |
| Type definitions | `src/types/index.ts` | `FileFormat`, `ConversionJob`, `ConvertRequest/Response`, `ConvertOptions` |

### Converter modules (`src/lib/converters/`)

- **`text.ts`** — Markdown ↔ HTML / DOCX / TXT. `mdToDocx()` produces a three-section professional DOCX (cover page, auto-linked TOC H1–H3, content with headers/footers/page numbers, embedded Mermaid PNGs).
- **`mermaid.ts`** — Mermaid diagram → SVG / 3× hi-res PNG / PDF / standalone HTML.
- **`data.ts`** — JSON ↔ YAML / CSV / TXT; CSV ↔ JSON / YAML / HTML (PapaParse + js-yaml).
- **`docx.ts`** — DOCX → HTML / MD / TXT / PDF (mammoth).
- **`pdf.ts`** — HTML / Markdown → PDF or PNG via Puppeteer.
- **`image.ts`** — PNG ↔ JPEG, PNG → SVG, SVG → PNG / PDF (Sharp).
- **`sql.ts`** — MSSQL ↔ MySQL ↔ PostgreSQL dialect conversion (data type mapping, function translation).
- **`media.ts`** — Audio/video conversions client-side via FFmpeg.wasm (MP3, WAV, OGG, FLAC, AAC, M4A, MP4, WebM, AVI, MOV, MKV, GIF). Does not go through `/api/convert`.
- **`browser.ts`** — Puppeteer launcher with fallback: bundled Chromium → system Chrome → system Edge.

### AI features

Three separate API routes power AI assistance:

- `POST /api/chat` — Streams Groq LLaMA 3.3 responses for conversion help and file modification suggestions.
- `POST /api/ai-modify` — Applies a modification instruction to file content (all text-based formats).
- `POST /api/ai-tools` — AI content detection + text humanization (LLaMA Maverick for detection, LLaMA 3.3 for rewriting).

### Important configuration

- **`next.config.mjs`** — Sets COOP/COEP headers required for FFmpeg.wasm SharedArrayBuffer support; also configures `serverExternalPackages` for Puppeteer.
- **`tsconfig.json`** — Strict mode; path alias `@/*` → `./src/*`.
- **`src/lib/marked-config.ts`** — Shared `marked` instance with syntax highlighting (highlight.js) and emoji support.

### Special behaviours

- **Edit & Reconvert** — Text-based format jobs store `sourceContent` in the Zustand store so users can edit and reconvert without re-uploading.
- **Batch processing** — Jobs run in parallel with per-file progress; batch download produces a ZIP.
- **FFmpeg first use** — ~32 MB wasm download on first media conversion; progress callback updates job state in the store.
