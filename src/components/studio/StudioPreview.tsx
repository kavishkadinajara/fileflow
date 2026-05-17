"use client";

import { STUDIO_SAMPLE_MD } from "@/lib/styles/sampleContent";
import type { StyleConfig } from "@/types/style";
import { Loader2, Maximize2, Smartphone, Tablet, Monitor } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  style: StyleConfig;
}

type Viewport = "phone" | "tablet" | "desktop";

const VIEWPORT_WIDTHS: Record<Viewport, number> = {
  phone: 360,
  tablet: 760,
  desktop: 1100,
};

export function StudioPreview({ style }: Props) {
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Debounced HTML regeneration whenever style changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileBase64: btoa(unescape(encodeURIComponent(STUDIO_SAMPLE_MD))),
            fileName: "preview.md",
            fromFormat: "md",
            toFormat: "html",
            customStyle: style,
          }),
        });
        const data = await res.json();
        if (data.success) {
          const decoded = decodeURIComponent(
            escape(atob(data.fileBase64))
          );
          setHtml(decoded);
        }
      } catch (e) {
        console.error("Preview failed:", e);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [style]);

  function openInNewTab() {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  return (
    <div className="bg-muted/40 border-l flex flex-col overflow-hidden">
      {/* Preview controls */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-background/60">
        <div className="flex items-center gap-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mr-2">
            Preview
          </span>
          {(["phone", "tablet", "desktop"] as const).map((v) => {
            const Icon = v === "phone" ? Smartphone : v === "tablet" ? Tablet : Monitor;
            return (
              <button
                key={v}
                onClick={() => setViewport(v)}
                title={`${v} (${VIEWPORT_WIDTHS[v]}px)`}
                className={`p-1.5 rounded transition-colors ${
                  viewport === v
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {loading && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Rendering...
            </span>
          )}
          <button
            onClick={openInNewTab}
            title="Open preview in new tab"
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            disabled={!html}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Iframe pane */}
      <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
        <div
          className="bg-white shadow-xl rounded transition-all duration-300"
          style={{
            width: VIEWPORT_WIDTHS[viewport],
            maxWidth: "100%",
            minHeight: 600,
          }}
        >
          <iframe
            ref={iframeRef}
            srcDoc={html || "<p style='font-family:sans-serif;padding:24px;color:#888'>Adjust any setting to see live preview...</p>"}
            title="Live preview"
            className="w-full h-full block border-0 rounded"
            style={{ minHeight: 600, height: 800 }}
          />
        </div>
      </div>
    </div>
  );
}
