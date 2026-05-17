"use client";

/**
 * Style Studio — live visual editor for StyleConfig.
 *
 * Layout:
 *   ┌─ Toolbar (back · template name · reset · save) ───────┐
 *   │  Editor panels (40%)   │   Live preview iframe (60%)  │
 *   │  - Page                │                              │
 *   │  - Colors              │   debounced HTML render      │
 *   │  - Typography          │                              │
 *   │  - Headings            │                              │
 *   │  - Blocks              │                              │
 *   │  - Structure           │                              │
 *   │  - Advanced CSS        │                              │
 *   └────────────────────────┴──────────────────────────────┘
 *
 * Workflow: user lands here from a "Customize" button in ConversionConfig
 * (with optional ?templateId=... seed), tweaks the style, hits "Save & Apply".
 * The saved style lives in studioStore and is then picked up by the converter.
 */
import { StudioToolbar } from "@/components/studio/StudioToolbar";
import { StudioEditor } from "@/components/studio/StudioEditor";
import { StudioPreview } from "@/components/studio/StudioPreview";
import { DEFAULT_STYLE } from "@/lib/styles/defaults";
import { getTemplate } from "@/lib/styles/templates";
import { useStudioStore } from "@/store/studioStore";
import type { StyleConfig } from "@/types/style";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

function StudioPageInner() {
  const params = useSearchParams();
  const seedTemplateId = params.get("templateId");

  const { draft, setDraft, savedCustom } = useStudioStore();

  // Seed the draft once on mount:
  // 1. If ?templateId given, fork that template
  // 2. Else if savedCustom exists, continue editing it
  // 3. Else start from DEFAULT_STYLE
  const initial = useMemo<StyleConfig>(() => {
    if (seedTemplateId) {
      const tpl = getTemplate(seedTemplateId);
      if (tpl) {
        return {
          ...tpl.config,
          mode: "custom",
          name: `My ${tpl.name}`,
          id: undefined,
        };
      }
    }
    if (savedCustom) return savedCustom;
    return { ...DEFAULT_STYLE, mode: "custom", name: "My Custom Style" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedTemplateId]);

  // Local state for the live-editing draft
  const [style, setStyle] = useState<StyleConfig>(draft ?? initial);

  // Sync local edits back to the store (debounced via setTimeout)
  useEffect(() => {
    const t = setTimeout(() => setDraft(style), 200);
    return () => clearTimeout(t);
  }, [style, setDraft]);

  // Allow toolbar to call reset
  function handleReset() {
    setStyle(initial);
    setDraft(initial);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      <StudioToolbar
        style={style}
        onNameChange={(name) => setStyle({ ...style, name })}
        onReset={handleReset}
      />
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[420px_1fr] overflow-hidden">
        <StudioEditor style={style} onChange={setStyle} />
        <StudioPreview style={style} />
      </div>
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading Studio...</div>}>
      <StudioPageInner />
    </Suspense>
  );
}
