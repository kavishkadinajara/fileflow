import type { Template } from "@/types/style";
import { DEFAULT_STYLE, mergeStyle } from "../defaults";

export const resume: Template = {
  id: "resume",
  name: "Resume / CV",
  description: "Clean professional resume — compact, ATS-friendly, accent color for sections.",
  category: "personal",
  tags: ["resume", "cv", "job", "career", "professional"],
  builtin: true,
  order: 7,
  config: mergeStyle(DEFAULT_STYLE, {
    name: "Resume / CV",
    page: {
      margin: { top: 18, right: 18, bottom: 18, left: 18 },
    },
    colors: {
      primary: "#0F766E",
      secondary: "#14B8A6",
      text: "#0F172A",
      muted: "#64748B",
      link: "#0F766E",
      border: "#CBD5E1",
    },
    typography: {
      body: {
        family: "'Inter', 'Calibri', sans-serif",
        size: 10,
        weight: 400,
        color: "#0F172A",
        lineHeight: 1.5,
      },
      h1: {
        family: "'Inter', 'Calibri', sans-serif",
        size: 24, weight: 800, color: "#0F172A", lineHeight: 1.2,
        marginTop: 0, marginBottom: 4,
        pageBreakBefore: false,
        decoration: "none",
        borderBottom: undefined,
      },
      h2: {
        family: "'Inter', 'Calibri', sans-serif",
        size: 13, weight: 700, color: "#0F766E", lineHeight: 1.3,
        marginTop: 14, marginBottom: 6,
        textTransform: "uppercase",
        letterSpacing: 0.1,
        decoration: "none",
        borderBottom: { width: 1, style: "solid", color: "#0F766E" },
      },
      h3: {
        family: "'Inter', 'Calibri', sans-serif",
        size: 11, weight: 700, color: "#0F172A", lineHeight: 1.3,
        marginTop: 8, marginBottom: 2,
        decoration: "none",
      },
      paragraphSpacing: 4,
    },
    list: {
      bulletStyle: "disc",
      indent: 14,
      spacing: 2,
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
