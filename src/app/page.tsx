import { ConverterWorkspace } from "@/components/ConverterWorkspace";
import { FormatMatrix } from "@/components/FormatMatrix";
import { FileJson, FileText, Layers, Sparkles, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: Layers,
    title: "Professional Reports",
    description:
      "Markdown → DOCX & PDF with auto Table of Contents, cover page, running headers, footers, and page numbering.",
    color: "text-blue-500",
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    border: "group-hover:border-blue-500/30",
  },
  {
    icon: FileJson,
    title: "SQL Dialect Converter",
    description:
      "Bidirectional conversion between MS SQL Server, MySQL/MariaDB, and PostgreSQL with data type & function mapping.",
    color: "text-violet-500",
    bg: "bg-violet-500/10 dark:bg-violet-500/15",
    border: "group-hover:border-violet-500/30",
  },
  {
    icon: FileText,
    title: "Hi-Res Mermaid Diagrams",
    description:
      "Render flowcharts, sequence, and ER diagrams as 3× high-resolution PNG, embedded in DOCX and PDF output.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    border: "group-hover:border-emerald-500/30",
  },
];

const STATS = [
  { value: "14", label: "File formats" },
  { value: "30+", label: "Conversions" },
  { value: "100%", label: "Local — no uploads" },
  { value: "0", label: "API keys needed" },
];

export default function HomePage() {
  return (
    <div className="container max-w-5xl py-10 space-y-16">

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative text-center space-y-7 pt-4 overflow-hidden">
        {/* Subtle grid backdrop */}
        <div className="pointer-events-none absolute inset-x-0 -top-10 h-64 bg-grid-pattern [mask-image:linear-gradient(to_bottom,white_0%,transparent_100%)] opacity-60" />

        {/* Open-source badge */}
        <div className="animate-fade-in inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-semibold tracking-wide">
          <Sparkles className="h-3.5 w-3.5" />
          Open-source · 100 % local · Privacy-first
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up font-display relative text-5xl font-extrabold tracking-tight leading-[1.1] sm:text-6xl lg:text-7xl">
          Convert any file,{" "}
          <span className="text-gradient">instantly</span>
        </h1>

        {/* Subheadline */}
        <p
          className="animate-fade-up text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed"
          style={{ animationDelay: "80ms" }}
        >
          Drag and drop Markdown, DOCX, HTML, Mermaid diagrams, JSON, CSV, images, or SQL files.
          Choose a format, hit Convert, download the result - no sign-up, no uploads.
        </p>

        {/* Stats row */}
        <div
          className="animate-fade-up flex flex-wrap items-center justify-center gap-x-10 gap-y-4 pt-2"
          style={{ animationDelay: "160ms" }}
        >
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center min-w-[72px]">
              <div className="font-display text-2xl font-bold text-gradient">{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature highlights ───────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="animate-fade-up group card-hover rounded-2xl border bg-card p-5 space-y-3 transition-colors duration-200"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${f.bg} transition-transform duration-200 group-hover:scale-110`}>
              <f.icon className={`h-5 w-5 ${f.color}`} />
            </div>
            <h3 className="font-semibold text-sm leading-snug">{f.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
          </div>
        ))}
      </section>

      {/* ── Main workspace ───────────────────────────────────────────── */}
      <section
        className="animate-fade-up"
        style={{ animationDelay: "120ms" }}
      >
        <ConverterWorkspace />
      </section>

      {/* ── Format matrix ────────────────────────────────────────────── */}
      <section
        className="animate-fade-up space-y-5"
        style={{ animationDelay: "180ms" }}
      >
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Supported formats
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
        <FormatMatrix />
      </section>

    </div>
  );
}
