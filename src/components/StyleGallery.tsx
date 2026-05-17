"use client";

/**
 * Style Gallery — full-screen modal browser for built-in document style templates.
 *
 * Distinct from the (older) content TemplateGallery: this picks *visual style*
 * (fonts, colours, layout) for the converted output document, not sample
 * content. Filter by category, search by name/tag, preview the thumbnail,
 * apply with one click.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BUILTIN_TEMPLATES, TEMPLATE_CATEGORIES } from "@/lib/styles/templates";
import { TemplateThumbnail } from "@/lib/styles/thumbnail";
import type { Template, TemplateCategory } from "@/types/style";
import {
  Briefcase,
  Check,
  Code,
  GraduationCap,
  LayoutGrid,
  Minus,
  Palette,
  Search,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";

const ICON_MAP: Record<string, React.ReactNode> = {
  GraduationCap: <GraduationCap className="h-3.5 w-3.5" />,
  Briefcase: <Briefcase className="h-3.5 w-3.5" />,
  Palette: <Palette className="h-3.5 w-3.5" />,
  Code: <Code className="h-3.5 w-3.5" />,
  User: <User className="h-3.5 w-3.5" />,
  Minus: <Minus className="h-3.5 w-3.5" />,
};

interface StyleGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedId?: string;
  onSelect: (template: Template) => void;
}

export function StyleGallery({ open, onOpenChange, selectedId, onSelect }: StyleGalleryProps) {
  const [category, setCategory] = useState<TemplateCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BUILTIN_TEMPLATES.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [category, query]);

  const previewTemplate = useMemo(
    () => BUILTIN_TEMPLATES.find((t) => t.id === previewId) ?? BUILTIN_TEMPLATES.find((t) => t.id === selectedId),
    [previewId, selectedId]
  );

  function handleApply(t: Template) {
    onSelect(t);
    onOpenChange(false);
    setPreviewId(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5 text-primary" />
            Style Gallery
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pick a professional style for your output document — preview live before applying.
          </DialogDescription>
        </DialogHeader>

        {/* Search + Category filter bar */}
        <div className="px-6 py-3 border-b shrink-0 space-y-3 bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search styles by name or tag (e.g. 'thesis', 'minimal', 'code')..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setCategory("all")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                category === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-background border border-input hover:bg-muted"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              All ({BUILTIN_TEMPLATES.length})
            </button>
            {TEMPLATE_CATEGORIES.map((cat) => {
              const count = BUILTIN_TEMPLATES.filter((t) => t.category === cat.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    category === cat.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-background border border-input hover:bg-muted"
                  }`}
                >
                  {ICON_MAP[cat.icon]}
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid + preview side panel */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-[1fr_320px]">
          {/* Style grid */}
          <div className="overflow-y-auto p-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Search className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No styles match your search</p>
                <button
                  onClick={() => { setQuery(""); setCategory("all"); }}
                  className="mt-3 text-xs text-primary hover:underline"
                >Clear filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filtered.map((t) => (
                  <StyleCard
                    key={t.id}
                    template={t}
                    selected={selectedId === t.id}
                    onPreview={() => setPreviewId(t.id)}
                    onApply={() => handleApply(t)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right side: preview pane */}
          <div className="border-l bg-muted/20 overflow-y-auto p-4 hidden md:flex flex-col">
            {previewTemplate ? (
              <>
                <div className="flex items-center justify-center mb-4">
                  <TemplateThumbnail config={previewTemplate.config} width={240} height={320} />
                </div>
                <h3 className="text-sm font-bold mb-1">{previewTemplate.name}</h3>
                <Badge variant="outline" className="self-start mb-2 capitalize text-[10px]">
                  {previewTemplate.category}
                </Badge>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  {previewTemplate.description}
                </p>

                <div className="flex flex-wrap gap-1 mb-4">
                  {previewTemplate.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[9px] py-0">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Spec highlights */}
                <div className="space-y-1.5 text-[11px] text-muted-foreground mb-4">
                  <SpecRow label="Page" value={`${previewTemplate.config.page.size}${previewTemplate.config.page.orientation === "landscape" ? " L" : ""}`} />
                  <SpecRow
                    label="Body font"
                    value={previewTemplate.config.typography.body.family.split(",")[0].replace(/['"]/g, "")}
                  />
                  <SpecRow label="Body size" value={`${previewTemplate.config.typography.body.size}pt`} />
                  <SpecRow label="Cover page" value={previewTemplate.config.structure.cover.enabled ? "✓" : "—"} />
                  <SpecRow label="Table of contents" value={previewTemplate.config.structure.toc.enabled ? "✓" : "—"} />
                  <SpecRow label="Page numbers" value={previewTemplate.config.structure.pageNumbers.enabled ? "✓" : "—"} />
                </div>

                <Button
                  className="w-full bg-gradient-brand hover:opacity-90 text-white border-0"
                  onClick={() => handleApply(previewTemplate)}
                >
                  {selectedId === previewTemplate.id ? (
                    <><Check className="h-4 w-4 mr-1.5" /> Currently Applied</>
                  ) : (
                    <>Apply Style</>
                  )}
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Palette className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-xs">Click any style to preview</p>
                <p className="text-[10px] mt-1 opacity-70">Tags, fonts, sizes, and a live thumbnail</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}</span>
      <span className="font-mono text-foreground truncate" title={value}>{value}</span>
    </div>
  );
}

// ─── Style Card ─────────────────────────────────────────────────────────────

interface StyleCardProps {
  template: Template;
  selected: boolean;
  onPreview: () => void;
  onApply: () => void;
}

function StyleCard({ template, selected, onPreview, onApply }: StyleCardProps) {
  return (
    <div
      onClick={onPreview}
      onDoubleClick={onApply}
      title="Click to preview, double-click to apply"
      className={`group cursor-pointer rounded-xl border-2 transition-all overflow-hidden hover:shadow-lg hover:-translate-y-0.5 ${
        selected
          ? "border-primary shadow-md ring-2 ring-primary/20"
          : "border-input hover:border-primary/50"
      }`}
    >
      <div className="bg-muted/20 p-3 flex items-center justify-center">
        <TemplateThumbnail config={template.config} width={150} height={210} />
      </div>
      <div className="p-2.5 bg-card">
        <div className="flex items-start justify-between gap-1 mb-0.5">
          <h4 className="text-xs font-semibold truncate flex-1" title={template.name}>
            {template.name}
          </h4>
          {selected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
        </div>
        <p className="text-[10px] text-muted-foreground capitalize">{template.category}</p>
      </div>
    </div>
  );
}
