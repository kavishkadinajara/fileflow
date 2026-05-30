import type { Template } from "@/types/style";
import { DEFAULT_STYLE, mergeStyle } from "../defaults";

export const minimalist: Template = {
  id: "minimalist",
  name: "Minimalist",
  description: "Clean, monochrome, no decorations. Maximum focus on content. Generous whitespace.",
  category: "minimal",
  tags: ["minimal", "clean", "monochrome", "simple", "focus"],
  builtin: true,
  order: 3,
  config: mergeStyle(DEFAULT_STYLE, {
    name: "Minimalist",
    page: {
      margin: { top: 30, right: 30, bottom: 30, left: 30 },
    },
    colors: {
      primary: "#000000",
      secondary: "#525252",
      text: "#171717",
      muted: "#737373",
      surface: "#FAFAFA",
      link: "#000000",
      border: "#E5E5E5",
    },
    typography: {
      body: {
        family: "'Inter', 'Helvetica Neue', sans-serif",
        size: 11,
        weight: 400,
        color: "#171717",
        lineHeight: 1.75,
      },
      h1: {
        family: "'Inter', sans-serif",
        size: 28, weight: 800, color: "#000000", lineHeight: 1.2,
        marginTop: 32, marginBottom: 16,
        pageBreakBefore: true,
        decoration: "none",
        borderBottom: undefined,
      },
      h2: {
        family: "'Inter', sans-serif",
        size: 18, weight: 700, color: "#000000", lineHeight: 1.3,
        marginTop: 22, marginBottom: 10,
        decoration: "none",
        borderBottom: undefined,
      },
      h3: {
        family: "'Inter', sans-serif",
        size: 13, weight: 600, color: "#171717", lineHeight: 1.3,
        marginTop: 16, marginBottom: 6,
        textTransform: "uppercase",
        letterSpacing: 0.05,
        decoration: "none",
      },
      paragraphSpacing: 10,
    },
    codeBlock: {
      background: "#FAFAFA",
      textColor: "#171717",
      borderLeft: undefined,
      borderRadius: 0,
      padding: 12,
      theme: "vs",
    },
    inlineCode: {
      background: "#FAFAFA",
      borderRadius: 2,
    },
    blockquote: {
      style: "minimal",
      background: "transparent",
      borderLeft: { width: 0, color: "transparent" },
      italic: true,
      padding: 0,
    },
    table: {
      style: "minimal",
      headerBackground: "#FFFFFF",
      headerColor: "#000000",
      borderColor: "#000000",
    },
    list: {
      bulletStyle: "circle",
    },
    image: { shadow: false, borderRadius: 0 },
    link: { underline: true },
    structure: {
      cover: {
        layout: "minimal",
        showSubtitle: false,
        showAuthor: false,
        showDate: true,
        dateFormat: "iso",
      },
      toc: { enabled: false, title: "Contents", style: "minimal" },
      header: { enabled: false },
      footer: { enabled: false },
      pageNumbers: { position: "bottom-center", format: "{n}" },
      h1NewPage: true,
    },
  }),
};
