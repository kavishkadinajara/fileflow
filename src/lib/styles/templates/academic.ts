import type { Template } from "@/types/style";
import { DEFAULT_STYLE, mergeStyle } from "../defaults";

export const academic: Template = {
  id: "academic",
  name: "Academic Paper",
  description: "IEEE/APA-style academic paper — Times New Roman, two-column body, numbered headings, formal cover.",
  category: "academic",
  tags: ["paper", "research", "thesis", "ieee", "apa", "formal"],
  builtin: true,
  order: 1,
  config: mergeStyle(DEFAULT_STYLE, {
    name: "Academic Paper",
    mode: "template",
    page: {
      margin: { top: 25, right: 20, bottom: 25, left: 20 },
      columns: 1, // body single-col for now; can be 2 on request
    },
    colors: {
      primary: "#1F2937",
      secondary: "#4B5563",
      text: "#111827",
      link: "#1E40AF",
    },
    typography: {
      body: {
        family: "'Times New Roman', Times, serif",
        size: 11,
        weight: 400,
        color: "#111827",
        lineHeight: 1.5,
        align: "justify",
      },
      h1: {
        family: "'Times New Roman', Times, serif",
        size: 18, weight: 700, color: "#111827", lineHeight: 1.3,
        marginTop: 24, marginBottom: 12,
        align: "center",
        textTransform: "uppercase",
        pageBreakBefore: true,
        numbered: true,
        decoration: "none",
        borderBottom: undefined,
      },
      h2: {
        family: "'Times New Roman', Times, serif",
        size: 14, weight: 700, color: "#111827", lineHeight: 1.3,
        marginTop: 18, marginBottom: 8,
        numbered: true,
        decoration: "none",
        borderBottom: undefined,
      },
      h3: {
        family: "'Times New Roman', Times, serif",
        size: 12, weight: 700, color: "#1F2937", lineHeight: 1.3,
        marginTop: 14, marginBottom: 6,
        numbered: true,
        decoration: "none",
      },
      paragraphIndent: 18,
      paragraphSpacing: 6,
    },
    codeBlock: {
      background: "#F9FAFB",
      borderLeft: { width: 2, color: "#6B7280" },
    },
    blockquote: {
      style: "classic",
      background: "transparent",
      borderLeft: { width: 3, color: "#9CA3AF" },
      italic: true,
    },
    table: {
      style: "minimal",
      headerBackground: "#FFFFFF",
      headerColor: "#111827",
      borderColor: "#111827",
    },
    structure: {
      cover: {
        layout: "centered",
        showSubtitle: true,
        subtitle: "Research Paper",
        showAuthor: true,
        author: "Author Name",
        accentColor: "#1F2937",
      },
      toc: { title: "Contents", style: "dotted" },
      pageNumbers: { position: "bottom-center", format: "{n}" },
      h2NewPage: false,
    },
  }),
};
