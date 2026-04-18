import { ConverterWorkspace } from "@/components/ConverterWorkspace";
import { FeatureShowcase } from "@/components/FeatureShowcase";
import { FormatMatrix } from "@/components/FormatMatrix";
import {
  ArrowRight, Brain, Check, Code2, FileJson, FileText,
  Layers, Lock, Sparkles, Star, X, Zap,
} from "lucide-react";
import Link from "next/link";

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
  { value: "27+", label: "File formats" },
  { value: "80+", label: "Conversions" },
  { value: "100%", label: "Free — always" },
  { value: "0", label: "Account needed" },
];

const WHY_US = [
  {
    icon: Lock,
    title: "Privacy-First",
    desc: "Audio & video files never leave your browser. Documents are processed and immediately discarded — never stored.",
    accent: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    icon: Zap,
    title: "100% Free, No Limits",
    desc: "No daily caps, no file count limits, no subscription tiers, no ads. Free forever, open-source.",
    accent: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    icon: Brain,
    title: "AI-Powered Built-In",
    desc: "Multi-layer AI content detection (statistical + Llama 4) and a text humanizer — built right in, no extra tools needed.",
    accent: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    icon: Code2,
    title: "Open Source · MIT",
    desc: "Fully open-source on GitHub. Inspect the code, self-host it, contribute features, or fork it freely.",
    accent: "text-blue-500",
    bg: "bg-blue-500/10",
  },
];

type CompRow = { feature: string; us: string | boolean; cc: string | boolean; zamzar: string | boolean; ilovepdf: string | boolean };

const COMPARISON: CompRow[] = [
  { feature: "Completely free", us: true, cc: "25/day", zamzar: "2 files/day", ilovepdf: false },
  { feature: "No registration required", us: true, cc: false, zamzar: false, ilovepdf: true },
  { feature: "Audio/Video conversion", us: "Browser-only", cc: "Server", zamzar: false, ilovepdf: false },
  { feature: "Video compression", us: true, cc: true, zamzar: false, ilovepdf: false },
  { feature: "Files stay on device (A/V)", us: true, cc: false, zamzar: false, ilovepdf: false },
  { feature: "AI content detection", us: true, cc: false, zamzar: false, ilovepdf: false },
  { feature: "AI text humanizer", us: true, cc: false, zamzar: false, ilovepdf: false },
  { feature: "Mermaid diagram rendering", us: true, cc: false, zamzar: false, ilovepdf: false },
  { feature: "SQL dialect conversion", us: true, cc: false, zamzar: false, ilovepdf: false },
  { feature: "Full text editor + templates", us: true, cc: false, zamzar: false, ilovepdf: false },
  { feature: "Open source", us: true, cc: false, zamzar: false, ilovepdf: false },
];

function CellValue({ val }: { val: string | boolean }) {
  if (val === true) return <Check className="h-4 w-4 text-green-500 mx-auto" aria-label="Yes" />;
  if (val === false) return <X className="h-4 w-4 text-muted-foreground/40 mx-auto" aria-label="No" />;
  return <span className="text-xs text-muted-foreground">{val}</span>;
}

export default function HomePage() {
  return (
    <div className="container max-w-5xl py-10 space-y-20">

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative text-center space-y-7 pt-4 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 -top-10 h-64 bg-grid-pattern [mask-image:linear-gradient(to_bottom,white_0%,transparent_100%)] opacity-60" />

        <div className="animate-fade-in inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-semibold tracking-wide">
          <Sparkles className="h-3.5 w-3.5" />
          Open-source · 100% local for A/V · Privacy-first · Always free
        </div>

        <h1 className="animate-fade-up font-display relative text-5xl font-extrabold tracking-tight leading-[1.1] sm:text-6xl lg:text-7xl">
          Convert any file,{" "}
          <span className="text-gradient">instantly</span>
        </h1>

        <p className="animate-fade-up text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed" style={{ animationDelay: "80ms" }}>
          Drag and drop Markdown, DOCX, HTML, Mermaid diagrams, JSON, CSV, images, SQL files,
          audio, or video. Choose a format, hit Convert, download the result — no sign-up, no uploads.
        </p>

        <div className="animate-fade-up flex flex-wrap items-center justify-center gap-x-10 gap-y-4 pt-2" style={{ animationDelay: "160ms" }}>
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center min-w-[72px]">
              <div className="font-display text-2xl font-bold text-gradient">{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        <div className="animate-fade-up flex flex-wrap items-center justify-center gap-3 pt-2" style={{ animationDelay: "200ms" }}>
          <a
            href="#converter-workspace"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-brand text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
          >
            Start Converting
            <ArrowRight className="h-4 w-4" />
          </a>
          <Link
            href="/guide"
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border bg-card text-sm font-medium hover:bg-muted transition-colors"
          >
            View Guide
          </Link>
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

      {/* ── Why FileFlowOne ───────────────────────────────────────────── */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
            <Star className="h-3 w-3" />
            Why FileFlowOne?
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight">
            Built different — by design
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Most converters upload your files to their servers, limit your usage, and charge for features.
            FileFlowOne does none of that.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {WHY_US.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="group card-hover rounded-2xl border bg-card p-5 flex gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.bg} transition-transform duration-200 group-hover:scale-110`}>
                  <Icon className={`h-5 w-5 ${item.accent}`} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── What's New — Feature Showcase ────────────────────────────── */}
      <section className="animate-fade-up" style={{ animationDelay: "100ms" }}>
        <FeatureShowcase />
      </section>

      {/* ── Main workspace ───────────────────────────────────────────── */}
      <section id="converter-workspace" className="animate-fade-up scroll-mt-20" style={{ animationDelay: "120ms" }}>
        <ConverterWorkspace />
      </section>

      {/* ── Format matrix ────────────────────────────────────────────── */}
      <section className="animate-fade-up space-y-5" style={{ animationDelay: "180ms" }}>
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

      {/* ── Competitor comparison ─────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="font-display text-3xl font-bold tracking-tight">Compare</h2>
          <p className="text-muted-foreground text-sm">See how FileFlowOne stacks up against other popular converters.</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide w-[38%]">Feature</th>
                <th className="px-4 py-3 text-center font-semibold text-xs">
                  <span className="text-gradient font-bold">FileFlowOne</span>
                  <span className="ml-1 text-[10px] text-primary font-normal">(you)</span>
                </th>
                <th className="px-4 py-3 text-center font-medium text-xs text-muted-foreground">CloudConvert</th>
                <th className="px-4 py-3 text-center font-medium text-xs text-muted-foreground">Zamzar</th>
                <th className="px-4 py-3 text-center font-medium text-xs text-muted-foreground">iLovePDF</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={row.feature} className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                  <td className="px-4 py-3 text-xs font-medium">{row.feature}</td>
                  <td className="px-4 py-3 text-center">
                    <CellValue val={row.us} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <CellValue val={row.cc} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <CellValue val={row.zamzar} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <CellValue val={row.ilovepdf} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground text-center">
          Comparison based on publicly available information as of March 2026. Competitor features may change.
        </p>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-card p-10 text-center space-y-5">
        <div className="text-4xl">⚡</div>
        <h2 className="font-display text-3xl font-bold tracking-tight">
          Ready to convert?
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          No sign-up. No upload limits. No credit card. Just drop your file and go.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href="#converter-workspace"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-brand text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
          >
            Start Converting Free
            <ArrowRight className="h-4 w-4" />
          </a>
          <Link
            href="/guide"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border bg-card font-medium hover:bg-muted transition-colors"
          >
            Read the Guide
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Open-source · MIT License ·{" "}
          <a href="https://github.com/kavishkadinajara/fileflow" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors underline underline-offset-2">
            Contribute on GitHub
          </a>
        </p>
      </section>

    </div>
  );
}
