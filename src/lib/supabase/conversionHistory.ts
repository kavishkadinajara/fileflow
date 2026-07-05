/**
 * Conversion history — a per-user log of past conversions.
 *
 * Privacy-by-design: this stores ONLY metadata — the source filename, the
 * format pair, the byte size, status, and how long it took. The file bytes and
 * the converted output are never written here. RLS restricts rows to their owner.
 */
import { requireSupabase, getSupabase } from "@/lib/supabase/client";

export interface ConversionRecord {
  id: string;
  user_id: string;
  source_format: string;
  target_format: string;
  source_name: string;
  size_bytes: number;
  status: "done" | "error";
  duration_ms: number;
  created_at: string;
}

export interface LogConversionInput {
  sourceFormat: string;
  targetFormat: string;
  sourceName: string;
  sizeBytes: number;
  status?: "done" | "error";
  durationMs?: number;
}

/**
 * Record a conversion. Best-effort + fire-and-forget friendly: silently no-ops
 * when cloud sync is off or the user isn't signed in, so logging never blocks or
 * breaks the actual conversion flow.
 */
export async function logConversion(input: LogConversionInput): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("conversion_history").insert({
    user_id: user.id,
    source_format: input.sourceFormat,
    target_format: input.targetFormat,
    source_name: input.sourceName.slice(0, 255),
    size_bytes: Math.max(0, Math.round(input.sizeBytes)),
    status: input.status ?? "done",
    duration_ms: Math.max(0, Math.round(input.durationMs ?? 0)),
  });
  // Intentionally ignore errors — history is non-critical telemetry for the user.
}

/** List the current user's history, newest first. Optionally filter by format. */
export async function listHistory(opts?: {
  sourceFormat?: string;
  targetFormat?: string;
  limit?: number;
}): Promise<ConversionRecord[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("conversion_history")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (opts?.sourceFormat) query = query.eq("source_format", opts.sourceFormat);
  if (opts?.targetFormat) query = query.eq("target_format", opts.targetFormat);
  query = query.limit(opts?.limit ?? 100);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ConversionRecord[];
}

/** Delete one history row. */
export async function deleteHistoryEntry(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("conversion_history").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Clear the current user's entire history. */
export async function clearHistory(): Promise<void> {
  const supabase = requireSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from("conversion_history").delete().eq("user_id", user.id);
  if (error) throw new Error(error.message);
}
