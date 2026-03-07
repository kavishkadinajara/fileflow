"use client";

import { cn } from "@/lib/utils";
import { FORMAT_META, SUPPORTED_CONVERSIONS } from "@/lib/formats";

type CategoryKey = "document" | "diagram" | "data" | "sql" | "image";

const CATEGORY_META: Record<CategoryKey, { icon: string; label: string; accent: string; badgeColor: string }> = {
  document: {
    icon: "📄",
    label: "Documents",
    accent: "hover:border-blue-500/40",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  diagram: {
    icon: "📊",
    label: "Diagrams",
    accent: "hover:border-violet-500/40",
    badgeColor: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  },
  data: {
    icon: "🗃️",
    label: "Data",
    accent: "hover:border-emerald-500/40",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  sql: {
    icon: "🛢️",
    label: "SQL Dialects",
    accent: "hover:border-cyan-500/40",
    badgeColor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  },
  image: {
    icon: "🖼️",
    label: "Images",
    accent: "hover:border-pink-500/40",
    badgeColor: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
  },
};

const CATEGORY_ORDER: CategoryKey[] = ["document", "diagram", "data", "sql", "image"];

export function FormatMatrix() {
  const formats = Object.entries(FORMAT_META);
  const grouped = formats.reduce<Record<string, typeof formats>>((acc, entry) => {
    const cat = entry[1].category;
    (acc[cat] ??= []).push(entry);
    return acc;
  }, {});

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {CATEGORY_ORDER.map((cat, ci) => {
        const entries  = grouped[cat] ?? [];
        const meta     = CATEGORY_META[cat];
        if (entries.length === 0) return null;
        return (
          <div
            key={cat}
            className={cn(
              "animate-fade-up card-hover rounded-2xl border bg-card p-4 transition-colors duration-200",
              meta.accent
            )}
            style={{ animationDelay: `${ci * 60}ms` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">{meta.icon}</span>
              <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">{meta.label}</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {entries.map(([key, fmeta]) => {
                const outputCount = SUPPORTED_CONVERSIONS.filter((p) => p.from === key).length;
                return (
                  <div
                    key={key}
                    title={`${fmeta.label}: converts to ${outputCount} format${outputCount !== 1 ? "s" : ""}`}
                    className="inline-block"
                  >
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border cursor-default transition-transform duration-150 hover:scale-105",
                        meta.badgeColor
                      )}
                    >
                      {fmeta.label}
                      {outputCount > 0 && (
                        <span className="opacity-60">→{outputCount}</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
