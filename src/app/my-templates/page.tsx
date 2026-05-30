"use client";

/**
 * /my-templates — list of cloud templates owned by the signed-in user.
 *
 * Each card shows the same thumbnail used in the Style Gallery, plus
 * actions: open in Studio (edit), apply directly to the converter, toggle
 * public/private, and delete.
 */
import { AuthDialog } from "@/components/auth/AuthDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isCloudEnabled } from "@/lib/supabase/client";
import { deleteTemplate, updateTemplate } from "@/lib/supabase/templates";
import { TemplateThumbnail } from "@/lib/styles/thumbnail";
import { useAuthStore } from "@/store/authStore";
import { useCloudTemplatesStore } from "@/store/cloudTemplatesStore";
import { useStudioStore } from "@/store/studioStore";
import { useToast } from "@/hooks/use-toast";
import { Cloud, Edit3, Globe, Loader2, Lock, Trash2, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function MyTemplatesPage() {
  const router = useRouter();
  const initAuth = useAuthStore((s) => s.init);
  const ready = useAuthStore((s) => s.ready);
  const user = useAuthStore((s) => s.user);
  const { mine, loadingMine, refreshMine, bindAuth } = useCloudTemplatesStore();
  const saveCustom = useStudioStore((s) => s.saveCustom);
  const { toast } = useToast();
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => { initAuth(); bindAuth(); }, [initAuth, bindAuth]);
  useEffect(() => { if (user) refreshMine(); }, [user, refreshMine]);

  if (!isCloudEnabled()) {
    return (
      <div className="container max-w-screen-md py-12 text-center space-y-3">
        <Cloud className="h-10 w-10 text-muted-foreground mx-auto" />
        <h1 className="text-xl font-semibold">Cloud sync not configured</h1>
        <p className="text-xs text-muted-foreground">
          Add <code className="px-1 py-0.5 rounded bg-muted text-[10px]">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="px-1 py-0.5 rounded bg-muted text-[10px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable.
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="container max-w-screen-md py-12 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="container max-w-screen-md py-12 text-center space-y-4">
          <Cloud className="h-10 w-10 text-primary mx-auto" />
          <h1 className="text-xl font-semibold">Sign in to see your templates</h1>
          <p className="text-xs text-muted-foreground">
            Cloud-saved styles are accessible from any device once you sign in.
          </p>
          <Button onClick={() => setAuthOpen(true)}>Sign in</Button>
        </div>
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      </>
    );
  }

  async function handleTogglePublic(id: string, name: string, current: boolean) {
    try {
      await updateTemplate(id, { isPublic: !current });
      await refreshMine();
      toast({ title: current ? "Made private" : "Published", description: `"${name}" is now ${current ? "private" : "visible in the community gallery"}.` });
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteTemplate(id);
      await refreshMine();
      toast({ title: "Deleted", description: `"${name}" has been removed.` });
    } catch (e) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    }
  }

  return (
    <div className="container max-w-screen-xl py-6 space-y-4">
      <div className="animate-fade-up flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            My Templates
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Styles you&apos;ve saved to the cloud — accessible from any device.
          </p>
        </div>
        <Button onClick={() => router.push("/studio")} size="sm" className="bg-gradient-brand text-white border-0 hover:opacity-90">
          + New style
        </Button>
      </div>

      {loadingMine && mine.length === 0 ? (
        <div className="py-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
        </div>
      ) : mine.length === 0 ? (
        <div className="py-16 text-center space-y-3 border border-dashed rounded-xl">
          <Cloud className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
          <p className="text-sm text-muted-foreground">No cloud templates yet</p>
          <Button size="sm" variant="outline" onClick={() => router.push("/studio")}>
            Build your first style →
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {mine.map((t, i) => (
            <div key={t.id} className="animate-fade-up rounded-xl border bg-card overflow-hidden flex flex-col" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="bg-muted/20 p-3 flex items-center justify-center">
                <TemplateThumbnail config={t.config} width={150} height={210} />
              </div>
              <div className="p-3 space-y-2 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-1">
                  <h4 className="text-xs font-semibold truncate flex-1" title={t.name}>{t.name}</h4>
                  {t.is_public
                    ? <Badge variant="outline" className="text-[9px] py-0 gap-0.5"><Globe className="h-2.5 w-2.5" /> Public</Badge>
                    : <Badge variant="outline" className="text-[9px] py-0 gap-0.5"><Lock className="h-2.5 w-2.5" /> Private</Badge>}
                </div>
                {t.description && (
                  <p className="text-[10px] text-muted-foreground line-clamp-2 leading-snug">{t.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {t.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[9px] py-0">{tag}</Badge>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1 pt-2 mt-auto">
                  <Button
                    size="sm" variant="outline" className="h-7 text-[10px] gap-1"
                    onClick={() => { saveCustom(t.config); router.push("/?customStyle=applied#converter-workspace"); }}
                  >
                    <Wand2 className="h-2.5 w-2.5" /> Apply
                  </Button>
                  <Button
                    size="sm" variant="outline" className="h-7 text-[10px] gap-1"
                    onClick={() => { saveCustom(t.config); router.push("/studio"); }}
                  >
                    <Edit3 className="h-2.5 w-2.5" /> Edit
                  </Button>
                  <Button
                    size="sm" variant="outline" className="h-7 text-[10px] gap-1"
                    onClick={() => handleTogglePublic(t.id, t.name, t.is_public)}
                  >
                    {t.is_public ? <Lock className="h-2.5 w-2.5" /> : <Globe className="h-2.5 w-2.5" />}
                    {t.is_public ? "Make private" : "Make public"}
                  </Button>
                  <Button
                    size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={() => handleDelete(t.id, t.name)}
                  >
                    <Trash2 className="h-2.5 w-2.5" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
