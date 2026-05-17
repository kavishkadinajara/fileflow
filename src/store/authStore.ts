/**
 * Auth state — wraps Supabase auth so the rest of the app reads from one place.
 *
 * The store stays in "uninitialised" state until init() is called once
 * from a top-level component. After that, onAuthStateChange keeps the
 * session synced automatically.
 */
import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { getSupabase } from "@/lib/supabase/client";

interface AuthState {
  ready: boolean;
  session: Session | null;
  user: User | null;
  /** Last auth error message, surfaced by forms. */
  error: string | null;
  /** Initialise + subscribe to Supabase auth changes (idempotent). */
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

let initialised = false;

export const useAuthStore = create<AuthState>((set) => ({
  ready: false,
  session: null,
  user: null,
  error: null,

  init: async () => {
    if (initialised) return;
    const supabase = getSupabase();
    if (!supabase) {
      set({ ready: true });
      initialised = true;
      return;
    }
    initialised = true;

    const { data } = await supabase.auth.getSession();
    set({ ready: true, session: data.session, user: data.session?.user ?? null });

    supabase.auth.onAuthStateChange((_event, newSession) => {
      set({ session: newSession, user: newSession?.user ?? null });
    });
  },

  signIn: async (email, password) => {
    const supabase = getSupabase();
    if (!supabase) return { error: "Cloud sync not configured" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: error.message });
      return { error: error.message };
    }
    set({ error: null });
    return { error: null };
  },

  signUp: async (email, password) => {
    const supabase = getSupabase();
    if (!supabase) return { error: "Cloud sync not configured" };
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ error: error.message });
      return { error: error.message };
    }
    set({ error: null });
    return { error: null };
  },

  signOut: async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));
