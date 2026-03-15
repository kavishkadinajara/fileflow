"use client";

import mermaid from "mermaid";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

interface MermaidPreviewProps {
  content: string;
}

let renderCounter = 0;

export function MermaidPreview({ content }: MermaidPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!content.trim() || !containerRef.current) return;

    const mermaidTheme = resolvedTheme === "dark" ? "dark" : "default";
    mermaid.initialize({
      startOnLoad: false,
      theme: mermaidTheme,
      securityLevel: "loose",
    });

    renderCounter++;
    const id = `mermaid-preview-${Date.now()}-${renderCounter}`;

    mermaid
      .render(id, content.trim())
      .then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      })
      .catch((err) => {
        setError(err?.message || "Invalid Mermaid syntax");
        // Clean up any leftover error DOM elements mermaid might create
        const errorElem = document.getElementById(`d${id}`);
        if (errorElem) errorElem.remove();
      });
  }, [content, resolvedTheme]);

  if (error) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
        <pre className="text-xs whitespace-pre-wrap break-words font-mono text-muted-foreground bg-muted/50 rounded-lg p-3 border">
          {content}
        </pre>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center rounded-lg border bg-white dark:bg-white/5 p-4">
      <div ref={containerRef} className="mermaid-rendered max-w-full overflow-x-auto" />
    </div>
  );
}
