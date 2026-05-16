/**
 * Template Registry — built-in professional templates.
 *
 * Each template overrides only what differs from the DEFAULT_STYLE.
 * To add a new template: create a new file in this directory and register it here.
 */
import type { Template, TemplateCategory } from "@/types/style";
import { academic } from "./academic";
import { businessReport } from "./businessReport";
import { minimalist } from "./minimalist";
import { magazine } from "./magazine";
import { ebook } from "./ebook";
import { thesis } from "./thesis";
import { resume } from "./resume";
import { technical } from "./technical";
import { modernColorful } from "./modernColorful";
import { classicLetter } from "./classicLetter";
import { blog } from "./blog";
import { pitchDeck } from "./pitchDeck";

export const BUILTIN_TEMPLATES: Template[] = [
  thesis,
  academic,
  businessReport,
  technical,
  modernColorful,
  magazine,
  ebook,
  blog,
  resume,
  classicLetter,
  pitchDeck,
  minimalist,
].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

export function getTemplate(id: string): Template | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: TemplateCategory): Template[] {
  return BUILTIN_TEMPLATES.filter((t) => t.category === category);
}

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string; icon: string }[] = [
  { id: "academic", label: "Academic", icon: "GraduationCap" },
  { id: "business", label: "Business", icon: "Briefcase" },
  { id: "creative", label: "Creative", icon: "Palette" },
  { id: "technical", label: "Technical", icon: "Code" },
  { id: "personal", label: "Personal", icon: "User" },
  { id: "minimal", label: "Minimal", icon: "Minus" },
];
