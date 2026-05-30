"use client";

import type { FontWeight, StyleConfig, TextAlign } from "@/types/style";
import { NumberInput, Row, SelectInput, SwitchInput, useNestedSetter } from "../controls";

interface Props {
  style: StyleConfig;
  onChange: (s: StyleConfig) => void;
}

const FONT_FAMILIES = [
  { value: "'Segoe UI', Calibri, sans-serif",                     label: "Segoe UI" },
  { value: "Calibri, 'Segoe UI', sans-serif",                     label: "Calibri" },
  { value: "Arial, sans-serif",                                   label: "Arial" },
  { value: "'Helvetica Neue', Helvetica, sans-serif",             label: "Helvetica" },
  { value: "'Inter', sans-serif",                                 label: "Inter" },
  { value: "'Roboto', sans-serif",                                label: "Roboto" },
  { value: "'Open Sans', sans-serif",                             label: "Open Sans" },
  { value: "'Times New Roman', Times, serif",                     label: "Times New Roman" },
  { value: "Georgia, serif",                                      label: "Georgia" },
  { value: "'Garamond', 'Georgia', serif",                        label: "Garamond" },
  { value: "'Playfair Display', Georgia, serif",                  label: "Playfair Display" },
  { value: "'Source Serif Pro', 'Georgia', serif",                label: "Source Serif Pro" },
  { value: "'Courier New', Courier, monospace",                   label: "Courier New" },
] as const;

const WEIGHTS: { value: FontWeight; label: string }[] = [
  { value: 300, label: "Light (300)" },
  { value: 400, label: "Regular (400)" },
  { value: 500, label: "Medium (500)" },
  { value: 600, label: "Semibold (600)" },
  { value: 700, label: "Bold (700)" },
  { value: 800, label: "Extra Bold (800)" },
];

const ALIGN_OPTIONS: { value: TextAlign; label: string }[] = [
  { value: "left",    label: "Left" },
  { value: "center",  label: "Center" },
  { value: "right",   label: "Right" },
  { value: "justify", label: "Justify" },
];

export function TypographySection({ style, onChange }: Props) {
  const set = useNestedSetter(style, onChange);
  const body = style.typography.body;
  return (
    <div className="space-y-3">
      <SelectInput
        label="Body Font"
        value={body.family as typeof FONT_FAMILIES[number]["value"]}
        onChange={(v) => set("typography.body.family", v)}
        options={FONT_FAMILIES}
      />
      <Row>
        <NumberInput label="Size" value={body.size} onChange={(v) => set("typography.body.size", v)} min={8} max={24} step={0.5} unit="pt" />
        <SelectInput
          label="Weight"
          value={String(body.weight)}
          onChange={(v) => set("typography.body.weight", Number(v) as FontWeight)}
          options={WEIGHTS.map((w) => ({ value: String(w.value), label: w.label }))}
        />
      </Row>
      <Row>
        <NumberInput label="Line Height" value={body.lineHeight} onChange={(v) => set("typography.body.lineHeight", v)} min={1} max={3} step={0.05} />
        <SelectInput label="Align" value={(body.align ?? "left") as TextAlign} onChange={(v) => set("typography.body.align", v)} options={ALIGN_OPTIONS} />
      </Row>
      <Row>
        <NumberInput label="¶ Spacing" value={style.typography.paragraphSpacing} onChange={(v) => set("typography.paragraphSpacing", v)} min={0} max={30} unit="pt" />
        <NumberInput label="¶ Indent" value={style.typography.paragraphIndent ?? 0} onChange={(v) => set("typography.paragraphIndent", v || undefined)} min={0} max={40} unit="pt" />
      </Row>
      <SwitchInput
        label="Drop cap on chapter start"
        value={style.typography.dropCap ?? false}
        onChange={(v) => set("typography.dropCap", v)}
      />
    </div>
  );
}
