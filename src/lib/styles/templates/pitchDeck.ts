import type { Template } from "@/types/style";
import { DEFAULT_STYLE, mergeStyle } from "../defaults";

export const pitchDeck: Template = {
  id: "pitch-deck",
  name: "Pitch Deck Style",
  description: "Landscape, large headings, slide-feel layout. Ideal for proposals and presentations exported as PDF.",
  category: "business",
  tags: ["pitch", "deck", "slides", "presentation", "proposal", "landscape"],
  builtin: true,
  order: 12,
  config: mergeStyle(DEFAULT_STYLE, {
    name: "Pitch Deck",
    page: {
      orientation: "landscape",
      margin: { top: 25, right: 35, bottom: 25, left: 35 },
    },
    colors: {
      primary: "#F97316",
      secondary: "#EA580C",
      text: "#0F172A",
      muted: "#64748B",
      surface: "#FFF7ED",
      link: "#F97316",
      border: "#FED7AA",
    },
    typography: {
      body: {
        family: "'Inter', sans-serif",
        size: 14,
        weight: 400,
        color: "#0F172A",
        lineHeight: 1.6,
      },
      h1: {
        family: "'Inter', sans-serif",
        size: 48, weight: 800, color: "#0F172A", lineHeight: 1.1,
        marginTop: 40, marginBottom: 24,
        pageBreakBefore: true,
        decoration: "none",
        borderBottom: undefined,
      },
      h2: {
        family: "'Inter', sans-serif",
        size: 32, weight: 700, color: "#F97316", lineHeight: 1.2,
        marginTop: 32, marginBottom: 16,
        pageBreakBefore: true,
        decoration: "none",
        borderBottom: undefined,
      },
      h3: {
        family: "'Inter', sans-serif",
        size: 20, weight: 700, color: "#0F172A", lineHeight: 1.3,
        marginTop: 18, marginBottom: 8,
      },
      paragraphSpacing: 14,
    },
    codeBlock: {
      background: "#0F172A",
      textColor: "#FED7AA",
      fontSize: 12,
      borderRadius: 12,
      theme: "monokai",
    },
    blockquote: {
      style: "callout",
      background: "#FFF7ED",
      borderLeft: { width: 6, color: "#F97316" },
    },
    list: {
      bulletStyle: "arrow",
      spacing: 8,
    },
    image: { shadow: true, borderRadius: 12 },
    structure: {
      cover: {
        layout: "banner",
        showSubtitle: true,
        subtitle: "Pitch Deck",
        showAuthor: true,
        author: "Your Company",
        accentColor: "#FFFFFF",
      },
      toc: { enabled: false, title: "Contents", style: "minimal" },
      pageNumbers: { format: "{n}/{total}", position: "bottom-right" },
      h1NewPage: true,
      h2NewPage: true,
    },
  }),
};
