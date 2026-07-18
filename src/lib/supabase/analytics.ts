/**
 * Usage analytics — admin-facing aggregates over conversion history.
 *
 * These read ONLY aggregate counts (via the `popular_formats` SECURITY DEFINER
 * function), never row-level user data, so the privacy posture holds: an admin
 * sees "MD→PDF ran 120 times", never who ran it or what was in the files.
 */
import { getSupabase } from "@/lib/supabase/client";

export interface FormatPopularity {
  source_format: string;
  target_format: string;
  runs: number;
}

/** Most-used conversion format pairs, most popular first. */
export async function popularFormats(limit = 20): Promise<FormatPopularity[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("popular_formats", { p_limit: limit });
  if (error) throw new Error(error.message);
  return (data ?? []) as FormatPopularity[];
}
