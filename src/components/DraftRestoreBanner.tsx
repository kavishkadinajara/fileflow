"use client";

import { Button } from "@/components/ui/button";
import { FORMAT_META } from "@/lib/formats";
import type { FileFormat } from "@/types";
import { Clock, RotateCcw, X } from "lucide-react";

export interface DraftData {
  content: string;
  format: FileFormat;
  savedAt: number; // timestamp
}

interface DraftRestoreBannerProps {
  draft: DraftData;
  onRestore: () => void;
  onDismiss: () => void;
}

export function DraftRestoreBanner({ draft, onRestore, onDismiss }: DraftRestoreBannerProps) {
  const formatLabel = FORMAT_META[draft.format]?.label ?? draft.format.toUpperCase();
  const wordCount = draft.content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = draft.content.length;
  const savedDate = new Date(draft.savedAt);
  const isToday = savedDate.toDateString() === new Date().toDateString();
  const timeStr = savedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = isToday ? `today at ${timeStr}` : savedDate.toLocaleDateString([], { month: "short", day: "numeric" }) + ` at ${timeStr}`;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 dark:bg-amber-500/10 px-4 py-3 animate-fade-up">
      <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
          Unsaved draft found
        </p>
        <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
          <span className="font-medium">{formatLabel}</span>
          {" · "}
          {wordCount.toLocaleString()} words
          {" · "}
          {charCount.toLocaleString()} chars
          {" · "}
          Saved {dateStr}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
          onClick={onRestore}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Restore
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-amber-600/60 hover:text-amber-700 hover:bg-amber-500/10"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
