"use client";

import type { StyleConfig } from "@/types/style";
import { ColorInput, useNestedSetter } from "../controls";

interface Props {
  style: StyleConfig;
  onChange: (s: StyleConfig) => void;
}

// Curated palette presets — one-click brand themes
const PRESETS = [
  { name: "Classic Blue",    primary: "#1E40AF", secondary: "#3B82F6", surface: "#EFF6FF" },
  { name: "Emerald",         primary: "#059669", secondary: "#10B981", surface: "#ECFDF5" },
  { name: "Royal Purple",    primary: "#7C3AED", secondary: "#A78BFA", surface: "#F5F3FF" },
  { name: "Sunset Orange",   primary: "#EA580C", secondary: "#FB923C", surface: "#FFF7ED" },
  { name: "Crimson",         primary: "#DC2626", secondary: "#EF4444", surface: "#FEF2F2" },
  { name: "Slate Mono",      primary: "#0F172A", secondary: "#475569", surface: "#F8FAFC" },
];

export function ColorsSection({ style, onChange }: Props) {
  const set = useNestedSetter(style, onChange);

  function applyPreset(p: typeof PRESETS[number]) {
    onChange({
      ...style,
      colors: {
        ...style.colors,
        primary: p.primary,
        secondary: p.secondary,
        surface: p.surface,
        link: p.primary,
      },
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
          Quick Palettes
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              title={p.name}
              className="flex flex-col items-center gap-0.5 p-1.5 rounded border border-input hover:border-primary/50 hover:bg-muted/50 transition-all"
            >
              <div className="flex gap-0.5 h-4">
                <div className="w-3 rounded-sm" style={{ background: p.primary }} />
                <div className="w-3 rounded-sm" style={{ background: p.secondary }} />
                <div className="w-3 rounded-sm border border-border" style={{ background: p.surface }} />
              </div>
              <span className="text-[9px] text-muted-foreground leading-none">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ColorInput label="Primary"    value={style.colors.primary}    onChange={(v) => set("colors.primary", v)} />
        <ColorInput label="Secondary"  value={style.colors.secondary}  onChange={(v) => set("colors.secondary", v)} />
        <ColorInput label="Text"       value={style.colors.text}       onChange={(v) => set("colors.text", v)} />
        <ColorInput label="Muted"      value={style.colors.muted}      onChange={(v) => set("colors.muted", v)} />
        <ColorInput label="Background" value={style.colors.background} onChange={(v) => set("colors.background", v)} />
        <ColorInput label="Surface"    value={style.colors.surface}    onChange={(v) => set("colors.surface", v)} />
        <ColorInput label="Link"       value={style.colors.link}       onChange={(v) => set("colors.link", v)} />
        <ColorInput label="Border"     value={style.colors.border}     onChange={(v) => set("colors.border", v)} />
      </div>
    </div>
  );
}
