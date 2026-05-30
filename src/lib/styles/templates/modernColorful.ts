import type { Template } from "@/types/style";
import { DEFAULT_STYLE, mergeStyle } from "../defaults";

export const modernColorful: Template = {
  id: "modern-colorful",
  name: "Modern Colorful",
  description: "Vibrant gradients, bold accents, contemporary look. Great for portfolios and creative briefs.",
  category: "creative",
  tags: ["modern", "colorful", "gradient", "portfolio", "creative", "bold"],
  builtin: true,
  order: 9,
  config: mergeStyle(DEFAULT_STYLE, {
    name: "Modern Colorful",
    page: {
      margin: { top: 24, right: 22, bottom: 24, left: 22 },
    },
    colors: {
      primary: "#8B5CF6",
      secondary: "#EC4899",
      text: "#0F172A",
      muted: "#64748B",
      surface: "#F5F3FF",
      link: "#8B5CF6",
      border: "#DDD6FE",
    },
    typography: {
      body: {
        family: "'Inter', sans-serif",
        size: 11,
        weight: 400,
        color: "#0F172A",
        lineHeight: 1.7,
      },
      h1: {
        family: "'Inter', sans-serif",
        size: 32, weight: 800, color: "#8B5CF6", lineHeight: 1.15,
        marginTop: 28, marginBottom: 14,
        pageBreakBefore: true,
        decoration: "underline-bar",
        borderBottom: { width: 4, style: "solid", color: "#EC4899" },
      },
      h2: {
        family: "'Inter', sans-serif",
        size: 20, weight: 700, color: "#7C3AED", lineHeight: 1.3,
        marginTop: 24, marginBottom: 10,
        decoration: "side-bar",
        borderBottom: undefined,
      },
      h3: {
        family: "'Inter', sans-serif",
        size: 14, weight: 700, color: "#0F172A", lineHeight: 1.3,
        marginTop: 16, marginBottom: 6,
      },
    },
    codeBlock: {
      background: "#1E1B4B",
      textColor: "#E0E7FF",
      borderLeft: { width: 4, color: "#EC4899" },
      borderRadius: 10,
      theme: "dracula",
    },
    inlineCode: {
      background: "#F5F3FF",
      textColor: "#7C3AED",
      borderRadius: 4,
    },
    blockquote: {
      style: "callout",
      background: "#FDF2F8",
      borderLeft: { width: 4, color: "#EC4899" },
    },
    table: {
      style: "modern",
      headerBackground: "#8B5CF6",
      headerColor: "#FFFFFF",
      rowAltBackground: "#F5F3FF",
    },
    list: {
      bulletStyle: "check",
    },
    image: { shadow: true, borderRadius: 12 },
    structure: {
      cover: {
        layout: "gradient",
        showSubtitle: true,
        subtitle: "A Creative Project",
        showDate: true,
        accentColor: "#8B5CF6",
      },
      toc: { title: "Contents", style: "modern" },
      pageNumbers: { format: "{n}/{total}", position: "bottom-right" },
    },
  }),
};
