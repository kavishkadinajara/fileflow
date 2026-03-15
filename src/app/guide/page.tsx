import {
    ArrowLeft, ArrowRight, BookOpen, Brain, ChevronRight,
    Download, FileText, Film, Layers, Music, Search,
    Sparkles, Upload, Zap
} from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "User Guide — FileFlowOne",
  description: "Complete guide to using FileFlowOne: file conversion, audio/video, compression, AI tools, text editor, and more.",
};

type Step = { n: number; title: string; detail: string };
type Section = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  color: string;
  intro: string;
  steps?: Step[];
  subsections?: { title: string; content: string }[];
  tips?: string[];
};

const SECTIONS: Section[] = [
  {
    id: "getting-started",
    icon: Upload,
    title: "Getting Started",
    color: "text-blue-500",
    intro: "FileFlowOne requires no installation, no account, and no payment. Open the app in your browser and start converting instantly.",
    steps: [
      { n: 1, title: "Open FileFlowOne", detail: "Navigate to the FileFlowOne homepage in any modern browser (Chrome, Firefox, Edge, Safari). No installation required." },
      { n: 2, title: "Drop or browse your file", detail: "Drag and drop one or more files onto the upload area, or click 'Browse files' to select from your device. Multiple files can be queued simultaneously." },
      { n: 3, title: "Select output format", detail: "FileFlowOne auto-detects the input format. Use the 'To' dropdown to select your desired output format. Only supported conversions for that file type are shown." },
      { n: 4, title: "Click Convert", detail: "Click the Convert button. Your file is processed and the result appears in the Job History panel below." },
      { n: 5, title: "Preview & Download", detail: "Click the eye icon to preview the output, or the download icon to save the file to your device." },
    ],
    tips: [
      "You can queue multiple files before converting — each converts independently.",
      "Completed jobs stay in the history panel until you refresh the page.",
      "The Format Matrix at the bottom of the home page shows all supported format pairs.",
    ],
  },
  {
    id: "file-conversion",
    icon: FileText,
    title: "File Conversion",
    color: "text-violet-500",
    intro: "Convert between documents, data formats, images, diagrams, and SQL dialects with rich options.",
    subsections: [
      {
        title: "Documents",
        content: `Supported: Markdown (MD), HTML, DOCX, PDF, Plain Text (TXT)

• MD → PDF: Renders clean, professional PDFs with configurable page size (A4, A3, Letter, Legal) and orientation
• MD → DOCX: Full Word document with auto Table of Contents, cover page, headers and footers
• HTML → PDF: Captures the page layout as a printable PDF
• DOCX → MD: Extracts text content as structured Markdown

Tip: Use the "Show options" button to set PDF page size, orientation, and JPEG quality.`,
      },
      {
        title: "Data Formats",
        content: `Supported: JSON, YAML, CSV

• JSON ↔ YAML: Bi-directional conversion preserving structure
• JSON / YAML → CSV: Flattens the first array in the data into tabular format
• CSV → JSON / YAML: Converts tabular data with column headers as keys`,
      },
      {
        title: "SQL Dialects",
        content: `Supported: MS SQL Server (MSSQL), MySQL/MariaDB, PostgreSQL (PgSQL)

All three dialects are interconvertible. The converter handles:
• Data type mapping (e.g., NVARCHAR → VARCHAR in MySQL)
• Function translation (e.g., GETDATE() → NOW())
• Syntax differences (e.g., TOP vs LIMIT, square brackets vs backticks)

Use this to migrate schemas between database platforms.`,
      },
      {
        title: "Diagrams",
        content: `Supported: Mermaid (.mmd) → PNG, PDF, DOCX, HTML

Drop a .mmd file containing Mermaid diagram syntax (flowchart, sequence, ER, Gantt, etc.) to render it as a high-resolution image or embed it in a document.

Available themes: Default, Dark, Forest, Neutral — configurable in the options panel.`,
      },
      {
        title: "Images",
        content: `Supported: PNG ↔ JPEG, SVG → PNG/JPEG

• PNG ↔ JPEG: Lossless/lossy conversion with configurable JPEG quality (1–100)
• SVG → PNG/JPEG: Renders vector graphics to raster at high resolution`,
      },
    ],
    tips: [
      "Format pairs are shown in the 'To' dropdown — only valid conversions are listed.",
      "The Format Matrix on the home page shows all available pairs at a glance.",
    ],
  },
  {
    id: "audio-video",
    icon: Music,
    title: "Audio & Video Conversion",
    color: "text-orange-500",
    intro: "Convert audio and video files entirely in your browser using FFmpeg WebAssembly. Your files never leave your device.",
    steps: [
      { n: 1, title: "Drop an audio or video file", detail: "Drag and drop an MP3, WAV, OGG, FLAC, AAC, M4A, MP4, WebM, AVI, MOV, or MKV file onto the uploader." },
      { n: 2, title: "Select output format", detail: "Choose from any supported audio or video output, including cross-type conversions (e.g., MP4 → MP3 to extract audio)." },
      { n: 3, title: "First-use: FFmpeg loads (~32 MB)", detail: "On the very first audio/video conversion, FileFlowOne downloads the FFmpeg WebAssembly core (~32 MB) from CDN. This is a one-time download cached by your browser." },
      { n: 4, title: "Conversion runs in browser", detail: "The conversion runs locally — no upload, no server. Progress is shown in real time using FFmpeg progress events." },
      { n: 5, title: "Preview and download", detail: "Completed audio jobs open in a custom audio player. Video jobs open in a full video player with controls. Click Download to save." },
    ],
    subsections: [
      {
        title: "Supported Audio Formats",
        content: "MP3, WAV, OGG, FLAC, AAC, M4A\n\nAll audio ↔ audio conversions are supported. You can also extract audio from video files (e.g., MP4 → MP3).",
      },
      {
        title: "Supported Video Formats",
        content: "MP4, WebM, AVI, MOV, MKV, GIF\n\nAll video ↔ video conversions are supported, including cross-format (e.g., MKV → MP4, MOV → WebM). Convert video to animated GIF with 'MP4 → GIF'.",
      },
    ],
    tips: [
      "Maximum file size is 500 MB — suitable for most video files.",
      "The FFmpeg WASM core is cached after first use — subsequent conversions start immediately.",
      "Only one conversion runs at a time (WASM is single-threaded). Multiple jobs queue automatically.",
      "AVI and MOV browsers may not natively play back in the preview — download to view.",
    ],
  },
  {
    id: "video-compression",
    icon: Film,
    title: "Video Compression",
    color: "text-purple-500",
    intro: "Reduce video file size while maintaining quality using browser-based H.264/VP9 encoding with CRF-based compression.",
    steps: [
      { n: 1, title: "Drop a video file", detail: "Drop any MP4, WebM, AVI, MOV, or MKV file onto the uploader." },
      { n: 2, title: "Select the same (or different) format", detail: "In the 'To' dropdown, select a video format. To compress without converting, choose the same format (e.g., MP4 → MP4 shows as 'MP4 (Compress)')." },
      { n: 3, title: "Choose quality preset", detail: "The Video Compression panel appears automatically. Select a quality preset: High, Balanced, Compressed, or Max." },
      { n: 4, title: "Optionally change resolution", detail: "Select a target resolution to additionally downscale: Original, 1080p, 720p, 480p, or 360p." },
      { n: 5, title: "Click Compress", detail: "The button changes to 'Compress →'. Click it to start. Processing time depends on file size and your device." },
    ],
    subsections: [
      {
        title: "Quality Presets Explained",
        content: `Quality is controlled by CRF (Constant Rate Factor) — lower CRF = better quality, larger file.

• High (CRF 18): Near-lossless. Very slight reduction in file size vs. source. Best for archiving or re-editing.
• Balanced (CRF 23): Recommended default. Good visual quality with moderate size reduction (~30–50%).
• Compressed (CRF 28): Noticeable compression. Good for web sharing (~50–65% smaller than source).
• Max (CRF 34): Maximum compression. Some visible quality loss acceptable. Useful for email/messaging (~65–80% smaller).

Note: Actual reduction depends on the source video's existing compression. A heavily compressed source may not reduce much further.`,
      },
      {
        title: "Resolution Downscaling",
        content: `Combining quality compression with resolution reduction achieves the greatest file size savings.

Example workflow for a large 4K recording:
1. Set quality to "Balanced"
2. Set resolution to "1080p"
3. Result: typically 85–95% smaller than the original 4K file

The scaler uses the -2 flag to maintain aspect ratio — no distortion.`,
      },
    ],
    tips: [
      "Compressing a small file (under 10 MB) may not produce significant savings.",
      "MP4 with H.264 (libx264) offers the best browser compatibility for the output.",
      "WebM uses VP9 codec — excellent quality at low bitrates but slower to encode.",
    ],
  },
  {
    id: "ai-tools",
    icon: Brain,
    title: "AI Tools",
    color: "text-pink-500",
    intro: "Built-in AI tools for content detection and text humanization, powered by Llama 4 and Groq AI.",
    subsections: [
      {
        title: "AI Content Detector",
        content: `Detects whether text was written by a human or AI.

How to use:
1. Click the ✨ icon in the header or text editor toolbar to open AI Tools
2. Paste or load your text (min. ~100 words for accuracy)
3. Select "AI Detect" and click Analyze
4. Review the result: probability %, confidence level, and statistical breakdown

How it works — Three layers:
• Layer 1 (Statistical): Analyses burstiness, TTR, transition phrases, hedging language, contraction rate, and readability using only your browser
• Layer 2 (LLM): Sends text to Llama 4 Maverick (via Groq) for contextual AI probability
• Layer 3 (Ensemble): Combines both scores (40% statistical + 60% LLM) for a final verdict

Privacy note: Your text is sent to Groq's API for Layer 2 analysis.`,
      },
      {
        title: "AI Text Humanizer",
        content: `Rewrites AI-generated text to sound more natural and human.

How to use:
1. Open AI Tools (✨ icon)
2. Paste AI-generated text
3. Select "Humanize" and click Rewrite
4. Review the humanized version — it preserves meaning but varies phrasing, reduces repetition, and adds natural flow
5. Click "Copy" or "Apply to Editor" to use the result

The humanizer uses Llama 3.3 70B (via Groq) with a specialized prompt designed to reduce AI detection signals without changing the core meaning.

Privacy note: Text is sent to Groq's API.`,
      },
      {
        title: "AI Chat Assistant",
        content: `A floating AI chat panel is available on all pages (bottom-right).

The assistant can help with:
• Explaining conversion options
• Suggesting the best output format for your use case
• Answering questions about the tool
• General file format questions

When a file is loaded in the editor, the AI has context about your current file and can suggest improvements.`,
      },
    ],
    tips: [
      "AI detection accuracy improves with longer text. Very short texts (< 50 words) are unreliable.",
      "The statistical layer runs entirely in your browser — no data sent for that part.",
      "Use the Humanizer on small sections at a time for best results.",
    ],
  },
  {
    id: "text-editor",
    icon: Layers,
    title: "Text Editor & Templates",
    color: "text-emerald-500",
    intro: "A full-featured Markdown editor with live split preview, syntax highlighting, templates, and auto-save.",
    subsections: [
      {
        title: "Opening the Editor",
        content: "When you drop a text-based file (MD, HTML, JSON, YAML, CSV, SQL), the editor opens automatically in the workspace. You can also create new documents using the template gallery.",
      },
      {
        title: "Template Gallery",
        content: `Pre-built templates for common documents:

• Meeting Notes, Project Proposal, Technical README, API Documentation, Bug Report, Weekly Report, and more.

To use: Click "Templates" in the editor toolbar → select a template → it loads into the editor ready to fill in.`,
      },
      {
        title: "Markdown Toolbar",
        content: `Quick formatting buttons in the editor toolbar:

Bold, Italic, Strikethrough, Link, Image, Inline Code, Code Block, Blockquote, Ordered List, Unordered List, Heading, Table, Horizontal Rule

Each inserts the correct Markdown syntax at your cursor position or wraps selected text.`,
      },
      {
        title: "Regex Find & Replace",
        content: "Click the search icon (🔍) in the toolbar to open Find & Replace. Supports plain text and regular expression search with Case Sensitive and Whole Word options. Replace one or all occurrences.",
      },
      {
        title: "Document Outline",
        content: "Click the outline icon to open the Document Outline panel. It shows all headings (H1–H6) as a clickable navigation tree. Click any heading to jump to that position in the editor.",
      },
      {
        title: "Auto-Save Draft",
        content: "The editor automatically saves your content to browser localStorage every few seconds. If you accidentally close the tab, a restore banner appears next time you visit. Click 'Restore' to recover your work.",
      },
    ],
    tips: [
      "The live preview updates as you type — hover the divider to resize panes.",
      "Readability score and word count are shown at the bottom of the editor.",
      "Use Ctrl+Z / Cmd+Z for undo in the editor.",
    ],
  },
  {
    id: "preview-download",
    icon: Download,
    title: "Preview & Download",
    color: "text-cyan-500",
    intro: "Preview output before downloading. Supports PDF, DOCX, HTML, images, audio, and video playback.",
    subsections: [
      {
        title: "Output Preview",
        content: `After a conversion completes, click the eye icon on any job to open the preview:

• PDF: Embedded PDF viewer (browser-native)
• HTML: Rendered live preview
• Markdown: Rendered Markdown
• JSON/YAML/SQL: Syntax-highlighted code
• CSV: Table view
• PNG/JPEG: Image preview
• Audio (MP3/WAV/OGG/etc.): Custom audio player with equalizer visualization, progress bar, volume control
• Video (MP4/WebM/etc.): Custom video player with seek bar, volume, and fullscreen
• GIF: Animated preview`,
      },
      {
        title: "Downloading Files",
        content: `Click the download icon on any completed job in the Job History to save the file.

The filename is auto-generated from the source filename with the new extension (e.g., 'report.md' → 'report.pdf').

Batch Download: If you have multiple completed jobs, you can download all at once as a ZIP file using the 'Download All as ZIP' button at the top of the Job History panel.`,
      },
      {
        title: "Edit & Reconvert",
        content: "For text-based outputs (MD, HTML, JSON, etc.), click the edit icon on a completed job to load the result back into the editor. Make changes and reconvert to any format — useful for iterative document workflows.",
      },
    ],
  },
  {
    id: "faq",
    icon: Search,
    title: "Frequently Asked Questions",
    color: "text-yellow-500",
    intro: "Common questions about FileFlowOne.",
    subsections: [
      {
        title: "Is FileFlowOne really free?",
        content: "Yes. FileFlowOne is 100% free with no usage limits, no subscriptions, and no premium tiers. It is open-source under the MIT License.",
      },
      {
        title: "Do my files get stored on your servers?",
        content: "Audio and video files are never sent to our servers at all — they're processed in your browser. Document and image conversions are processed server-side but files are not stored. They're held in memory only for the conversion duration (typically <5 seconds) and then discarded.",
      },
      {
        title: "Why does the first audio/video conversion take time?",
        content: "FileFlowOne downloads the FFmpeg WebAssembly runtime (~32 MB) from a CDN on the first use. This is a one-time download. Your browser caches it, so all subsequent conversions start immediately.",
      },
      {
        title: "What's the maximum file size?",
        content: "For audio/video files: 500 MB. For documents, images, and data files: ~50 MB (server memory limit). Most real-world files are well within these limits.",
      },
      {
        title: "How accurate is the AI content detector?",
        content: "The multi-layer system is more accurate than single-method detectors. However, no AI detector is 100% accurate. Short texts, highly edited AI text, and some writing styles may confuse the detector. Use results as a guide, not a definitive judgment.",
      },
      {
        title: "Can I use FileFlowOne offline?",
        content: "Once loaded, the app partially works offline. Text conversions (JSON, YAML, etc.) that happen client-side work offline. Conversions requiring the API (PDF, DOCX, etc.) need internet. Audio/video conversions need internet only for the initial FFmpeg WASM download (cached thereafter).",
      },
      {
        title: "How do I report a bug or request a feature?",
        content: "Open an issue on our GitHub repository. We welcome bug reports, feature requests, and contributions.",
      },
    ],
  },
];

export default function GuidePage() {
  return (
    <div className="container max-w-5xl py-10">
      {/* Header */}
      <div className="mb-10 space-y-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Home
        </Link>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
            <BookOpen className="h-3 w-3" />
            Complete User Guide
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight">FileFlowOne Guide</h1>
          <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
            Everything you need to know about converting files, using AI tools, compressing video,
            and getting the most out of FileFlowOne.
          </p>
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap gap-2 pt-2">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-muted/40 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <ChevronRight className="h-3 w-3" />
              {s.title}
            </a>
          ))}
        </div>
      </div>

      {/* Quick-start CTA */}
      <div className="mb-10 rounded-2xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Ready to convert?</span>
          </div>
          <p className="text-xs text-muted-foreground">No sign-up required. Drop a file and convert in seconds.</p>
        </div>
        <Link
          href="/#converter-workspace"
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-brand text-white text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          Start Converting
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Sections */}
      <div className="space-y-16">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <section key={section.id} id={section.id} className="scroll-mt-20 space-y-6">
              {/* Section header */}
              <div className="flex items-start gap-4 pb-4 border-b border-border">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted`}>
                  <Icon className={`h-5 w-5 ${section.color}`} />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight">{section.title}</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">{section.intro}</p>
                </div>
              </div>

              {/* Steps */}
              {section.steps && (
                <div className="space-y-3">
                  {section.steps.map((step) => (
                    <div key={step.n} className="flex gap-4 rounded-xl border bg-card p-4">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold mt-0.5`}>
                        {step.n}
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-sm">{step.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Subsections */}
              {section.subsections && (
                <div className="space-y-4">
                  {section.subsections.map((sub) => (
                    <div key={sub.title} className="rounded-xl border bg-card p-4 sm:p-5 space-y-2">
                      <h3 className="font-semibold text-sm text-foreground">{sub.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{sub.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tips */}
              {section.tips && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary">Tips</span>
                  </div>
                  <ul className="space-y-1.5">
                    {section.tips.map((tip) => (
                      <li key={tip} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="mt-0.5 text-primary shrink-0">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="mt-16 rounded-2xl border bg-card p-8 text-center space-y-4">
        <div className="text-3xl">🚀</div>
        <h2 className="font-display text-xl font-bold">You&apos;re ready to go!</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Start converting files now — free, private, and no account required.
        </p>
        <Link
          href="/#converter-workspace"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-brand text-white font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Open Converter
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Footer links */}
      <div className="mt-8 flex items-center gap-4 text-xs text-muted-foreground pt-6 border-t border-border">
        <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
        <a href="https://github.com/kavishkadinajara/fileflow" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
      </div>
    </div>
  );
}
