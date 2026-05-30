import type { Template } from "@/types/style";
import { DEFAULT_STYLE, mergeStyle } from "../defaults";

export const ebook: Template = {
  id: "ebook",
  name: "Book / E-book",
  description: "Chapter-style book layout — serif body, chapter title pages, drop caps, novel-like flow.",
  category: "creative",
  tags: ["book", "ebook", "novel", "chapter", "literary"],
  builtin: true,
  order: 5,
  config: mergeStyle(DEFAULT_STYLE, {
    name: "Book / E-book",
    page: {
      size: "A5",
      margin: { top: 22, right: 18, bottom: 22, left: 18 },
    },
    colors: {
      primary: "#451A03",
      secondary: "#78350F",
      text: "#1C1917",
      muted: "#78716C",
      surface: "#FEF7E5",
      link: "#92400E",
      border: "#D6D3D1",
    },
    typography: {
      body: {
        family: "'Garamond', 'Georgia', serif",
        size: 10.5,
        weight: 400,
        color: "#1C1917",
        lineHeight: 1.65,
        align: "justify",
      },
      h1: {
        family: "'Garamond', 'Georgia', serif",
        size: 32, weight: 700, color: "#451A03", lineHeight: 1.2,
        marginTop: 60, marginBottom: 20,
        align: "center",
        pageBreakBefore: true,
        textTransform: "capitalize",
        decoration: "none",
        borderBottom: undefined,
      },
      h2: {
        family: "'Garamond', 'Georgia', serif",
        size: 16, weight: 700, color: "#451A03", lineHeight: 1.3,
        marginTop: 20, marginBottom: 10,
        align: "center",
        decoration: "none",
        borderBottom: undefined,
      },
      h3: {
        family: "'Garamond', 'Georgia', serif",
        size: 13, weight: 700, color: "#1C1917", lineHeight: 1.3,
        marginTop: 14, marginBottom: 6,
      },
      paragraphIndent: 24,
      paragraphSpacing: 4,
      dropCap: true,
    },
    blockquote: {
      style: "classic",
      background: "transparent",
      borderLeft: { width: 0, color: "transparent" },
      italic: true,
      padding: 16,
    },
    structure: {
      cover: {
        layout: "centered",
        showSubtitle: true,
        subtitle: "A Novel",
        showAuthor: true,
        author: "Author Name",
        showDate: false,
      },
      toc: { title: "Contents", style: "classic" },
      pageNumbers: { position: "bottom-center", format: "{n}" },
      h2NewPage: false,
    },
  }),
};
