"use client";

import type { StyleConfig } from "@/types/style";
import { ColorInput, NumberInput, Row, SelectInput, useNestedSetter } from "../controls";

interface Props {
  style: StyleConfig;
  onChange: (s: StyleConfig) => void;
}

const PAGE_SIZES = [
  { value: "A4",      label: "A4 (210×297mm)" },
  { value: "A3",      label: "A3 (297×420mm)" },
  { value: "A5",      label: "A5 (148×210mm)" },
  { value: "Letter",  label: "Letter (8.5×11in)" },
  { value: "Legal",   label: "Legal (8.5×14in)" },
  { value: "Tabloid", label: "Tabloid (11×17in)" },
] as const;

const ORIENTATIONS = [
  { value: "portrait" as const, label: "Portrait" },
  { value: "landscape" as const, label: "Landscape" },
];

const COLUMNS = [
  { value: 1 as const, label: "1 column" },
  { value: 2 as const, label: "2 columns" },
  { value: 3 as const, label: "3 columns" },
];

export function PageSection({ style, onChange }: Props) {
  const set = useNestedSetter(style, onChange);
  return (
    <div className="space-y-3">
      <SelectInput
        label="Page Size"
        value={style.page.size}
        onChange={(v) => set("page.size", v)}
        options={PAGE_SIZES}
      />
      <Row>
        <SelectInput
          label="Orientation"
          value={style.page.orientation}
          onChange={(v) => set("page.orientation", v)}
          options={ORIENTATIONS}
        />
        <SelectInput
          label="Columns"
          value={String(style.page.columns) as "1" | "2" | "3"}
          onChange={(v) => set("page.columns", Number(v))}
          options={COLUMNS.map((c) => ({ value: String(c.value) as "1" | "2" | "3", label: c.label }))}
        />
      </Row>
      <ColorInput
        label="Background"
        value={style.page.background}
        onChange={(v) => set("page.background", v)}
      />
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
          Margins (mm)
        </p>
        <Row>
          <NumberInput label="Top"    value={style.page.margin.top}    onChange={(v) => set("page.margin.top", v)}    min={0} max={50} unit="mm" />
          <NumberInput label="Bottom" value={style.page.margin.bottom} onChange={(v) => set("page.margin.bottom", v)} min={0} max={50} unit="mm" />
          <NumberInput label="Left"   value={style.page.margin.left}   onChange={(v) => set("page.margin.left", v)}   min={0} max={50} unit="mm" />
          <NumberInput label="Right"  value={style.page.margin.right}  onChange={(v) => set("page.margin.right", v)}  min={0} max={50} unit="mm" />
        </Row>
      </div>
    </div>
  );
}
