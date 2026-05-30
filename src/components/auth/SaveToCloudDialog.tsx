"use client";

/**
 * "Save to cloud" modal — captures the metadata Supabase needs before insert.
 *
 * Shown from the Studio toolbar. Prompts for name (pre-filled), description,
 * category, tags, and a public/private toggle. If the user isn't signed in,
 * defers to the AuthDialog first, then resumes the save flow.
 */
import { AuthDialog } from "@/components/auth/AuthDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/authStore";
import { useCloudTemplatesStore } from "@/store/cloudTemplatesStore";
import { saveTemplate, updateTemplate } from "@/lib/supabase/templates";
import type { StyleConfig, TemplateCategory } from "@/types/style";
import { CheckCircle2, Cloud, Globe, Loader2, Lock } from "lucide-react";
import { useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  style: StyleConfig;
  /** When supplied, the dialog updates that template instead of creating a new one. */
  existingId?: string;
}

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: "academic",  label: "Academic" },
  { value: "business",  label: "Business" },
  { value: "creative",  label: "Creative" },
  { value: "technical", label: "Technical" },
  { value: "personal",  label: "Personal" },
  { value: "minimal",   label: "Minimal" },
];

export function SaveToCloudDialog({ open, onOpenChange, style, existingId }: Props) {
  const user = useAuthStore((s) => s.user);
  const refreshMine = useCloudTemplatesStore((s) => s.refreshMine);

  const [authOpen, setAuthOpen] = useState(false);
  const [name, setName] = useState(style.name);
  const [description, setDescription] = useState(style.description ?? "");
  const [category, setCategory] = useState<TemplateCategory>("minimal");
  const [tagsRaw, setTagsRaw] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!user) {
    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-primary" /> Sign in to save
              </DialogTitle>
              <DialogDescription className="text-xs">
                Cloud-save lets you access your styles from any device and optionally share with the community.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button size="sm" onClick={() => { onOpenChange(false); setAuthOpen(true); }}>Sign in</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      </>
    );
  }

  async function handleSave() {
    setError(null); setBusy(true);
    try {
      const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
      const payload = {
        name: name.trim() || "Untitled Style",
        description: description.trim(),
        category,
        tags,
        config: style,
        isPublic,
      };
      if (existingId) await updateTemplate(existingId, payload);
      else await saveTemplate(payload);
      await refreshMine();
      setDone(true);
      setTimeout(() => { setDone(false); onOpenChange(false); }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-primary" />
            {existingId ? "Update cloud template" : "Save to cloud"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {existingId
              ? "Update the saved template with your latest changes."
              : "Save this style to your account so you can use it from any device."}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="text-center py-6 space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-medium">Saved!</p>
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            <Field label="Name">
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                className="w-full h-8 px-2 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </Field>
            <Field label="Description" hint="Shown in your gallery and (if public) the community gallery.">
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-2 py-1.5 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Category">
                <select
                  value={category} onChange={(e) => setCategory(e.target.value as TemplateCategory)}
                  className="w-full h-8 px-2 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                >
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Tags" hint="comma-separated">
                <input
                  value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)}
                  placeholder="thesis, blue, formal"
                  className="w-full h-8 px-2 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </Field>
            </div>

            <label className="flex items-start gap-2 p-2.5 rounded-lg border border-input bg-muted/30 cursor-pointer hover:border-primary/40 transition-colors">
              <input
                type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-input text-primary focus:ring-1 focus:ring-primary/40 shrink-0"
              />
              <div className="min-w-0">
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  {isPublic ? <Globe className="h-3 w-3 text-emerald-600" /> : <Lock className="h-3 w-3 text-muted-foreground" />}
                  {isPublic ? "Public — visible in community gallery" : "Private — only you can see this"}
                </span>
                <span className="block text-[10px] text-muted-foreground mt-0.5">
                  You can change this any time later.
                </span>
              </div>
            </label>

            {error && (
              <div className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded p-2">
                {error}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
              <Button
                size="sm" onClick={handleSave} disabled={busy}
                className="bg-gradient-brand text-white border-0 hover:opacity-90"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (existingId ? "Update" : "Save")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
        {label}
        {hint && <span className="ml-1 normal-case text-[9px] text-muted-foreground/70">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}
