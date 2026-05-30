import type { Template } from "@/types/style";
import { DEFAULT_STYLE, mergeStyle } from "../defaults";

export const blog: Template = {
  id: "blog-post",
  name: "Blog Post",
  description: "Medium-inspired blog layout — readable typography, generous line height, simple style.",
  category: "personal",
  tags: ["blog", "post", "article", "medium", "casual"],
  builtin: true,
  order: 11,
  config: mergeStyle(DEFAULT_STYLE, {
    name: "Blog Post",
    page: {
      margin: { top: 28, right: 35, bottom: 28, left: 35 },
    },
    colors: {
      primary: "#059669",
      secondary: "#10B981",
      text: "#1F2937",
      muted: "#6B7280",
      surface: "#F0FDF4",
      link: "#059669",
      border: "#D1FAE5",
    },
    typography: {
      body: {
        family: "'Source Serif Pro', 'Georgia', serif",
        size: 12,
        weight: 400,
        color: "#1F2937",
        lineHeight: 1.85,
      },
      h1: {
        family: "'Inter', sans-serif",
        size: 30, weight: 800, color: "#0F172A", lineHeight: 1.15,
        marginTop: 24, marginBottom: 14,
        pageBreakBefore: false,
        decoration: "none",
        borderBottom: undefined,
      },
      h2: {
        family: "'Inter', sans-serif",
        size: 19, weight: 700, color: "#0F172A", lineHeight: 1.3,
        marginTop: 24, marginBottom: 10,
        decoration: "none",
        borderBottom: undefined,
      },
      h3: {
        family: "'Inter', sans-serif",
        size: 14, weight: 700, color: "#0F172A", lineHeight: 1.3,
        marginTop: 16, marginBottom: 6,
      },
      paragraphSpacing: 12,
    },
    codeBlock: {
      background: "#F9FAFB",
      textColor: "#1F2937",
      borderLeft: { width: 3, color: "#059669" },
      borderRadius: 6,
      theme: "github",
    },
    inlineCode: {
      background: "#F0FDF4",
      textColor: "#059669",
    },
    blockquote: {
      style: "classic",
      background: "transparent",
      borderLeft: { width: 4, color: "#059669" },
      italic: true,
      font: { family: "'Source Serif Pro', Georgia, serif", size: 14, weight: 400, color: "#374151", lineHeight: 1.5 },
    },
    image: { shadow: false, borderRadius: 8 },
    structure: {
      cover: { enabled: false, layout: "left-aligned", showSubtitle: false, showAuthor: true, showDate: true },
      toc: { enabled: false, title: "Contents", style: "minimal" },
      header: { enabled: false },
      footer: { enabled: false },
      pageNumbers: { enabled: false, position: "bottom-center", format: "{n}" },
      h1NewPage: false,
    },
  }),
};
