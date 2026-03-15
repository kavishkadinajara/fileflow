"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TEMPLATE_CATEGORIES, TEMPLATES, type Template } from "@/lib/templates";
import { BookOpen, X } from "lucide-react";
import { useState } from "react";

interface TemplateGalleryProps {
  onSelect: (template: Template) => void;
  onClose: () => void;
}

export function TemplateGallery({ onSelect, onClose }: TemplateGalleryProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered =
    activeCategory === "all"
      ? TEMPLATES
      : TEMPLATES.filter((t) => t.category === activeCategory);

  return (
    <div className="rounded-2xl border bg-card overflow-hidden animate-fade-up shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/20">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Template Gallery</span>
          <Badge variant="secondary" className="text-[10px]">
            {TEMPLATES.length} templates
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
          aria-label="Close gallery"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1 px-4 py-2.5 border-b overflow-x-auto scrollbar-hide bg-muted/10">
        <button
          onClick={() => setActiveCategory("all")}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
            activeCategory === "all"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          All ({TEMPLATES.length})
        </button>
        {TEMPLATE_CATEGORIES.map((cat) => {
          const count = TEMPLATES.filter((t) => t.category === cat.key).length;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1",
                activeCategory === cat.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <span>{cat.icon}</span>
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 p-4 max-h-64 overflow-y-auto">
        {filtered.map((template) => (
          <button
            key={template.id}
            onClick={() => {
              onSelect(template);
              onClose();
            }}
            className="group flex flex-col items-start gap-1.5 rounded-xl border bg-background p-3 text-left transition-all duration-150 hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm active:scale-[0.98]"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-lg">{template.icon}</span>
              <Badge
                variant="secondary"
                className="text-[9px] px-1.5 py-0 h-4 font-mono uppercase"
              >
                {template.format}
              </Badge>
            </div>
            <p className="text-xs font-semibold leading-snug group-hover:text-primary transition-colors">
              {template.title}
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
              {template.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
