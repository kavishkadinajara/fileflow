/**
 * Browser-side Supabase client.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from env.
 * If either is missing, getSupabase() returns null and the rest of the app
 * gracefully degrades to localStorage-only mode (no cloud sync, no auth UI).
 *
 * This keeps the feature self-disabling: if a contributor or evaluator runs
 * the project without setting up Supabase, nothing crashes — they just don't
 * see the auth/cloud-template UI.
 */
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    if (typeof window !== "undefined") {
      console.info("[supabase] Cloud sync disabled — set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local to enable.");
    }
    cached = null;
    return null;
  }

  cached = createBrowserClient(url, anon);
  return cached;
}

/** Convenience: throw a helpful error if Supabase isn't configured. */
export function requireSupabase(): SupabaseClient {
  const s = getSupabase();
  if (!s) throw new Error("Cloud sync is not configured. Add Supabase env vars to .env.local.");
  return s;
}

/** Lightweight env check the UI can use to hide/show auth-only features. */
export function isCloudEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}
