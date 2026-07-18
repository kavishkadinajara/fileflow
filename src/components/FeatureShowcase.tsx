"use client";

import { cn } from "@/lib/utils";
import {
    AlignLeft,
    Archive,
    BarChart3,
    BookOpen,
    BookTemplate,
    BrainCircuit,
    ChevronDown,
    ChevronUp,
    Clock,
    Download,
    Eye,
    FileText,
    FileType2,
    GitBranch,
    GitCompareArrows,
    Keyboard,
    MousePointer2,
    MousePointerClick,
    Pencil,
    Replace,
    RotateCcw,
    ScanLine,
    Search,
    ShieldCheck,
    Sparkles,
    SplitSquareHorizontal,
    Split,
    Table2,
    Wand2,
    Workflow,
} from "lucide-react";
import { useState } from "react";

interface Feature {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  badge: string;
  badgeColor: string;
  title: string;
  benefit: string;
  steps: string[];
}

const FEATURES: Feature[] = [
  // ── Smart Tools (free vs paid AI)
  {
    icon: ScanLine,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    badge: "Smart Tools",
    badgeColor: "bg-primary/10 text-primary border-primary/20",
    title: "Resume ATS Optimizer",
    benefit: "Upload your CV and a job description to get an explainable ATS match score in ~23 ms — missing skills & keywords, parse-ability warnings, and a grounded AI bullet rewriter. Free alternative to Jobscan.",
    steps: [
      "Open the Resume ATS page from the top nav",
      "Upload your CV (PDF/DOCX) and paste the job description",
      "Read the score, fix the flagged gaps, and optionally rewrite bullets with AI",
    ],
  },
  {
    icon: Table2,
    iconBg: "bg-green-500/10 dark:bg-green-500/15",
    iconColor: "text-green-500",
    badge: "Smart Tools",
    badgeColor: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    title: "PDF Tables → Excel / CSV",
    benefit: "A char-level column-projection engine rebuilds tables from a PDF — even borderless ones — and exports typed Excel cells that actually sum and sort, with a confidence flag on tricky tables.",
    steps: [
      "Drop a PDF, then open the Tables → Excel tab",
      "Preview each detected table with column types and a confidence score",
      "Download as a styled XLSX (one sheet per table) or CSV",
    ],
  },
  {
    icon: AlignLeft,
    iconBg: "bg-cyan-500/10 dark:bg-cyan-500/15",
    iconColor: "text-cyan-500",
    badge: "Smart Tools",
    badgeColor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    title: "Hybrid Summarizer",
    benefit: "A TextRank engine finds the most central sentences entirely in your browser (no API key), then optionally grounds an AI polish — so the summary can't hallucinate. Works for English, Sinhala and Tamil.",
    steps: [
      "Open AI Tools on any text content and choose Summarize",
      "The extractive summary + keywords appear instantly; adjust length",
      "Optionally click Polish with AI, then Copy or Apply to editor",
    ],
  },
  // ── Research metrics
  {
    icon: ShieldCheck,
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    iconColor: "text-emerald-500",
    badge: "Research",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    title: "Semantic Fidelity Index",
    benefit: "The first general metric for conversion quality: it scores how much structural, semantic and functional meaning survives a conversion, with a per-dimension radar — so you know whether the conversion actually worked.",
    steps: [
      "Convert a document (e.g. Markdown → PDF)",
      "The SFI card auto-scores the conversion with a grade",
      "Expand it for structural / semantic / functional detail",
    ],
  },
  {
    icon: RotateCcw,
    iconBg: "bg-violet-500/10 dark:bg-violet-500/15",
    iconColor: "text-violet-500",
    badge: "Research",
    badgeColor: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    title: "Round-Trip Fidelity Tracker",
    benefit: "Build a conversion chain (A→B→C→…) and measure the meaning lost at every hop — locally and cumulatively — with a degradation curve and a safe-path recommender. Shows the silent loss no single conversion reveals.",
    steps: [
      "Open the Round-Trip page and drop a document",
      "Build a chain with the hop buttons (or use Close the loop)",
      "Measure fidelity — read the curve, per-hop table, and safe paths",
    ],
  },
  {
    icon: GitCompareArrows,
    iconBg: "bg-blue-500/10 dark:bg-blue-500/15",
    iconColor: "text-blue-500",
    badge: "Research",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    title: "Semantic Document Compare",
    benefit: "Drop two versions of a document and get a Word-style redline — but semantic: a reworded paragraph is one 'modified' block with inline highlights, and a relocated one is flagged 'moved', not deleted and re-added.",
    steps: [
      "Open the Compare page from the top nav",
      "Drop the original and the revised document (any format)",
      "Read the redline — added / removed / modified / moved with a similarity score",
    ],
  },
  {
    icon: Split,
    iconBg: "bg-amber-500/10 dark:bg-amber-500/15",
    iconColor: "text-amber-500",
    badge: "Research",
    badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    title: "Privacy-Aware Router",
    benefit: "Before any document reaches an AI model, an on-device classifier decides whether it should stay local, go hybrid, or use the cloud — using PII sensitivity, complexity and predicted local quality. Sensitive docs never leave your device.",
    steps: [
      "Open the Privacy Router page (linked from Privacy Audit)",
      "Paste document text — the three factors compute live in your browser",
      "See the LOCAL / HYBRID / CLOUD decision and exactly why",
    ],
  },
  // ── PDF Editor
  {
    icon: MousePointerClick,
    iconBg: "bg-rose-500/10 dark:bg-rose-500/15",
    iconColor: "text-rose-500",
    badge: "PDF",
    badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    title: "Visual Fill-In Editor",
    benefit: "Drop a PDF and it appears exactly as it looks — logo, colour bands, dotted lines and all. Click any line and type straight into the blanks, like a paper form.",
    steps: [
      "Drop a PDF — it opens on the Fill in (visual) tab",
      "Click any field on the page and type your answer",
      "Hit Download filled PDF — only your edits are added",
    ],
  },
  {
    icon: Replace,
    iconBg: "bg-pink-500/10 dark:bg-pink-500/15",
    iconColor: "text-pink-500",
    badge: "PDF",
    badgeColor: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
    title: "Font-Matched Text Editing",
    benefit: "Edit words inside an existing PDF and they're redrawn in the original font, size and colour — the change blends in instead of standing out.",
    steps: [
      "Open the Advanced tab in the PDF editor",
      "Use Edit original text (find & replace) — set scope and case",
      "Apply to original — the matched span keeps its exact style",
    ],
  },
  {
    icon: Wand2,
    iconBg: "bg-fuchsia-500/10 dark:bg-fuchsia-500/15",
    iconColor: "text-fuchsia-500",
    badge: "PDF",
    badgeColor: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20",
    title: "Surgical Patch",
    benefit: "Edit the extracted text freely, then patch only the words you changed back onto the original — everything you didn't touch stays pixel-identical.",
    steps: [
      "Open the Advanced tab and edit the extracted text",
      "Click Patch original (surgical)",
      "Only the changed phrases are redrawn; the rest is byte-for-byte intact",
    ],
  },
  {
    icon: AlignLeft,
    iconBg: "bg-rose-500/10 dark:bg-rose-500/15",
    iconColor: "text-rose-500",
    badge: "PDF",
    badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    title: "Smart Reflow Rebuild",
    benefit: "Rebuild a PDF from edited, positioned blocks that each keep their original spot, font and colour — a fully editable PDF that still looks like the source.",
    steps: [
      "Open the Advanced tab → Smart Reflow → Load layout blocks",
      "Edit any block of text in place",
      "Rebuild (keep layout) — every block stays where it was",
    ],
  },
  {
    icon: FileType2,
    iconBg: "bg-pink-500/10 dark:bg-pink-500/15",
    iconColor: "text-pink-500",
    badge: "PDF",
    badgeColor: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
    title: "PDF → Editable Markdown / DOCX",
    benefit: "A deterministic structure engine reads headings, lists, tables and reading order from a PDF — far cleaner than a naive text dump.",
    steps: [
      "Drop a PDF, then open the Advanced tab",
      "The extracted Markdown loads automatically — edit it",
      "Rebuild or convert it to DOCX, HTML or a polished new PDF",
    ],
  },
  // ── Editing
  {
    icon: BookOpen,
    iconBg: "bg-violet-500/10 dark:bg-violet-500/15",
    iconColor: "text-violet-500",
    badge: "Editor",
    badgeColor: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    title: "Template Gallery",
    benefit: "Jump-start writing with 12 + professional templates — README, API docs, SQL schema, Mermaid diagrams & more.",
    steps: [
      "Switch to the Type Text tab",
      "Click the Templates button in the editor header",
      "Browse by category and click any template to load it instantly",
    ],
  },
  {
    icon: Keyboard,
    iconBg: "bg-blue-500/10 dark:bg-blue-500/15",
    iconColor: "text-blue-500",
    badge: "Editor",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    title: "Markdown Formatting Toolbar",
    benefit: "Format text without memorising syntax — Bold, Italic, Headings, code blocks, tables, and more with one click.",
    steps: [
      "Switch to the Type Text tab",
      "The toolbar appears automatically above the editor",
      "Select text, then click any toolbar button to apply formatting",
    ],
  },
  {
    icon: Clock,
    iconBg: "bg-amber-500/10 dark:bg-amber-500/15",
    iconColor: "text-amber-500",
    badge: "Editor",
    badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    title: "Auto-Save Draft",
    benefit: "Never lose your work — the editor automatically saves to your browser every second and restores on reload.",
    steps: [
      "Just type in the Text Editor (no action needed)",
      'A "• Saved HH:MM" indicator appears in the editor footer',
      "On page reload, a yellow banner offers to restore your draft",
    ],
  },
  // ── Preview
  {
    icon: SplitSquareHorizontal,
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    iconColor: "text-emerald-500",
    badge: "Preview",
    badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    title: "Live Split Preview (Toggleable)",
    benefit: "See your Markdown / HTML / JSON rendered in real time beside the editor. Toggle off for distraction-free writing.",
    steps: [
      "Start typing in the Text Editor or upload a text file",
      "The preview panel opens automatically in split view",
      'Click the Hide / Show Preview button above to toggle it',
    ],
  },
  {
    icon: GitBranch,
    iconBg: "bg-indigo-500/10 dark:bg-indigo-500/15",
    iconColor: "text-indigo-500",
    badge: "Preview",
    badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    title: "Mermaid Diagram Rendering",
    benefit: "Flowcharts, sequence diagrams, ER diagrams — all render as live visuals inside the preview panel.",
    steps: [
      "Create a .mermaid file or type Mermaid syntax in the editor",
      "Use ```mermaid fenced code blocks inside Markdown",
      "The diagram renders automatically, adapting to dark/light mode",
    ],
  },
  {
    icon: BookTemplate,
    iconBg: "bg-cyan-500/10 dark:bg-cyan-500/15",
    iconColor: "text-cyan-500",
    badge: "Preview",
    badgeColor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    title: "Word Count & Reading Time",
    benefit: "Instant writing stats — word count, ~reading time, character count, and line count shown below the preview.",
    steps: [
      "Type or paste Markdown, HTML, or plain text",
      "Stats appear automatically in the preview footer bar",
      "Updates live as you type",
    ],
  },
  // ── Downloads
  {
    icon: Eye,
    iconBg: "bg-rose-500/10 dark:bg-rose-500/15",
    iconColor: "text-rose-500",
    badge: "Download",
    badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    title: "Output Preview Before Download",
    benefit: "Check what the converted file looks like before saving — respects page size and orientation settings.",
    steps: [
      "Convert any file and wait for the green Done status",
      "Click the eye (👁) icon on a completed job card",
      "View the output in the preview dialog, then download",
    ],
  },
  {
    icon: Download,
    iconBg: "bg-green-500/10 dark:bg-green-500/15",
    iconColor: "text-green-500",
    badge: "Download",
    badgeColor: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    title: "ZIP Batch Download",
    benefit: "Download all completed conversions in one click as a single neatly-packed ZIP file.",
    steps: [
      "Convert 2 or more files",
      "A green Download All (N) button appears in the Conversions header",
      "Click it — all done files are zipped and downloaded instantly",
    ],
  },
  // ── Workflow
  {
    icon: Pencil,
    iconBg: "bg-orange-500/10 dark:bg-orange-500/15",
    iconColor: "text-orange-500",
    badge: "Workflow",
    badgeColor: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    title: "Edit & Reconvert",
    benefit: "Never re-upload a file — load any completed job's source back into the editor, edit it, and reconvert.",
    steps: [
      "Convert any text-based file (Markdown, JSON, CSV, etc.)",
      "Click the pencil (✏) icon on the completed job card",
      "Edit the content in the Text Editor, then convert again",
    ],
  },
  {
    icon: Archive,
    iconBg: "bg-teal-500/10 dark:bg-teal-500/15",
    iconColor: "text-teal-500",
    badge: "Workflow",
    badgeColor: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    title: "Reconvert to Any Format",
    benefit: "Already converted? Reconvert to a different format in one click — no re-upload, no re-paste.",
    steps: [
      "Look for the refresh (↺) icon on a completed job card",
      "Click it to open the format picker dropdown",
      "Select the new output format — conversion starts immediately",
    ],
  },
  {
    icon: MousePointer2,
    iconBg: "bg-pink-500/10 dark:bg-pink-500/15",
    iconColor: "text-pink-500",
    badge: "Workflow",
    badgeColor: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
    title: "Format Matrix Click-to-Fill",
    benefit: "Click any format badge at the bottom of the page — the workspace jumps to it with that format pre-selected.",
    steps: [
      "Scroll to the Supported Formats section at the bottom",
      "Click any format badge (e.g. Markdown, JSON, CSV…)",
      "The editor scrolls into view and switches to the correct tab",
    ],
  },
  {
    icon: Workflow,
    iconBg: "bg-purple-500/10 dark:bg-purple-500/15",
    iconColor: "text-purple-500",
    badge: "Workflow",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    title: "Copy Output to Clipboard",
    benefit: "Copy any converted text output directly to the clipboard — no download needed for quick reuse.",
    steps: [
      "Convert any text-based file",
      "Click the copy icon on the completed job card",
      "The icon turns to a green check — content is on your clipboard",
    ],
  },
  // ── AI Tools
  {
    icon: BrainCircuit,
    iconBg: "bg-violet-500/10 dark:bg-violet-500/15",
    iconColor: "text-violet-500",
    badge: "AI",
    badgeColor: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    title: "Multi-Layer AI Detection",
    benefit: "Detects AI-generated content using statistical analysis + DeepSeek AI for high-accuracy, sentence-level breakdown with ensemble scoring.",
    steps: [
      "Type or paste text, then click the AI Tools button",
      "Choose Detect AI Content — analysis runs in two layers",
      "View ensemble score, individual layer scores, and flagged indicators",
    ],
  },
  {
    icon: Wand2,
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    iconColor: "text-emerald-500",
    badge: "AI",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    title: "AI Humanizer with Auto-Verify",
    benefit: "Rewrites AI text to sound natural, then auto-verifies the result to show a before/after AI score comparison.",
    steps: [
      "Open AI Tools and click Humanize Text",
      "Review the rewritten text with before/after score comparison",
      "Click Apply to Editor or Copy — redo if needed",
    ],
  },
  {
    icon: Search,
    iconBg: "bg-blue-500/10 dark:bg-blue-500/15",
    iconColor: "text-blue-500",
    badge: "Editor",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    title: "Regex Find & Replace",
    benefit: "Find and replace text with full regex support, case sensitivity toggle, and live match count — press Ctrl+H.",
    steps: [
      "Click the search icon in the editor header (or press Ctrl+H)",
      "Type a search pattern — toggle Regex (.*) or Case (Aa) as needed",
      "Click Replace or Replace All to apply changes instantly",
    ],
  },
  {
    icon: FileText,
    iconBg: "bg-indigo-500/10 dark:bg-indigo-500/15",
    iconColor: "text-indigo-500",
    badge: "Editor",
    badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    title: "Document Outline Panel",
    benefit: "Live heading tree for Markdown documents — click any heading to jump to it in the editor.",
    steps: [
      "Write Markdown with headings (# H1, ## H2, etc.)",
      "An outline toggle appears in the editor header",
      "Click any heading in the outline to navigate to it instantly",
    ],
  },
  {
    icon: BarChart3,
    iconBg: "bg-teal-500/10 dark:bg-teal-500/15",
    iconColor: "text-teal-500",
    badge: "Preview",
    badgeColor: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    title: "Readability Score",
    benefit: "Flesch-Kincaid readability grade shown in the preview footer — from Very Easy to Very Hard with color coding.",
    steps: [
      "Type 20+ words in the editor",
      "Look at the preview stats bar at the bottom",
      "The readability label updates live as you type",
    ],
  },
];

const CATEGORY_ORDER = ["Smart Tools", "Research", "PDF", "AI", "Editor", "Preview", "Download", "Workflow"];
const CATEGORY_COLORS: Record<string, string> = {
  "Smart Tools": "text-primary",
  Research: "text-emerald-500",
  PDF: "text-rose-500",
  AI: "text-violet-500",
  Editor: "text-blue-500",
  Preview: "text-emerald-500",
  Download: "text-green-500",
  Workflow: "text-orange-500",
};

export function FeatureShowcase() {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-2xl border bg-card overflow-hidden animate-fade-up shadow-sm">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors group"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold">What&apos;s New in FileFlowOne</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-semibold text-primary border border-primary/20">
                <Sparkles className="h-2.5 w-2.5" />
                {FEATURES.length} Features
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Resume ATS · PDF Tables → Excel · Summarizer · Fidelity Index · Document Compare · Privacy Router · PDF Editor + more
            </p>
          </div>
        </div>
        <div className="shrink-0 p-1.5 rounded-lg text-muted-foreground group-hover:text-foreground group-hover:bg-muted transition-colors">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      {open && (
        <div className="border-t px-5 pt-4 pb-5 space-y-5">
          {/* Quick-glance chips */}
          <div className="flex flex-wrap gap-2">
            {CATEGORY_ORDER.map((cat) => {
              const count = FEATURES.filter((f) => f.badge === cat).length;
              return (
                <span
                  key={cat}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold bg-muted/40",
                    CATEGORY_COLORS[cat]
                  )}
                >
                  {cat} · {count} features
                </span>
              );
            })}
          </div>

          {/* Feature cards grouped by category */}
          {CATEGORY_ORDER.map((cat) => {
            const group = FEATURES.filter((f) => f.badge === cat);
            return (
              <div key={cat} className="space-y-2.5">
                <h3 className={cn("text-xs font-bold uppercase tracking-widest", CATEGORY_COLORS[cat])}>
                  {cat}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {group.map((feat) => (
                    <FeatureCard key={feat.title} feat={feat} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Footer tip */}
          <p className="text-[11px] text-muted-foreground/70 text-center pt-1 border-t">
            No sign-up, no limits. Audio &amp; video stay in your browser; documents are processed
            and discarded in seconds — never stored.
          </p>
        </div>
      )}
    </div>
  );
}

function FeatureCard({ feat }: { feat: Feature }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border bg-background hover:border-border/80 hover:shadow-sm transition-all duration-200 overflow-hidden">
      {/* Card header */}
      <div className="flex items-start gap-3 p-3.5">
        <div className={cn("shrink-0 flex h-8 w-8 items-center justify-center rounded-lg", feat.iconBg)}>
          <feat.icon className={cn("h-4 w-4", feat.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className="text-xs font-semibold leading-snug">{feat.title}</span>
            <span className={cn("inline-flex items-center px-1.5 py-px rounded text-[9px] font-semibold border", feat.badgeColor)}>
              {feat.badge}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{feat.benefit}</p>
        </div>
      </div>

      {/* How-to toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between border-t px-3.5 py-2 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
      >
        How to use
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded && (
        <ol className="border-t bg-muted/10 px-3.5 py-2.5 space-y-1.5">
          {feat.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
