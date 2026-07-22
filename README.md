<div align="center">

# ⚡ FileFlowOne

### Universal File Converter — Drag, Drop, Convert

[![Live Demo](https://img.shields.io/badge/Live-fileflow--one.kavishkadinajara.com-22c55e?logo=vercel&logoColor=white)](https://fileflow-one.kavishkadinajara.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A powerful file conversion tool built with Next.js — convert documents, diagrams, data files, images, and SQL dialects with a clean drag-and-drop interface. Apply professional **style templates**, build your own in the **Style Studio**, or let it auto-detect and preserve your source document's look.

**🌐 Live:** [fileflow-one.kavishkadinajara.com](https://fileflow-one.kavishkadinajara.com)

</div>

---

## 🔬 Research: privacy-first document intelligence

FileFlowOne is also a final-year research project: a **deterministic core +
AI layer** where privacy is proven, not promised.

- **Privacy-aware router** (`/privacy-router`) — a fully client-side,
  deterministic classifier decides per document whether AI runs **LOCAL**
  (on-device), **HYBRID** (PII pseudonymized before upload), or **CLOUD**.
  High sensitivity is an absolute LOCAL veto. Measured on a 72-sample labeled
  set: category precision 1.000, 38/38 high-sensitivity documents kept local.
- **On-device AI execution** — WebLLM (Qwen2.5 / Phi-3.5, INT4, WebGPU) runs
  summarize/proofread/custom edits and the **AI chat assistant** entirely in
  the browser. Works with Wi-Fi off.
- **Privacy receipts** — every AI run issues a verifiable JSON receipt:
  document SHA-256, the run's network window, a `documentLeftDevice` flag,
  and a tamper-evident attestation hash.
- **Privacy audit dashboard** (`/privacy-audit`) — a runtime network monitor
  wraps `fetch`/XHR/`sendBeacon` and classifies every outbound request live.
- **Semantic Fidelity Index (SFI)** — every conversion is scored on
  structural / semantic / functional preservation.
- **Round-trip fidelity tracker** (`/roundtrip`) — measures cumulative
  meaning-loss across multi-hop conversion chains, exposing silent
  compounding loss that per-conversion scores can't see.
- **Semantic document compare** (`/compare`) — embedding-aligned redline that
  distinguishes modified, moved, added, and removed blocks.
- **Self-calibrating routing** — LOCAL runs record (complexity, measured
  quality) on-device; the router's quality prior is re-fit locally, with no
  telemetry.

**Evaluation (ConvertBench-lite):** 65 generated documents × 7 chains = 455
automated runs through the production pipeline — md→html→md **100%**,
md→docx→md **99.5%**, md→pdf→md 77.7%, md→txt→md 55.4%; table extraction
**86.7%** cell accuracy vs pdfplumber's 85.3% on ground-truth fixtures. Full
results, figures, and methodology: [`bench/report/RESULTS.md`](bench/report/RESULTS.md).
Reproduce with three commands — see [`bench/README.md`](bench/README.md).

**Tests:** `npm test` — 62 unit tests over the deterministic core.

---

## ✨ Features

- **30+ format conversions** across documents, images, data, and SQL
- **Style system** — apply a consistent look across HTML, PDF, and DOCX output from a single `StyleConfig`
- **Style Studio** — visual editor (`/studio`) to build custom document styles: colors, headings, typography, page layout, structure, and content blocks with live preview
- **13 professional templates** — Academic, Thesis, Technical, Business Report, Blog, Magazine, Ebook, Pitch Deck, Resume, Classic Letter, Minimalist, Modern Colorful, and Preserve Original
- **Automatic style detection** — infers and preserves the source document's style when converting Markdown and Word files
- **Cloud templates & accounts** — sign in (Supabase) to save custom styles to the cloud, access them from any device, and share to the community gallery
- **Professional report generation** — Markdown → DOCX/PDF with cover page, auto-generated Table of Contents, page headers/footers, and page numbering
- **Mermaid diagram support** — renders flowcharts, sequence diagrams, ER diagrams, and more as high-resolution PNG images embedded in DOCX and PDF output
- **SQL dialect conversion** — bidirectional conversion between MS SQL Server, MySQL/MariaDB, and PostgreSQL with data type mapping, function translation, and syntax adaptation
- **Auto-detect text format** — paste or drop a `.txt` / `.sql` file and the app reads the content to identify whether it's JSON, YAML, CSV, Markdown, SQL (with dialect detection), Mermaid, or HTML
- **Batch processing** — convert multiple files in parallel with a live progress indicator per job

---

## 🔄 Supported Conversions

### Documents

| From | To |
|------|----|
| Markdown (`.md`) | HTML · PDF † · DOCX † · TXT |
| HTML | Markdown · PDF · DOCX · TXT · PNG |
| DOCX | HTML · Markdown · TXT · PDF |
| Plain Text | Markdown · HTML · PDF |

† _Professional output — includes cover page, Table of Contents, headers, footers, and page numbers._

### Diagrams

| From | To |
|------|----|
| Mermaid (`.mmd`) | SVG · PNG (3× hi-res) · PDF · HTML |

### Data

| From | To |
|------|----|
| JSON | YAML · CSV · TXT |
| YAML | JSON · TXT |
| CSV | JSON · YAML · HTML |

### SQL Dialects

| From | To |
|------|----|
| MS SQL Server | MySQL/MariaDB · PostgreSQL |
| MySQL/MariaDB | MS SQL Server · PostgreSQL |
| PostgreSQL | MS SQL Server · MySQL/MariaDB |

Conversions cover: data type mapping, identity/serial/auto-increment, quoting styles (brackets / backticks / double-quotes), function equivalents (`ISNULL` / `IFNULL` / `COALESCE`, `GETDATE` / `NOW`), `TOP` ↔ `LIMIT`, `RETURNING` / `OUTPUT`, and more.

### Images

| From | To |
|------|----|
| PNG | JPEG · SVG |
| JPEG | PNG |
| SVG | PNG · PDF |

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Google Chrome / MS Edge _(optional)_ | Any — used as Puppeteer fallback |

### 1. Clone & install

```bash
git clone https://github.com/kavishkadinajara/fileflow.git
cd fileflow
npm install
```

> **Note:** `puppeteer` attempts to download a bundled Chromium (~170 MB) on first install.  
> If the download fails, FileFlowOne automatically falls back to your system Chrome or Edge installation.

### 2. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for production

```bash
npm run build
npm start
```

### 4. Lint

```bash
npm run lint
```

---

## 🖥️ Usage

1. **Upload** — drag and drop one or more files onto the upload zone, or click to browse. The format is auto-detected from the file extension and content.
2. **Configure** — select the target format for each file. Optional settings (PDF page size, image quality, Mermaid theme) appear when relevant.
3. **Convert** — click **Convert All** to process every queued file in parallel, or convert individually.
4. **Download** — once a job completes, click **Download** to save the converted file to your machine.

---

## 🏗️ Project Structure

```
e:\Projects\mdconvertor\
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── convert/
│   │   │       └── route.ts          # POST /api/convert — conversion dispatcher
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── providers.tsx             # Theme + toast providers
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives (button, card, badge…)
│   │   ├── Header.tsx                # Top navigation bar
│   │   ├── FileUploader.tsx          # Drag-and-drop zone with content-based detection
│   │   ├── ConversionConfig.tsx      # Per-file target format & options picker
│   │   ├── ConverterWorkspace.tsx    # Orchestrates upload → config → run
│   │   ├── JobList.tsx               # Live job queue with progress bars
│   │   └── FormatMatrix.tsx          # Supported formats showcase page
│   ├── lib/
│   │   ├── converters/
│   │   │   ├── browser.ts            # Shared Puppeteer launcher (system Chrome fallback)
│   │   │   ├── text.ts               # Markdown ↔ HTML/DOCX/TXT (professional output)
│   │   │   ├── mermaid.ts            # Mermaid → SVG/PNG/PDF (3× hi-res)
│   │   │   ├── pdf.ts                # HTML → PDF/PNG via Puppeteer
│   │   │   ├── docx.ts               # DOCX ↔ HTML/MD/TXT via mammoth
│   │   │   ├── data.ts               # JSON / YAML / CSV conversions
│   │   │   ├── image.ts              # Image format conversions via Sharp
│   │   │   └── sql.ts                # SQL dialect converter (MSSQL ↔ MySQL ↔ PgSQL)
│   │   ├── formats.ts                # Format metadata, conversion matrix, auto-detect
│   │   └── utils.ts                  # Utility helpers (cn, base64, download)
│   ├── store/
│   │   └── conversionStore.ts        # Zustand job queue store
│   └── types/
│       └── index.ts                  # Shared TypeScript types & FileFormat union
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | [Next.js 14](https://nextjs.org) (App Router) | Full-stack React framework |
| Language | [TypeScript 5](https://www.typescriptlang.org) | Type safety |
| Styling | [Tailwind CSS 3](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) | UI components |
| State management | [Zustand 4](https://zustand-demo.pmnd.rs) | Client-side job queue |
| Markdown parsing | [marked 12](https://marked.js.org) + [highlight.js](https://highlightjs.org) | MD → HTML with syntax highlighting |
| Headless browser | [Puppeteer 22](https://pptr.dev) | PDF generation, PNG screenshots, Mermaid rendering |
| DOCX generation | [docx 8](https://docx.js.org) | Professional Word documents |
| DOCX reading | [mammoth](https://github.com/mwilliamson/mammoth.js) | DOCX → HTML/MD/TXT |
| Image processing | [Sharp](https://sharp.pixelplumbing.com) | Format conversion, resizing |
| YAML | [js-yaml](https://github.com/nodeca/js-yaml) | YAML serialization |
| CSV | [PapaParse](https://www.papaparse.com) | CSV parsing |
| Validation | [Zod](https://zod.dev) | API request schema validation |
| Drag and drop | [react-dropzone](https://react-dropzone.js.org) | File upload UX |

---

## ⚙️ Configuration

All core conversions run server-side and need no configuration. A few optional environment variables unlock extra features:

| Variable | Required | Enables |
| -------- | -------- | ------- |
| `GROQ_API_KEY` | Optional | AI features (chat, modify, content detection / humanization) |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Cloud templates + accounts |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Cloud templates + accounts |

Without Supabase configured, cloud/auth features are simply hidden — the converter works fully without them. Copy `.env.example` to `.env.local` to set values.

### Puppeteer / Chrome

FileFlowOne finds a browser in this order:

1. Puppeteer's bundled Chromium (downloaded on `npm install`)
2. System Google Chrome — `C:\Program Files\Google\Chrome\Application\chrome.exe` (Windows)
3. System Google Chrome (x86) — `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`
4. Microsoft Edge — `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`

If none are found, PDF/PNG conversions and Mermaid rendering will fail with a descriptive error.

### Professional DOCX Output

`mdToDocx()` generates a three-section Word document:

| Section | Contents |
|---------|---------|
| Cover | Document title (extracted from first `# H1`), decorative rule, current date |
| Table of Contents | Auto-linked TOC for H1–H3 headings; refreshes on document open in Word |
| Content | Styled headings with page breaks, header (title), footer (Page X of Y), embedded Mermaid diagrams |

---

## 📡 API Reference

### `POST /api/convert`

Convert a single file server-side.

**Request body (JSON)**

```json
{
  "fileBase64": "<base64-encoded file content>",
  "fileName": "document.md",
  "fromFormat": "md",
  "toFormat": "docx",
  "options": {
    "pdfPageSize": "A4",
    "pdfOrientation": "portrait",
    "imageQuality": 90,
    "mermaidTheme": "default"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fileBase64` | `string` | ✅ | Base64-encoded file content |
| `fileName` | `string` | ✅ | Original file name (used to derive output name) |
| `fromFormat` | `FileFormat` | ✅ | Source format identifier |
| `toFormat` | `FileFormat` | ✅ | Target format identifier |
| `options` | `object` | — | Optional conversion parameters |

**Supported `FileFormat` values**

`md` · `mermaid` · `html` · `pdf` · `docx` · `txt` · `json` · `yaml` · `csv` · `png` · `jpeg` · `svg` · `mssql` · `mysql` · `pgsql`

**Success response**

```json
{
  "success": true,
  "fileBase64": "<base64-encoded output>",
  "fileName": "document.docx",
  "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}
```

**Error response**

```json
{
  "success": false,
  "error": "Conversion from 'csv' to 'pdf' is not supported."
}
```

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!

1. Fork the repository
2. Create a feature branch — `git checkout -b feat/your-feature`
3. Commit your changes — `git commit -m "feat: add your feature"`
4. Push to the branch — `git push origin feat/your-feature`
5. Open a Pull Request

Please ensure `npm run lint` and `npx tsc --noEmit` pass before submitting.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ using Next.js, Puppeteer, and the <code>docx</code> library.</sub>
</div>
