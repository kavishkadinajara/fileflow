import type { Template } from "@/types/style";
import { DEFAULT_STYLE, mergeStyle } from "../defaults";

export const technical: Template = {
  id: "technical-docs",
  name: "Technical Documentation",
  description: "GitHub-flavored — monospace-friendly, dark code blocks, callouts. Perfect for API docs, READMEs, tutorials.",
  category: "technical",
  tags: ["docs", "documentation", "github", "api", "tutorial", "readme"],
  builtin: true,
  order: 8,
  config: mergeStyle(DEFAULT_STYLE, {
    name: "Technical Documentation",
    page: {
      margin: { top: 22, right: 22, bottom: 22, left: 22 },
    },
    colors: {
      primary: "#0EA5E9",
      secondary: "#0284C7",
      text: "#0F172A",
      muted: "#64748B",
      surface: "#F1F5F9",
      link: "#0EA5E9",
      border: "#E2E8F0",
    },
    typography: {
      body: {
        family: "'Inter', -apple-system, sans-serif",
        size: 10.5,
        weight: 400,
        color: "#0F172A",
        lineHeight: 1.7,
      },
      h1: {
        family: "'Inter', sans-serif",
        size: 26, weight: 800, color: "#0F172A", lineHeight: 1.2,
        marginTop: 24, marginBottom: 12,
        pageBreakBefore: true,
        decoration: "none",
        borderBottom: { width: 2, style: "solid", color: "#E2E8F0" },
      },
      h2: {
        family: "'Inter', sans-serif",
        size: 18, weight: 700, color: "#0F172A", lineHeight: 1.3,
        marginTop: 22, marginBottom: 10,
        decoration: "none",
        borderBottom: { width: 1, style: "solid", color: "#E2E8F0" },
      },
      h3: {
        family: "'Inter', sans-serif",
        size: 14, weight: 700, color: "#0F172A", lineHeight: 1.3,
        marginTop: 16, marginBottom: 6,
      },
    },
    codeBlock: {
      background: "#0F172A",
      textColor: "#E2E8F0",
      fontSize: 9,
      borderLeft: undefined,
      borderRadius: 8,
      theme: "atom-one-dark",
      showLineNumbers: true,
    },
    inlineCode: {
      background: "#F1F5F9",
      textColor: "#0EA5E9",
      borderRadius: 4,
      padding: "2px 6px",
    },
    blockquote: {
      style: "callout",
      background: "#EFF6FF",
      borderLeft: { width: 4, color: "#0EA5E9" },
    },
    table: {
      style: "modern",
      headerBackground: "#F1F5F9",
      headerColor: "#0F172A",
    },
    structure: {
      cover: {
        layout: "left-aligned",
        showSubtitle: true,
        subtitle: "Technical Documentation",
        showDate: true,
      },
      toc: { title: "Table of Contents", maxDepth: 3, style: "modern" },
      pageNumbers: { format: "Page {n} of {total}", position: "bottom-right" },
    },
  }),
};
