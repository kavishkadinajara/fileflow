/**
 * Cloud template cache.
 *
 * Pulls the current user's templates + (optionally) the community list,
 * caches them in-memory, and re-fetches whenever the user signs in/out.
 *
 * The store self-disables when Supabase isn't configured.
 */
import { listMyTemplates, listPublicTemplates, type CloudTemplate } from "@/lib/supabase/templates";
import { getSupabase } from "@/lib/supabase/client";
import { create } from "zustand";

interface CloudTemplatesState {
  mine: CloudTemplate[];
  community: CloudTemplate[];
  loadingMine: boolean;
  loadingCommunity: boolean;
  error: string | null;
  refreshMine: () => Promise<void>;
  refreshCommunity: () => Promise<void>;
  /** Wire up automatic refresh on auth changes (idempotent). */
  bindAuth: () => void;
}

let authBound = false;

export const useCloudTemplatesStore = create<CloudTemplatesState>((set, get) => ({
  mine: [],
  community: [],
  loadingMine: false,
  loadingCommunity: false,
  error: null,

  refreshMine: async () => {
    if (!getSupabase()) return;
    set({ loadingMine: true, error: null });
    try {
      const mine = await listMyTemplates();
      set({ mine, loadingMine: false });
    } catch (e) {
      set({ loadingMine: false, error: e instanceof Error ? e.message : String(e) });
    }
  },

  refreshCommunity: async () => {
    if (!getSupabase()) return;
    set({ loadingCommunity: true, error: null });
    try {
      const community = await listPublicTemplates({ limit: 60 });
      set({ community, loadingCommunity: false });
    } catch (e) {
      set({ loadingCommunity: false, error: e instanceof Error ? e.message : String(e) });
    }
  },

  bindAuth: () => {
    if (authBound) return;
    const supabase = getSupabase();
    if (!supabase) return;
    authBound = true;
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) get().refreshMine();
      else set({ mine: [] });
    });
    // Initial load if already signed in
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) get().refreshMine();
    });
  },
}));
