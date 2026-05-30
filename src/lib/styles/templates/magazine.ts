import type { Template } from "@/types/style";
import { DEFAULT_STYLE, mergeStyle } from "../defaults";

export const magazine: Template = {
  id: "magazine",
  name: "Magazine Article",
  description: "Editorial style — serif headlines, drop caps, large pull quotes, generous typography.",
  category: "creative",
  tags: ["magazine", "article", "editorial", "serif", "feature"],
  builtin: true,
  order: 4,
  config: mergeStyle(DEFAULT_STYLE, {
    name: "Magazine Article",
    page: {
      margin: { top: 28, right: 25, bottom: 28, left: 25 },
    },
    colors: {
      primary: "#B91C1C",
      secondary: "#7F1D1D",
      text: "#1C1917",
      muted: "#78716C",
      surface: "#FAFAF9",
      link: "#B91C1C",
      border: "#D6D3D1",
    },
    typography: {
      body: {
        family: "'Georgia', 'Times New Roman', serif",
        size: 11,
        weight: 400,
        color: "#1C1917",
        lineHeight: 1.75,
      },
      h1: {
        family: "'Playfair Display', Georgia, serif",
        size: 36, weight: 800, color: "#1C1917", lineHeight: 1.1,
        marginTop: 32, marginBottom: 18,
        pageBreakBefore: true,
        decoration: "none",
        borderBottom: undefined,
      },
      h2: {
        family: "'Playfair Display', Georgia, serif",
        size: 22, weight: 700, color: "#B91C1C", lineHeight: 1.25,
        marginTop: 26, marginBottom: 12,
        decoration: "none",
        borderBottom: undefined,
      },
      h3: {
        family: "'Playfair Display', Georgia, serif",
        size: 15, weight: 700, color: "#1C1917", lineHeight: 1.3,
        marginTop: 18, marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.08,
      },
      paragraphIndent: 22,
      paragraphSpacing: 6,
      dropCap: true,
    },
    blockquote: {
      style: "classic",
      background: "transparent",
      borderLeft: { width: 0, color: "transparent" },
      italic: true,
      font: { family: "'Playfair Display', Georgia, serif", size: 16, weight: 400, color: "#B91C1C", lineHeight: 1.5, align: "center" },
      padding: 24,
    },
    structure: {
      cover: {
        layout: "left-aligned",
        showSubtitle: true,
        subtitle: "Feature Story",
        showAuthor: true,
        author: "by The Editor",
        accentColor: "#B91C1C",
      },
      toc: { enabled: false, title: "Contents", style: "minimal" },
      pageNumbers: { position: "bottom-center", format: "{n}" },
    },
  }),
};
