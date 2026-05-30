"use client";

/**
 * Authentication dialog — combined sign-in / sign-up form.
 *
 * Single modal with a toggle at the bottom. The Auth store handles the call
 * to Supabase; this component is purely presentational + form state.
 */
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/authStore";
import { isCloudEnabled } from "@/lib/supabase/client";
import { CheckCircle2, Cloud, Loader2, Lock, Mail } from "lucide-react";
import { useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Optional initial mode. */
  initialMode?: "signin" | "signup";
}

export function AuthDialog({ open, onOpenChange, initialMode = "signin" }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error } = mode === "signin"
        ? await signIn(email, password)
        : await signUp(email, password);
      if (error) {
        setError(error);
      } else if (mode === "signup") {
        setDone(true);
      } else {
        onOpenChange(false);
        reset();
      }
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setEmail(""); setPassword(""); setError(null); setDone(false);
  }

  if (!isCloudEnabled()) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Cloud className="h-4 w-4 text-muted-foreground" /> Cloud sync not configured</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed mt-2">
              Set <code className="px-1 py-0.5 rounded bg-muted text-[10px]">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="px-1 py-0.5 rounded bg-muted text-[10px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your{" "}
              <code className="px-1 py-0.5 rounded bg-muted text-[10px]">.env.local</code> and restart the dev server.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-primary" />
            {mode === "signin" ? "Sign in" : "Create an account"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {mode === "signin"
              ? "Access your saved styles from any device."
              : "Save styles to the cloud and share with the community."}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-medium">Check your inbox</p>
            <p className="text-xs text-muted-foreground">
              We sent a confirmation link to <span className="font-mono">{email}</span>.
            </p>
            <Button variant="outline" size="sm" onClick={() => { setMode("signin"); reset(); }}>
              Back to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Email</label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-9 pl-8 pr-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Password</label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full h-9 pl-8 pr-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
            </div>

            {error && (
              <div className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded p-2">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-gradient-brand text-white border-0 hover:opacity-90"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (mode === "signin" ? "Sign in" : "Create account")}
            </Button>

            <p className="text-center text-[11px] text-muted-foreground pt-1">
              {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
                className="text-primary hover:underline font-medium"
              >
                {mode === "signin" ? "Create one" : "Sign in"}
              </button>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
