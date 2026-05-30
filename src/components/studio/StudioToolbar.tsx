"use client";

import { SaveToCloudDialog } from "@/components/auth/SaveToCloudDialog";
import { Button } from "@/components/ui/button";
import { isCloudEnabled } from "@/lib/supabase/client";
import { useStudioStore } from "@/store/studioStore";
import type { StyleConfig } from "@/types/style";
import { ArrowLeft, Check, Cloud, Download, RotateCcw, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  style: StyleConfig;
  onNameChange: (name: string) => void;
  onReset: () => void;
}

export function StudioToolbar({ style, onNameChange, onReset }: Props) {
  const router = useRouter();
  const saveCustom = useStudioStore((s) => s.saveCustom);
  const [justSaved, setJustSaved] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);

  function handleSave() {
    saveCustom(style);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  }

  function handleSaveAndApply() {
    saveCustom(style);
    router.push("/?customStyle=applied#converter-workspace");
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(style, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = style.name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
    a.href = url;
    a.download = `${safeName || "custom-style"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
      <div className="px-4 py-2.5 flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>

        <div className="h-5 w-px bg-border" />

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold shrink-0">
            Style Name
          </span>
          <input
            type="text"
            value={style.name}
            onChange={(e) => onNameChange(e.target.value)}
            className="flex-1 max-w-sm px-2 py-1 text-sm bg-transparent border-0 border-b border-transparent hover:border-input focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          title="Reset to original template"
          className="h-8 gap-1.5 text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleExport}
          title="Download style as JSON"
          className="h-8 gap-1.5 text-xs"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          className="h-8 gap-1.5 text-xs"
        >
          {justSaved ? (
            <><Check className="h-3.5 w-3.5 text-emerald-500" /> Saved</>
          ) : (
            <><Save className="h-3.5 w-3.5" /> Save</>
          )}
        </Button>

        {isCloudEnabled() && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCloudOpen(true)}
            title="Save to your cloud account"
            className="h-8 gap-1.5 text-xs"
          >
            <Cloud className="h-3.5 w-3.5" /> Cloud
          </Button>
        )}

        <Button
          size="sm"
          onClick={handleSaveAndApply}
          className="h-8 gap-1.5 text-xs bg-gradient-brand hover:opacity-90 text-white border-0"
        >
          Save & Apply →
        </Button>
      </div>

      <SaveToCloudDialog open={cloudOpen} onOpenChange={setCloudOpen} style={style} />
    </div>
  );
}
