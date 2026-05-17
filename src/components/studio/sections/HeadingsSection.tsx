"use client";

import type { HeadingConfig, StyleConfig, TextAlign } from "@/types/style";
import { ColorInput, NumberInput, Row, SelectInput, SwitchInput, useNestedSetter } from "../controls";
import { useState } from "react";

interface Props {
  style: StyleConfig;
  onChange: (s: StyleConfig) => void;
}

const LEVELS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;
type Level = typeof LEVELS[number];

const DECORATIONS = [
  { value: "none"            as const, label: "None" },
  { value: "underline-bar"   as const, label: "Underline bar" },
  { value: "side-bar"        as const, label: "Side bar" },
  { value: "background-fill" as const, label: "Background fill" },
];

const ALIGNS: { value: TextAlign; label: string }[] = [
  { value: "left",    label: "Left" },
  { value: "center",  label: "Center" },
  { value: "right",   label: "Right" },
];

const TEXT_TRANSFORMS = [
  { value: "none"       as const, label: "Normal" },
  { value: "uppercase"  as const, label: "UPPERCASE" },
  { value: "capitalize" as const, label: "Capitalize" },
];

export function HeadingsSection({ style, onChange }: Props) {
  const set = useNestedSetter(style, onChange);
  const [active, setActive] = useState<Level>("h1");
  const h = style.typography[active] as HeadingConfig;

  return (
    <div className="space-y-3">
      {/* Level tabs */}
      <div className="grid grid-cols-6 gap-1">
        {LEVELS.map((lv) => (
          <button
            key={lv}
            onClick={() => setActive(lv)}
            className={`py-1.5 text-[11px] font-semibold rounded transition-colors ${
              active === lv
                ? "bg-primary text-primary-foreground"
                : "bg-background border border-input hover:bg-muted"
            }`}
          >
            {lv.toUpperCase()}
          </button>
        ))}
      </div>

      <Row>
        <NumberInput label="Size" value={h.size} onChange={(v) => set(`typography.${active}.size`, v)} min={8} max={72} step={0.5} unit="pt" />
        <ColorInput label="Color" value={h.color} onChange={(v) => set(`typography.${active}.color`, v)} />
      </Row>

      <Row>
        <NumberInput label="Margin Top"    value={h.marginTop}    onChange={(v) => set(`typography.${active}.marginTop`, v)}    min={0} max={100} unit="pt" />
        <NumberInput label="Margin Bottom" value={h.marginBottom} onChange={(v) => set(`typography.${active}.marginBottom`, v)} min={0} max={50}  unit="pt" />
      </Row>

      <Row>
        <SelectInput label="Align" value={(h.align ?? "left") as TextAlign} onChange={(v) => set(`typography.${active}.align`, v)} options={ALIGNS} />
        <SelectInput
          label="Transform"
          value={(h.textTransform ?? "none") as "none" | "uppercase" | "capitalize"}
          onChange={(v) => set(`typography.${active}.textTransform`, v === "none" ? undefined : v)}
          options={TEXT_TRANSFORMS}
        />
      </Row>

      <SelectInput
        label="Decoration"
        value={(h.decoration ?? "none") as "none" | "underline-bar" | "side-bar" | "background-fill"}
        onChange={(v) => set(`typography.${active}.decoration`, v)}
        options={DECORATIONS}
      />

      <SwitchInput
        label="Page break before this heading"
        value={h.pageBreakBefore ?? false}
        onChange={(v) => set(`typography.${active}.pageBreakBefore`, v)}
      />

      {/* Border bottom toggle */}
      <div className="border-t border-border/40 pt-2">
        <SwitchInput
          label="Border bottom"
          value={!!h.borderBottom}
          onChange={(v) =>
            set(`typography.${active}.borderBottom`,
              v ? { width: 2, style: "solid", color: style.colors.primary } : undefined)
          }
        />
        {h.borderBottom && (
          <Row>
            <NumberInput label="Width" value={h.borderBottom.width} onChange={(v) => set(`typography.${active}.borderBottom.width`, v)} min={1} max={10} unit="px" />
            <ColorInput  label="Color" value={h.borderBottom.color} onChange={(v) => set(`typography.${active}.borderBottom.color`, v)} />
          </Row>
        )}
      </div>
    </div>
  );
}
