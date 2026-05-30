import type { Template } from "@/types/style";
import { DEFAULT_STYLE, mergeStyle } from "../defaults";

/**
 * Preserve Original — true "as-is" rendering.
 *
 * Produces a document that visually matches the source Markdown as closely
 * as possible: no cover page, no auto TOC, no forced page breaks, no decorative
 * accents. Heading sizes follow typical browser/Word defaults (h1 = ~24pt, h2
 * = ~18pt, etc.) so what you see in the editor is what you get on paper.
 *
 * This is the implicit "fallback" when the user selects As-is mode in the UI.
 */
export const preserveOriginal: Template = {
  id: "preserve-original",
  name: "As-is (Preserve Original)",
  description: "True 1:1 rendering of the source — no cover, no auto TOC, no page breaks, no styling additions.",
  category: "minimal",
  tags: ["preserve", "as-is", "original", "raw", "plain", "default"],
  builtin: true,
  order: 0,
  config: mergeStyle(DEFAULT_STYLE, {
    name: "As-is (Preserve Original)",
    page: {
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
    },
    colors: {
      primary: "#000000",
      secondary: "#000000",
      text: "#000000",
      muted: "#666666",
      link: "#0000EE",
      border: "#CCCCCC",
    },
    typography: {
      body: {
        family: "'Segoe UI', Calibri, Arial, sans-serif",
        size: 11,
        weight: 400,
        color: "#000000",
        lineHeight: 1.5,
      },
      h1: {
        family: "'Segoe UI', Calibri, Arial, sans-serif",
        size: 20, weight: 700, color: "#000000", lineHeight: 1.3,
        marginTop: 18, marginBottom: 10,
        pageBreakBefore: false,
        decoration: "none",
        borderBottom: undefined,
      },
      h2: {
        family: "'Segoe UI', Calibri, Arial, sans-serif",
        size: 16, weight: 700, color: "#000000", lineHeight: 1.3,
        marginTop: 14, marginBottom: 8,
        pageBreakBefore: false,
        decoration: "none",
        borderBottom: undefined,
      },
      h3: {
        family: "'Segoe UI', Calibri, Arial, sans-serif",
        size: 13, weight: 700, color: "#000000", lineHeight: 1.3,
        marginTop: 12, marginBottom: 6,
        decoration: "none",
        borderBottom: undefined,
      },
      h4: {
        family: "'Segoe UI', Calibri, Arial, sans-serif",
        size: 11, weight: 700, color: "#000000", lineHeight: 1.3,
        marginTop: 10, marginBottom: 4,
        decoration: "none",
      },
      h5: {
        family: "'Segoe UI', Calibri, Arial, sans-serif",
        size: 11, weight: 700, color: "#000000", lineHeight: 1.3,
        marginTop: 8, marginBottom: 4,
        decoration: "none",
      },
      h6: {
        family: "'Segoe UI', Calibri, Arial, sans-serif",
        size: 11, weight: 600, color: "#000000", lineHeight: 1.3,
        marginTop: 6, marginBottom: 4,
        decoration: "none",
      },
      paragraphSpacing: 6,
      paragraphIndent: undefined,
      dropCap: false,
    },
    codeBlock: {
      background: "#F5F5F5",
      textColor: "#000000",
      borderLeft: undefined,
      borderRadius: 3,
      padding: 8,
      theme: "none",
      showLineNumbers: false,
    },
    inlineCode: {
      background: "#F5F5F5",
      textColor: "#000000",
      borderRadius: 2,
    },
    blockquote: {
      style: "minimal",
      background: "#F9F9F9",
      borderLeft: { width: 3, color: "#CCCCCC" },
      italic: false,
      padding: 8,
    },
    table: {
      style: "classic",
      headerBackground: "#EEEEEE",
      headerColor: "#000000",
      rowBackground: "#FFFFFF",
      rowAltBackground: "#FFFFFF",
      borderColor: "#CCCCCC",
      borderWidth: 1,
      cellPadding: 6,
      fontSize: 11,
    },
    list: {
      bulletStyle: "disc",
      indent: 24,
      spacing: 2,
      numberStyle: "decimal",
    },
    image: {
      align: "left",
      maxWidth: "100%",
      borderRadius: 0,
      shadow: false,
      caption: false,
    },
    link: {
      color: "#0000EE",
      underline: true,
    },
    structure: {
      cover: {
        enabled: false,
        layout: "minimal",
        showTitle: false,
        showSubtitle: false,
        showAuthor: false,
        showDate: false,
        showLogo: false,
      },
      toc: {
        enabled: false,
        title: "Contents",
        maxDepth: 3,
        showPageNumbers: false,
        style: "minimal",
      },
      header: { enabled: false, showOnFirstPage: false, align: "right", fontSize: 9, color: "#666666" },
      footer: { enabled: false, showOnFirstPage: false, align: "center", fontSize: 9, color: "#666666" },
      pageNumbers: { enabled: false, position: "bottom-center", format: "{n}", startFrom: 1, fontSize: 9, color: "#666666" },
      h1NewPage: false,
      h2NewPage: false,
    },
  }),
};
