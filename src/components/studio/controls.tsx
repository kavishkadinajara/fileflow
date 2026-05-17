"use client";

/**
 * Small reusable form controls used by every Style Studio section.
 * Kept compact + label-aligned so panels feel like a cohesive editor.
 */
import { useCallback } from "react";

// ─── Label ──────────────────────────────────────────────────────────────────

export function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
        {children}
      </span>
      {hint && <span className="block text-[10px] text-muted-foreground/70 mt-0.5">{hint}</span>}
    </label>
  );
}

// ─── Color picker (hex input + swatch) ──────────────────────────────────────

export function ColorInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div className="space-y-1">
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 rounded border border-input cursor-pointer bg-transparent shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-7 px-2 text-xs font-mono rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
      </div>
    </div>
  );
}

// ─── Number input with slider ───────────────────────────────────────────────

export function NumberInput({
  value,
  onChange,
  label,
  min,
  max,
  step = 1,
  unit,
  showSlider = false,
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  showSlider?: boolean;
}) {
  const safeMin = min ?? 0;
  const safeMax = max ?? 100;
  return (
    <div className="space-y-1">
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="h-7 w-20 px-2 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
        {showSlider && (
          <input
            type="range"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            min={safeMin}
            max={safeMax}
            step={step}
            className="flex-1 h-7 accent-primary"
          />
        )}
      </div>
    </div>
  );
}

// ─── Select ─────────────────────────────────────────────────────────────────

export function SelectInput<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string }[];
  label?: string;
}) {
  return (
    <div className="space-y-1">
      {label && <FieldLabel>{label}</FieldLabel>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full h-7 px-2 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Text input ─────────────────────────────────────────────────────────────

export function TextInput({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      {label && <FieldLabel>{label}</FieldLabel>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-7 px-2 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
      />
    </div>
  );
}

// ─── Switch / Checkbox ──────────────────────────────────────────────────────

export function SwitchInput({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between gap-2 py-1 cursor-pointer">
      <span className="text-xs">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-4 w-7 rounded-full transition-colors ${
          value ? "bg-primary" : "bg-input"
        }`}
      >
        <span
          className={`inline-block h-3 w-3 rounded-full bg-background shadow transition-transform ${
            value ? "translate-x-3.5" : "translate-x-0.5"
          } absolute top-0.5`}
        />
      </button>
    </label>
  );
}

// ─── Row helper for side-by-side controls ───────────────────────────────────

export function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

// ─── Hook: nested setter ────────────────────────────────────────────────────

/** Returns a setter for `path` inside `style`. Path can be nested like "colors.primary". */
export function useNestedSetter<S>(style: S, onChange: (s: S) => void) {
  return useCallback(
    function set<V>(path: string, value: V) {
      const keys = path.split(".");
      const next = structuredClone(style) as any;
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) {
        cur[keys[i]] ??= {};
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = value;
      onChange(next);
    },
    [style, onChange],
  );
}
