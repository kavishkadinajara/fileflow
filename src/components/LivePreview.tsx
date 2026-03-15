"use client";

import { Badge } from "@/components/ui/badge";
import { FORMAT_META } from "@/lib/formats";
import { configureMarked } from "@/lib/marked-config";
import { cn } from "@/lib/utils";
import type { FileFormat } from "@/types";
import hljs from "highlight.js";
import { BookOpen, Eye, FileText, FileWarning, Hash } from "lucide-react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";

// Lazy-load MermaidPreview (large bundle, client-only)
const MermaidPreview = dynamic(
  () => import("./MermaidPreview").then((m) => ({ default: m.MermaidPreview })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-40 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
        Loading diagram...
      </div>
    ),
  }
);

// Configure marked for client-side use (idempotent)
const markedInstance = configureMarked();

interface LivePreviewProps {
  content: string;
  format: FileFormat | undefined;
  className?: string;
}

export function LivePreview({ content, format, className }: LivePreviewProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card overflow-hidden flex flex-col animate-slide-left",
        className
      )}
    >
      {/* Header bar */}
      <div className="flex items-center gap-2 border-b px-4 py-2.5 bg-muted/20">
        <Eye className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Live Preview
        </span>
        {format && (
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {FORMAT_META[format]?.label ?? format.toUpperCase()}
          </Badge>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto p-4 min-h-[300px] max-h-[600px]">
        {content.trim() ? (
          <PreviewContent content={content} format={format} />
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Stats bar */}
      {content.trim() && (format === "md" || format === "html" || format === "txt") && (
        <PreviewStats content={content} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[260px] text-center gap-3 text-muted-foreground/50">
      <Eye className="h-10 w-10" />
      <div className="space-y-1">
        <p className="text-sm font-medium">No content to preview</p>
        <p className="text-xs">Upload a file or start typing to see the live preview</p>
      </div>
    </div>
  );
}

function PreviewContent({ content, format }: { content: string; format: FileFormat | undefined }) {
  switch (format) {
    case "md":
      return <MarkdownPreview content={content} />;
    case "html":
      return <HtmlPreview content={content} />;
    case "json":
      return <CodePreview content={content} language="json" />;
    case "yaml":
      return <CodePreview content={content} language="yaml" />;
    case "csv":
      return <CsvPreview content={content} />;
    case "mssql":
    case "mysql":
    case "pgsql":
      return <CodePreview content={content} language="sql" />;
    case "mermaid":
      return <MermaidPreview content={content} />;
    case "svg":
      return <SvgPreview content={content} />;
    case "txt":
      return <PlainTextPreview content={content} />;
    default:
      return <FallbackPreview format={format} />;
  }
}

// ─── Format-specific preview renderers (exported for reuse by OutputPreview) ─

export function MarkdownPreview({ content }: { content: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState("");
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;
    const result = markedInstance.parse(content);
    if (result instanceof Promise) {
      result.then((r) => { if (!cancelled) setHtml(r); });
    } else {
      setHtml(result);
    }
    return () => { cancelled = true; };
  }, [content]);

  // Post-process: render ```mermaid fenced blocks within markdown
  useEffect(() => {
    if (!containerRef.current || !html) return;

    const codeBlocks = containerRef.current.querySelectorAll("code.hljs.language-mermaid, code.language-mermaid");
    if (codeBlocks.length === 0) return;

    import("mermaid").then((mod) => {
      const mermaidLib = mod.default;
      const mermaidTheme = resolvedTheme === "dark" ? "dark" : "default";
      mermaidLib.initialize({ startOnLoad: false, theme: mermaidTheme, securityLevel: "loose" });

      codeBlocks.forEach((block, i) => {
        const code = block.textContent || "";
        const wrapper = block.closest("pre");
        if (!wrapper || !code.trim()) return;

        const id = `md-mermaid-${Date.now()}-${i}`;
        mermaidLib
          .render(id, code.trim())
          .then(({ svg }) => {
            const div = document.createElement("div");
            div.className = "mermaid-rendered flex justify-center my-3 rounded-lg border bg-white dark:bg-white/5 p-4";
            div.innerHTML = svg;
            wrapper.replaceWith(div);
          })
          .catch(() => {
            // Leave as code block on error
          });
      });
    });
  }, [html, resolvedTheme]);

  return (
    <div
      ref={containerRef}
      className="md-preview text-sm"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function HtmlPreview({ content }: { content: string }) {
  return (
    <iframe
      srcDoc={content}
      sandbox="allow-same-origin"
      className="w-full min-h-[280px] rounded-lg border bg-white"
      title="HTML Preview"
    />
  );
}

export function CodePreview({ content, language }: { content: string; language: string }) {
  const highlighted = useMemo(() => {
    const lang = hljs.getLanguage(language) ? language : "plaintext";
    return hljs.highlight(content.slice(0, 50000), { language: lang }).value;
  }, [content, language]);

  return (
    <div className="preview-code">
      <pre>
        <code
          className={`hljs language-${language}`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  );
}

export function CsvPreview({ content }: { content: string }) {
  const table = useMemo(() => {
    const lines = content.trim().split("\n").slice(0, 30);
    return lines.map((line) =>
      line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
    );
  }, [content]);

  if (table.length === 0) return <PlainTextPreview content={content} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {table[0].map((cell, i) => (
              <th
                key={i}
                className="bg-muted px-3 py-2 text-left text-xs font-semibold border border-border"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.slice(1).map((row, rIdx) => (
            <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-muted/20" : ""}>
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-3 py-2 text-xs border border-border">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {content.trim().split("\n").length > 30 && (
        <p className="text-xs text-muted-foreground mt-2 italic">
          Showing first 30 rows...
        </p>
      )}
    </div>
  );
}

export function SvgPreview({ content }: { content: string }) {
  if (!content.trim().startsWith("<svg") && !content.trim().startsWith("<?xml")) {
    return <CodePreview content={content} language="xml" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex items-center justify-center rounded-lg border bg-white dark:bg-white/5 p-4"
        dangerouslySetInnerHTML={{ __html: content }}
      />
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
          View source
        </summary>
        <CodePreview content={content} language="xml" />
      </details>
    </div>
  );
}

export function PlainTextPreview({ content }: { content: string }) {
  return (
    <pre className="text-sm whitespace-pre-wrap break-words leading-relaxed font-mono text-foreground/80">
      {content.slice(0, 50000)}
      {content.length > 50000 && (
        <span className="text-muted-foreground italic">
          {"\n\n"}... content truncated for preview
        </span>
      )}
    </pre>
  );
}

function FallbackPreview({ format }: { format: FileFormat | undefined }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[260px] text-center gap-3 text-muted-foreground/50">
      <FileWarning className="h-10 w-10" />
      <div className="space-y-1">
        <p className="text-sm font-medium">
          Preview not available{format ? ` for ${format.toUpperCase()}` : ""}
        </p>
        <p className="text-xs">Binary formats cannot be previewed inline</p>
      </div>
    </div>
  );
}

function getReadabilityLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: "Very Easy", color: "text-green-600 dark:text-green-400" };
  if (score >= 80) return { label: "Easy", color: "text-emerald-600 dark:text-emerald-400" };
  if (score >= 70) return { label: "Fairly Easy", color: "text-teal-600 dark:text-teal-400" };
  if (score >= 60) return { label: "Standard", color: "text-blue-600 dark:text-blue-400" };
  if (score >= 50) return { label: "Fairly Hard", color: "text-amber-600 dark:text-amber-400" };
  if (score >= 30) return { label: "Hard", color: "text-orange-600 dark:text-orange-400" };
  return { label: "Very Hard", color: "text-red-600 dark:text-red-400" };
}

function PreviewStats({ content }: { content: string }) {
  const stats = useMemo(() => {
    const stripped = content.replace(/<[^>]*>/g, " ").replace(/#+\s/g, "").trim();
    const words = stripped.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const readTimeMin = Math.max(1, Math.round(wordCount / 200));
    const charCount = content.length;
    const lineCount = content.split("\n").length;

    // Flesch-Kincaid readability
    const sentences = stripped.split(/[.!?]+/).filter((s) => s.trim().length > 3);
    const sentenceCount = Math.max(1, sentences.length);
    let totalSyllables = 0;
    for (const w of words) {
      const clean = w.toLowerCase().replace(/[^a-z]/g, "");
      if (clean.length <= 3) { totalSyllables += 1; continue; }
      const match = clean.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
      totalSyllables += match ? match.length : 1;
    }
    const readability = wordCount > 0
      ? Math.round(206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (totalSyllables / wordCount))
      : 0;

    return { wordCount, readTimeMin, charCount, lineCount, readability };
  }, [content]);

  const { label: readLabel, color: readColor } = getReadabilityLabel(stats.readability);

  return (
    <div className="flex items-center gap-4 border-t px-4 py-2 bg-muted/10 overflow-x-auto scrollbar-hide">
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
        <FileText className="h-3 w-3" />
        {stats.wordCount.toLocaleString()} words
      </span>
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
        <BookOpen className="h-3 w-3" />
        ~{stats.readTimeMin} min read
      </span>
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
        <Hash className="h-3 w-3" />
        {stats.charCount.toLocaleString()} chars
      </span>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
        {stats.lineCount.toLocaleString()} {stats.lineCount === 1 ? "line" : "lines"}
      </span>
      {stats.wordCount > 20 && (
        <span className={cn("text-[10px] font-medium whitespace-nowrap", readColor)}>
          {readLabel} ({stats.readability})
        </span>
      )}
    </div>
  );
}
