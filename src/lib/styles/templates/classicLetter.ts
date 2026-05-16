import type { Template } from "@/types/style";
import { DEFAULT_STYLE, mergeStyle } from "../defaults";

export const classicLetter: Template = {
  id: "classic-letter",
  name: "Classic Letter",
  description: "Formal correspondence style — Garamond serif, conservative margins, no decorations.",
  category: "personal",
  tags: ["letter", "formal", "correspondence", "classic", "serif"],
  builtin: true,
  order: 10,
  config: mergeStyle(DEFAULT_STYLE, {
    name: "Classic Letter",
    page: {
      margin: { top: 30, right: 25, bottom: 30, left: 25 },
    },
    colors: {
      primary: "#1F2937",
      secondary: "#4B5563",
      text: "#1F2937",
      muted: "#6B7280",
      link: "#1F2937",
      border: "#9CA3AF",
    },
    typography: {
      body: {
        family: "'Garamond', 'Georgia', serif",
        size: 12,
        weight: 400,
        color: "#1F2937",
        lineHeight: 1.6,
      },
      h1: {
        family: "'Garamond', 'Georgia', serif",
        size: 20, weight: 700, color: "#1F2937", lineHeight: 1.3,
        marginTop: 18, marginBottom: 12,
        align: "center",
        pageBreakBefore: false,
        decoration: "none",
        borderBottom: undefined,
      },
      h2: {
        family: "'Garamond', 'Georgia', serif",
        size: 14, weight: 700, color: "#1F2937", lineHeight: 1.3,
        marginTop: 14, marginBottom: 6,
        decoration: "none",
        borderBottom: undefined,
      },
      h3: {
        family: "'Garamond', 'Georgia', serif",
        size: 12, weight: 700, color: "#1F2937", lineHeight: 1.3,
        marginTop: 10, marginBottom: 4,
      },
      paragraphIndent: 28,
      paragraphSpacing: 6,
    },
    blockquote: {
      style: "minimal",
      background: "transparent",
      borderLeft: { width: 0, color: "transparent" },
      italic: true,
      padding: 0,
    },
    structure: {
      cover: { enabled: false, layout: "centered", showSubtitle: false, showAuthor: false, showDate: false },
      toc: { enabled: false, title: "Contents", style: "minimal" },
      header: { enabled: false },
      footer: { enabled: false },
      pageNumbers: { enabled: false, position: "bottom-center", format: "{n}" },
      h1NewPage: false,
    },
  }),
};
