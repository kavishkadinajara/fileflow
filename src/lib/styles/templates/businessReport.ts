import type { Template } from "@/types/style";
import { DEFAULT_STYLE, mergeStyle } from "../defaults";

export const businessReport: Template = {
  id: "business-report",
  name: "Business Report",
  description: "Corporate, polished — bold blue accents, banner cover page, professional sans-serif body.",
  category: "business",
  tags: ["report", "corporate", "business", "executive", "professional"],
  builtin: true,
  order: 2,
  config: mergeStyle(DEFAULT_STYLE, {
    name: "Business Report",
    page: {
      margin: { top: 22, right: 22, bottom: 22, left: 22 },
    },
    colors: {
      primary: "#1E40AF",
      secondary: "#3B82F6",
      text: "#0F172A",
      muted: "#64748B",
      surface: "#F1F5F9",
      link: "#1E40AF",
      border: "#CBD5E1",
    },
    typography: {
      body: {
        family: "'Segoe UI', Calibri, sans-serif",
        size: 11,
        weight: 400,
        color: "#0F172A",
        lineHeight: 1.65,
      },
      h1: {
        family: "'Segoe UI', Calibri, sans-serif",
        size: 26, weight: 700, color: "#1E40AF", lineHeight: 1.2,
        marginTop: 28, marginBottom: 14,
        pageBreakBefore: true,
        decoration: "underline-bar",
        borderBottom: { width: 4, style: "solid", color: "#1E40AF" },
      },
      h2: {
        family: "'Segoe UI', Calibri, sans-serif",
        size: 19, weight: 700, color: "#1E40AF", lineHeight: 1.3,
        marginTop: 22, marginBottom: 10,
        decoration: "side-bar",
      },
      h3: {
        family: "'Segoe UI', Calibri, sans-serif",
        size: 15, weight: 700, color: "#0F172A", lineHeight: 1.3,
        marginTop: 16, marginBottom: 8,
      },
    },
    codeBlock: {
      background: "#0F172A",
      textColor: "#E2E8F0",
      borderLeft: { width: 4, color: "#3B82F6" },
      theme: "monokai",
    },
    blockquote: {
      style: "callout",
      background: "#EFF6FF",
      borderLeft: { width: 4, color: "#1E40AF" },
    },
    table: {
      style: "striped",
      headerBackground: "#1E40AF",
      headerColor: "#FFFFFF",
      rowAltBackground: "#F1F5F9",
    },
    list: {
      bulletStyle: "arrow",
    },
    image: { shadow: true, borderRadius: 8 },
    structure: {
      cover: {
        layout: "banner",
        showSubtitle: true,
        subtitle: "Quarterly Report",
        showAuthor: true,
        author: "Prepared by Your Team",
        accentColor: "#FFFFFF",
      },
      toc: { title: "Table of Contents", style: "modern" },
      header: { text: undefined, borderBottom: { width: 2, color: "#1E40AF" } },
      pageNumbers: { format: "Page {n} of {total}", position: "bottom-right" },
    },
  }),
};
