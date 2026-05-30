/**
 * Default style values — used as the base layer for all templates.
 * Templates override only the fields they care about.
 */
import type { StyleConfig } from "@/types/style";

export const DEFAULT_STYLE: StyleConfig = {
  name: "Default",
  mode: "template",
  page: {
    size: "A4",
    orientation: "portrait",
    margin: { top: 25, right: 20, bottom: 25, left: 20 },
    background: "#FFFFFF",
    columns: 1,
  },
  colors: {
    primary: "#3B82F6",
    secondary: "#9CA3AF",
    text: "#1F2937",
    muted: "#6B7280",
    background: "#FFFFFF",
    surface: "#F3F4F6",
    link: "#3B82F6",
    border: "#D1D5DB",
  },
  typography: {
    body: {
      family: "Calibri, 'Segoe UI', sans-serif",
      size: 11,
      weight: 400,
      color: "#1F2937",
      lineHeight: 1.7,
    },
    h1: { family: "Calibri, sans-serif", size: 22, weight: 700, color: "#111827", lineHeight: 1.3,
          marginTop: 24, marginBottom: 12,
          borderBottom: { width: 3, style: "solid", color: "#3B82F6" },
          pageBreakBefore: true, decoration: "underline-bar" },
    h2: { family: "Calibri, sans-serif", size: 17, weight: 700, color: "#1F2937", lineHeight: 1.3,
          marginTop: 20, marginBottom: 10,
          borderBottom: { width: 2, style: "solid", color: "#D1D5DB" },
          pageBreakBefore: false, decoration: "underline-bar" },
    h3: { family: "Calibri, sans-serif", size: 14, weight: 700, color: "#374151", lineHeight: 1.3,
          marginTop: 16, marginBottom: 8, decoration: "none" },
    h4: { family: "Calibri, sans-serif", size: 12, weight: 700, color: "#4B5563", lineHeight: 1.3,
          marginTop: 12, marginBottom: 6, decoration: "none" },
    h5: { family: "Calibri, sans-serif", size: 11, weight: 700, color: "#6B7280", lineHeight: 1.3,
          marginTop: 10, marginBottom: 4, decoration: "none" },
    h6: { family: "Calibri, sans-serif", size: 11, weight: 600, color: "#6B7280", lineHeight: 1.3,
          marginTop: 8, marginBottom: 4, decoration: "none" },
    paragraphSpacing: 8,
  },
  codeBlock: {
    font: "Consolas, 'Courier New', monospace",
    fontSize: 9.5,
    background: "#F3F4F6",
    textColor: "#1F2937",
    borderRadius: 6,
    padding: 16,
    borderLeft: { width: 4, color: "#3B82F6" },
    theme: "github",
  },
  inlineCode: {
    font: "Consolas, 'Courier New', monospace",
    background: "#F3F4F6",
    textColor: "#1F2937",
    padding: "2px 5px",
    borderRadius: 3,
  },
  blockquote: {
    font: { family: "Calibri, sans-serif", size: 11, weight: 400, color: "#6B7280", lineHeight: 1.6 },
    background: "#EFF6FF",
    borderLeft: { width: 4, color: "#3B82F6" },
    padding: 16,
    italic: true,
    style: "modern",
  },
  table: {
    headerBackground: "#374151",
    headerColor: "#FFFFFF",
    headerBold: true,
    rowBackground: "#FFFFFF",
    rowAltBackground: "#F9FAFB",
    borderColor: "#D1D5DB",
    borderWidth: 1,
    cellPadding: 10,
    fontSize: 10,
    style: "striped",
  },
  list: {
    bulletStyle: "disc",
    indent: 20,
    spacing: 4,
    numberStyle: "decimal",
  },
  image: {
    align: "center",
    maxWidth: "100%",
    borderRadius: 6,
    shadow: false,
    caption: false,
  },
  link: {
    color: "#3B82F6",
    underline: false,
  },
  structure: {
    cover: {
      enabled: true,
      layout: "centered",
      showTitle: true,
      showSubtitle: false,
      showAuthor: false,
      showDate: true,
      dateFormat: "long",
      showLogo: false,
    },
    toc: {
      enabled: true,
      title: "Table of Contents",
      maxDepth: 3,
      showPageNumbers: true,
      style: "modern",
    },
    header: {
      enabled: true,
      showOnFirstPage: false,
      align: "right",
      fontSize: 9,
      color: "#9CA3AF",
      borderBottom: { width: 1, color: "#E5E7EB" },
    },
    footer: {
      enabled: true,
      showOnFirstPage: false,
      align: "center",
      fontSize: 9,
      color: "#9CA3AF",
      borderBottom: { width: 0, color: "#E5E7EB" },
    },
    pageNumbers: {
      enabled: true,
      position: "bottom-center",
      format: "Page {n} of {total}",
      startFrom: 1,
      fontSize: 9,
      color: "#6B7280",
    },
    h1NewPage: true,
    h2NewPage: false,
  },
};

/**
 * Deep merge a partial style config onto the default base.
 * Used so templates can express *only their overrides*.
 */
export function mergeStyle<T extends object>(base: T, override: DeepPartial<T>): T {
  if (!override) return base;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...base };
  for (const k of Object.keys(override) as (keyof T)[]) {
    const v = (override as any)[k];
    if (v && typeof v === "object" && !Array.isArray(v) && (base as any)[k]) {
      out[k] = mergeStyle((base as any)[k], v);
    } else {
      // Explicitly assign — including `undefined`, which lets templates
      // remove a default field (e.g. borderBottom: undefined for clean headings).
      out[k] = v;
    }
  }
  return out;
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
