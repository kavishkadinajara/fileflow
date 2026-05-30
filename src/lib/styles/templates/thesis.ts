import type { Template } from "@/types/style";
import { DEFAULT_STYLE, mergeStyle } from "../defaults";

export const thesis: Template = {
  id: "thesis",
  name: "Thesis / Dissertation",
  description: "University thesis format — 1.5 line spacing, numbered chapters, formal cover with degree/university details.",
  category: "academic",
  tags: ["thesis", "dissertation", "phd", "msc", "university", "research"],
  builtin: true,
  order: 6,
  config: mergeStyle(DEFAULT_STYLE, {
    name: "Thesis / Dissertation",
    page: {
      margin: { top: 30, right: 25, bottom: 25, left: 35 },
    },
    colors: {
      primary: "#1E3A8A",
      secondary: "#1F2937",
      text: "#111827",
      muted: "#6B7280",
      link: "#1E40AF",
    },
    typography: {
      body: {
        family: "'Times New Roman', Times, serif",
        size: 12,
        weight: 400,
        color: "#111827",
        lineHeight: 1.5,
        align: "justify",
      },
      h1: {
        family: "'Times New Roman', Times, serif",
        size: 24, weight: 700, color: "#1E3A8A", lineHeight: 1.3,
        marginTop: 80, marginBottom: 24,
        align: "center",
        pageBreakBefore: true,
        textTransform: "uppercase",
        numbered: true,
        decoration: "none",
        borderBottom: undefined,
      },
      h2: {
        family: "'Times New Roman', Times, serif",
        size: 16, weight: 700, color: "#1E3A8A", lineHeight: 1.3,
        marginTop: 22, marginBottom: 10,
        numbered: true,
        decoration: "none",
        borderBottom: undefined,
      },
      h3: {
        family: "'Times New Roman', Times, serif",
        size: 13, weight: 700, color: "#111827", lineHeight: 1.3,
        marginTop: 16, marginBottom: 6,
        numbered: true,
      },
      paragraphIndent: 24,
      paragraphSpacing: 8,
    },
    codeBlock: {
      background: "#F9FAFB",
      textColor: "#111827",
      fontSize: 9,
      borderLeft: { width: 2, color: "#9CA3AF" },
    },
    blockquote: {
      style: "classic",
      background: "#F9FAFB",
      borderLeft: { width: 3, color: "#1E3A8A" },
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
        subtitle: "A thesis submitted in partial fulfillment of the requirements for the degree of\nMaster of Science",
        showAuthor: true,
        author: "Candidate Name",
        accentColor: "#1E3A8A",
      },
      toc: { title: "Table of Contents", maxDepth: 4, style: "dotted" },
      header: { enabled: true, align: "center" },
      pageNumbers: { position: "bottom-center", format: "{n}", startFrom: 1 },
      h1NewPage: true,
    },
  }),
};
