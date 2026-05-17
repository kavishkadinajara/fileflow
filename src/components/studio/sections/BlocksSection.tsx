"use client";

import type { StyleConfig } from "@/types/style";
import { ColorInput, NumberInput, Row, SelectInput, SwitchInput, useNestedSetter } from "../controls";

interface Props {
  style: StyleConfig;
  onChange: (s: StyleConfig) => void;
}

const CODE_THEMES = [
  { value: "github"         as const, label: "GitHub Light" },
  { value: "vs"             as const, label: "Visual Studio" },
  { value: "atom-one-dark"  as const, label: "Atom One Dark" },
  { value: "monokai"        as const, label: "Monokai" },
  { value: "dracula"        as const, label: "Dracula" },
  { value: "none"           as const, label: "Plain (no theme)" },
];

const TABLE_STYLES = [
  { value: "modern"  as const, label: "Modern" },
  { value: "classic" as const, label: "Classic" },
  { value: "minimal" as const, label: "Minimal" },
  { value: "striped" as const, label: "Striped" },
];

const QUOTE_STYLES = [
  { value: "modern"  as const, label: "Modern" },
  { value: "classic" as const, label: "Classic (no bar)" },
  { value: "minimal" as const, label: "Minimal" },
  { value: "callout" as const, label: "Callout (shadow)" },
];

const BULLETS = [
  { value: "disc"   as const, label: "Disc (•)" },
  { value: "circle" as const, label: "Circle (○)" },
  { value: "square" as const, label: "Square (▪)" },
  { value: "arrow"  as const, label: "Arrow (→)" },
  { value: "check"  as const, label: "Check (✓)" },
];

export function BlocksSection({ style, onChange }: Props) {
  const set = useNestedSetter(style, onChange);
  return (
    <div className="space-y-4">
      {/* Code block */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Code Blocks</p>
        <Row>
          <ColorInput label="Background" value={style.codeBlock.background} onChange={(v) => set("codeBlock.background", v)} />
          <ColorInput label="Text"       value={style.codeBlock.textColor}  onChange={(v) => set("codeBlock.textColor", v)} />
        </Row>
        <Row>
          <NumberInput label="Padding"  value={style.codeBlock.padding}      onChange={(v) => set("codeBlock.padding", v)}      min={0} max={40} unit="px" />
          <NumberInput label="Radius"   value={style.codeBlock.borderRadius} onChange={(v) => set("codeBlock.borderRadius", v)} min={0} max={20} unit="px" />
        </Row>
        <SelectInput
          label="Syntax theme"
          value={(style.codeBlock.theme ?? "github") as "github" | "vs" | "atom-one-dark" | "monokai" | "dracula" | "none"}
          onChange={(v) => set("codeBlock.theme", v)}
          options={CODE_THEMES}
        />
      </div>

      {/* Blockquote */}
      <div className="space-y-2 border-t pt-3">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Blockquotes</p>
        <SelectInput
          label="Style"
          value={style.blockquote.style as "modern" | "classic" | "minimal" | "callout"}
          onChange={(v) => set("blockquote.style", v)}
          options={QUOTE_STYLES}
        />
        <Row>
          <ColorInput label="Background" value={style.blockquote.background} onChange={(v) => set("blockquote.background", v)} />
          <ColorInput label="Bar Color"  value={style.blockquote.borderLeft.color} onChange={(v) => set("blockquote.borderLeft.color", v)} />
        </Row>
        <SwitchInput label="Italic text" value={style.blockquote.italic} onChange={(v) => set("blockquote.italic", v)} />
      </div>

      {/* Tables */}
      <div className="space-y-2 border-t pt-3">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Tables</p>
        <SelectInput
          label="Style"
          value={style.table.style as "modern" | "classic" | "minimal" | "striped"}
          onChange={(v) => set("table.style", v)}
          options={TABLE_STYLES}
        />
        <Row>
          <ColorInput label="Header BG"    value={style.table.headerBackground} onChange={(v) => set("table.headerBackground", v)} />
          <ColorInput label="Header Color" value={style.table.headerColor}      onChange={(v) => set("table.headerColor", v)} />
        </Row>
        <Row>
          <NumberInput label="Cell pad"   value={style.table.cellPadding} onChange={(v) => set("table.cellPadding", v)} min={2} max={20} unit="px" />
          <NumberInput label="Font size"  value={style.table.fontSize}    onChange={(v) => set("table.fontSize", v)}    min={7} max={14} unit="pt" />
        </Row>
      </div>

      {/* Lists */}
      <div className="space-y-2 border-t pt-3">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Lists</p>
        <SelectInput
          label="Bullet style"
          value={style.list.bulletStyle as "disc" | "circle" | "square" | "arrow" | "check"}
          onChange={(v) => set("list.bulletStyle", v)}
          options={BULLETS}
        />
        <Row>
          <NumberInput label="Indent"  value={style.list.indent}  onChange={(v) => set("list.indent", v)}  min={0} max={50} unit="pt" />
          <NumberInput label="Spacing" value={style.list.spacing} onChange={(v) => set("list.spacing", v)} min={0} max={20} unit="pt" />
        </Row>
      </div>
    </div>
  );
}
