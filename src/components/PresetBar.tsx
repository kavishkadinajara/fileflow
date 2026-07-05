"use client";

/**
 * PresetBar — save & apply conversion presets for the current from→to pair.
 *
 * A preset bundles a named set of ConvertOptions for one format pair, so a user
 * can re-apply a configured conversion in one click. Renders nothing when cloud
 * sync is off or the user is signed out (presets require an account).
 */
import { Button } from "@/components/ui/button";
import {
  type ConversionPreset,
  savePreset,
  listPresets,
  deletePreset,
  bumpUseCount,
} from "@/lib/supabase/presets";
import { isCloudEnabled } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";
import type { ConvertOptions, FileFormat } from "@/types";
import { Bookmark, Check, Loader2, Star, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface PresetBarProps {
  fromFormat: FileFormat;
  toFormat: FileFormat | "";
  options: ConvertOptions;
  /** Apply a saved preset's options back into the parent config. */
  onApply: (options: ConvertOptions) => void;
}

export function PresetBar({ fromFormat, toFormat, options, onApply }: PresetBarProps) {
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);
  const [presets, setPresets] = useState<ConversionPreset[]>([]);
  const [saving, setSaving] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setPresets([]); return; }
    try { setPresets(await listPresets()); } catch { /* ignore */ }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  if (!isCloudEnabled() || !ready || !user || !toFormat) return null;

  // Presets relevant to the current conversion pair.
  const matching = presets.filter((p) => p.from_format === fromFormat && p.to_format === toFormat);

  async function handleSave() {
    if (!name.trim() || !toFormat) return;
    setSaving(true);
    try {
      await savePreset({
        name: name.trim(),
        fromFormat,
        toFormat,
        options,
        isDefault: matching.length === 0, // first preset for a pair becomes default
      });
      setName("");
      setNaming(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      await load();
    } catch { /* surfaced by disabled state */ } finally {
      setSaving(false);
    }
  }

  async function handleApply(p: ConversionPreset) {
    onApply(p.options);
    void bumpUseCount(p.id);
  }

  async function handleDelete(id: string) {
    await deletePreset(id);
    await load();
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
          <Bookmark className="h-3 w-3" /> Presets
        </span>
        {!naming && (
          <button
            onClick={() => setNaming(true)}
            className="text-[11px] text-primary hover:underline"
          >
            {justSaved ? <span className="text-emerald-500 flex items-center gap-1"><Check className="h-3 w-3" />Saved</span> : "+ Save current"}
          </button>
        )}
      </div>

      {/* Saved presets for this pair */}
      {matching.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {matching.map((p) => (
            <span key={p.id} className="group inline-flex items-center gap-1 rounded-full border bg-background pl-2 pr-1 py-0.5 text-[11px]">
              <button onClick={() => handleApply(p)} className="flex items-center gap-1 hover:text-primary" title="Apply preset">
                {p.is_default && <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />}
                {p.name}
              </button>
              <button onClick={() => handleDelete(p.id)} className="text-muted-foreground hover:text-rose-500" aria-label="Delete preset">
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Name + save input */}
      {naming && (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleSave(); if (e.key === "Escape") { setNaming(false); setName(""); } }}
            placeholder="Preset name…"
            maxLength={80}
            className="flex-1 rounded border bg-background px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <Button size="sm" className="h-6 px-2 text-[11px]" disabled={!name.trim() || saving} onClick={handleSave}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}
