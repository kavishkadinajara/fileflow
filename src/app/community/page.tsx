"use client";

/**
 * /community — browse public styles shared by other users.
 *
 * Sorted by fork_count then recency. Anyone (signed in or not) can browse;
 * forking requires sign-in. Each card has an Apply (one-click use without
 * saving) and Fork (clone into the user's library) action.
 */
import { AuthDialog } from "@/components/auth/AuthDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isCloudEnabled } from "@/lib/supabase/client";
import { forkTemplate } from "@/lib/supabase/templates";
import { TemplateThumbnail } from "@/lib/styles/thumbnail";
import { useAuthStore } from "@/store/authStore";
import { useCloudTemplatesStore } from "@/store/cloudTemplatesStore";
import { useStudioStore } from "@/store/studioStore";
import { useToast } from "@/hooks/use-toast";
import type { CloudTemplate } from "@/lib/supabase/templates";
import type { TemplateCategory } from "@/types/style";
import { Cloud, GitFork, Globe, LayoutGrid, Loader2, Search, Users, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const CATEGORIES: { value: TemplateCategory | "all"; label: string }[] = [
  { value: "all",       label: "All" },
  { value: "academic",  label: "Academic" },
  { value: "business",  label: "Business" },
  { value: "creative",  label: "Creative" },
  { value: "technical", label: "Technical" },
  { value: "personal",  label: "Personal" },
  { value: "minimal",   label: "Minimal" },
];

export default function CommunityPage() {
  const router = useRouter();
  const init = useAuthStore((s) => s.init);
  const user = useAuthStore((s) => s.user);
  const { community, loadingCommunity, refreshCommunity, refreshMine } = useCloudTemplatesStore();
  const saveCustom = useStudioStore((s) => s.saveCustom);
  const { toast } = useToast();
  const [category, setCategory] = useState<TemplateCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [forking, setForking] = useState<string | null>(null);

  useEffect(() => { init(); refreshCommunity(); }, [init, refreshCommunity]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return community.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q)
          || t.description.toLowerCase().includes(q)
          || t.tags.some((tag) => tag.toLowerCase().includes(q));
    });
  }, [community, category, query]);

  if (!isCloudEnabled()) {
    return (
      <div className="container max-w-screen-md py-12 text-center space-y-3">
        <Cloud className="h-10 w-10 text-muted-foreground mx-auto" />
        <h1 className="text-xl font-semibold">Cloud sync not configured</h1>
        <p className="text-xs text-muted-foreground">
          The community gallery requires Supabase to be set up.
        </p>
      </div>
    );
  }

  async function handleFork(t: CloudTemplate) {
    if (!user) { setAuthOpen(true); return; }
    setForking(t.id);
    try {
      await forkTemplate(t.id);
      await refreshMine();
      await refreshCommunity();
      toast({ title: "Style forked!", description: `"${t.name}" added to My Templates.` });
      router.push("/my-templates");
    } catch (e) {
      toast({ title: "Fork failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setForking(null);
    }
  }

  function handleApply(t: CloudTemplate) {
    saveCustom(t.config);
    router.push("/?customStyle=applied#converter-workspace");
  }

  return (
    <div className="container max-w-screen-xl py-6 space-y-4">
      <div className="animate-fade-up">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Community Styles
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Styles shared by the FileFlowOne community — apply instantly or fork to customise.
        </p>
      </div>

      <div className="space-y-3 sticky top-16 z-10 bg-background/95 backdrop-blur py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search styles by name or tag..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                category === c.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-background border border-input hover:bg-muted"
              }`}
            >
              {c.value === "all" && <LayoutGrid className="h-3.5 w-3.5" />}
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {loadingCommunity && community.length === 0 ? (
        <div className="py-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center space-y-2 border border-dashed rounded-xl">
          <Globe className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
          <p className="text-sm text-muted-foreground">
            {community.length === 0
              ? "No community styles published yet — be the first!"
              : "No styles match your filters"}
          </p>
          {community.length === 0 && (
            <Button size="sm" variant="outline" onClick={() => router.push("/studio")}>
              Create one →
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((t, i) => (
            <div key={t.id} className="animate-fade-up rounded-xl border bg-card overflow-hidden flex flex-col" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="bg-muted/20 p-3 flex items-center justify-center">
                <TemplateThumbnail config={t.config} width={150} height={210} />
              </div>
              <div className="p-3 space-y-2 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-1">
                  <h4 className="text-xs font-semibold truncate flex-1" title={t.name}>{t.name}</h4>
                  {t.fork_count > 0 && (
                    <Badge variant="outline" className="text-[9px] py-0 gap-0.5">
                      <GitFork className="h-2.5 w-2.5" /> {t.fork_count}
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground capitalize">{t.category}</p>
                {t.description && (
                  <p className="text-[10px] text-muted-foreground line-clamp-2 leading-snug">{t.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {t.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[9px] py-0">{tag}</Badge>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1 pt-2 mt-auto">
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => handleApply(t)}>
                    <Wand2 className="h-2.5 w-2.5" /> Apply
                  </Button>
                  <Button
                    size="sm" variant="outline" className="h-7 text-[10px] gap-1"
                    onClick={() => handleFork(t)} disabled={forking === t.id}
                  >
                    {forking === t.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <GitFork className="h-2.5 w-2.5" />}
                    Fork
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
