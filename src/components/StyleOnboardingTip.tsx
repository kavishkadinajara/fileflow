"use client";

import { Palette, X } from "lucide-react";
import { useEffect, useState } from "react";

const TIP_KEY = "fileflow-style-tip-dismissed";

export function StyleOnboardingTip() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(TIP_KEY)) setVisible(true);
    } catch { /* storage unavailable */ }
  }, []);

  function dismiss() {
    try { localStorage.setItem(TIP_KEY, "1"); } catch { /* ignore */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="animate-fade-up flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Palette className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground leading-snug">
          Style your Markdown → DOCX/PDF/HTML output
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
          Upload or paste a <span className="font-medium">.md</span> file, pick{" "}
          <span className="font-medium">DOCX</span> or <span className="font-medium">PDF</span>{" "}
          as output, then choose <span className="font-medium">Template</span> or{" "}
          <span className="font-medium">Custom</span> style in the Document Style panel.
          Press <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 text-[9px] font-mono">G</kbd> to browse 13 built-in styles.
        </p>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss tip"
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
