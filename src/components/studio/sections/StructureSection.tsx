"use client";

import type { StyleConfig } from "@/types/style";
import { ColorInput, NumberInput, Row, SelectInput, SwitchInput, TextInput, useNestedSetter } from "../controls";

interface Props {
  style: StyleConfig;
  onChange: (s: StyleConfig) => void;
}

const COVER_LAYOUTS = [
  { value: "centered"     as const, label: "Centered" },
  { value: "left-aligned" as const, label: "Left-aligned" },
  { value: "minimal"      as const, label: "Minimal" },
  { value: "banner"       as const, label: "Banner (gradient)" },
  { value: "gradient"     as const, label: "Soft gradient" },
];

const TOC_STYLES = [
  { value: "modern"  as const, label: "Modern" },
  { value: "classic" as const, label: "Classic" },
  { value: "dotted"  as const, label: "Dotted leader" },
  { value: "minimal" as const, label: "Minimal" },
];

const PAGE_NUM_POSITIONS = [
  { value: "top-left"      as const, label: "Top Left" },
  { value: "top-center"    as const, label: "Top Center" },
  { value: "top-right"     as const, label: "Top Right" },
  { value: "bottom-left"   as const, label: "Bottom Left" },
  { value: "bottom-center" as const, label: "Bottom Center" },
  { value: "bottom-right"  as const, label: "Bottom Right" },
];

const PAGE_NUM_FORMATS = [
  { value: "{n}"                as const, label: "1" },
  { value: "{n}/{total}"        as const, label: "1/12" },
  { value: "Page {n}"           as const, label: "Page 1" },
  { value: "Page {n} of {total}" as const, label: "Page 1 of 12" },
];

const TOC_DEPTHS = [
  { value: "1" as const, label: "H1 only" },
  { value: "2" as const, label: "H1–H2" },
  { value: "3" as const, label: "H1–H3" },
  { value: "4" as const, label: "H1–H4" },
];

export function StructureSection({ style, onChange }: Props) {
  const set = useNestedSetter(style, onChange);
  const cover = style.structure.cover;
  const toc = style.structure.toc;
  const pn = style.structure.pageNumbers;
  return (
    <div className="space-y-4">
      {/* Cover Page */}
      <div className="space-y-2">
        <SwitchInput label="Cover page" value={cover.enabled} onChange={(v) => set("structure.cover.enabled", v)} />
        {cover.enabled && (
          <div className="pl-3 space-y-2 border-l-2 border-primary/20">
            <SelectInput
              label="Layout"
              value={cover.layout as "centered" | "left-aligned" | "minimal" | "banner" | "gradient"}
              onChange={(v) => set("structure.cover.layout", v)}
              options={COVER_LAYOUTS}
            />
            <SwitchInput label="Show title"    value={cover.showTitle}    onChange={(v) => set("structure.cover.showTitle", v)} />
            <SwitchInput label="Show subtitle" value={cover.showSubtitle} onChange={(v) => set("structure.cover.showSubtitle", v)} />
            {cover.showSubtitle && (
              <TextInput label="Subtitle text" value={cover.subtitle ?? ""} onChange={(v) => set("structure.cover.subtitle", v)} />
            )}
            <SwitchInput label="Show author" value={cover.showAuthor} onChange={(v) => set("structure.cover.showAuthor", v)} />
            {cover.showAuthor && (
              <TextInput label="Author" value={cover.author ?? ""} onChange={(v) => set("structure.cover.author", v)} />
            )}
            <SwitchInput label="Show date" value={cover.showDate} onChange={(v) => set("structure.cover.showDate", v)} />
          </div>
        )}
      </div>

      {/* TOC */}
      <div className="space-y-2 border-t pt-3">
        <SwitchInput label="Table of contents" value={toc.enabled} onChange={(v) => set("structure.toc.enabled", v)} />
        {toc.enabled && (
          <div className="pl-3 space-y-2 border-l-2 border-primary/20">
            <TextInput label="TOC title" value={toc.title} onChange={(v) => set("structure.toc.title", v)} />
            <Row>
              <SelectInput
                label="Style"
                value={toc.style as "modern" | "classic" | "dotted" | "minimal"}
                onChange={(v) => set("structure.toc.style", v)}
                options={TOC_STYLES}
              />
              <SelectInput
                label="Depth"
                value={String(toc.maxDepth) as "1" | "2" | "3" | "4"}
                onChange={(v) => set("structure.toc.maxDepth", Number(v))}
                options={TOC_DEPTHS}
              />
            </Row>
          </div>
        )}
      </div>

      {/* Page numbers */}
      <div className="space-y-2 border-t pt-3">
        <SwitchInput label="Page numbers" value={pn.enabled} onChange={(v) => set("structure.pageNumbers.enabled", v)} />
        {pn.enabled && (
          <div className="pl-3 space-y-2 border-l-2 border-primary/20">
            <Row>
              <SelectInput
                label="Position"
                value={pn.position as "bottom-center" | "bottom-left" | "bottom-right" | "top-center" | "top-left" | "top-right"}
                onChange={(v) => set("structure.pageNumbers.position", v)}
                options={PAGE_NUM_POSITIONS}
              />
              <SelectInput
                label="Format"
                value={pn.format as "{n}" | "{n}/{total}" | "Page {n}" | "Page {n} of {total}"}
                onChange={(v) => set("structure.pageNumbers.format", v)}
                options={PAGE_NUM_FORMATS}
              />
            </Row>
            <Row>
              <NumberInput label="Size"  value={pn.fontSize} onChange={(v) => set("structure.pageNumbers.fontSize", v)} min={6} max={14} unit="pt" />
              <ColorInput  label="Color" value={pn.color}    onChange={(v) => set("structure.pageNumbers.color", v)} />
            </Row>
          </div>
        )}
      </div>

      {/* Page break behavior */}
      <div className="space-y-1 border-t pt-3">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Page Breaks</p>
        <SwitchInput label="New page before each H1" value={style.structure.h1NewPage} onChange={(v) => set("structure.h1NewPage", v)} />
        <SwitchInput label="New page before each H2" value={style.structure.h2NewPage} onChange={(v) => set("structure.h2NewPage", v)} />
      </div>

      {/* Header */}
      <div className="space-y-2 border-t pt-3">
        <SwitchInput label="Page header" value={style.structure.header.enabled} onChange={(v) => set("structure.header.enabled", v)} />
        {style.structure.header.enabled && (
          <div className="pl-3 space-y-2 border-l-2 border-primary/20">
            <TextInput label="Header text (blank = document title)" value={style.structure.header.text ?? ""} onChange={(v) => set("structure.header.text", v || undefined)} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="space-y-2 border-t pt-3">
        <SwitchInput label="Page footer" value={style.structure.footer.enabled} onChange={(v) => set("structure.footer.enabled", v)} />
      </div>
    </div>
  );
}
