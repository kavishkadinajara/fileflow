/**
 * Conversion presets — saved per-user conversion settings (a named from→to pair
 * with its options blob) so a user can re-run a configured conversion in one click.
 *
 * RLS restricts every row to its owner. A partial unique index guarantees at most
 * one default preset per (user, from, to) combination.
 */
import { requireSupabase, getSupabase } from "@/lib/supabase/client";
import type { ConvertOptions } from "@/types";

export interface ConversionPreset {
  id: string;
  user_id: string;
  name: string;
  from_format: string;
  to_format: string;
  options: ConvertOptions;
  is_default: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface SavePresetInput {
  name: string;
  fromFormat: string;
  toFormat: string;
  options: ConvertOptions;
  isDefault?: boolean;
}

/** Create a preset owned by the current user. */
export async function savePreset(input: SavePresetInput): Promise<ConversionPreset> {
  const supabase = requireSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to save presets");

  // A unique index enforces one default per (user, from, to); clear the old
  // default first so the new one doesn't collide.
  if (input.isDefault) await clearDefault(input.fromFormat, input.toFormat);

  const { data, error } = await supabase
    .from("user_presets")
    .insert({
      user_id: user.id,
      name: input.name,
      from_format: input.fromFormat,
      to_format: input.toFormat,
      options: input.options,
      is_default: input.isDefault ?? false,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ConversionPreset;
}

/** Update a preset (owner only — RLS enforces). */
export async function updatePreset(id: string, input: Partial<SavePresetInput>): Promise<ConversionPreset> {
  const supabase = requireSupabase();

  if (input.isDefault && input.fromFormat && input.toFormat) {
    await clearDefault(input.fromFormat, input.toFormat);
  }

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined)       patch.name = input.name;
  if (input.fromFormat !== undefined) patch.from_format = input.fromFormat;
  if (input.toFormat !== undefined)   patch.to_format = input.toFormat;
  if (input.options !== undefined)    patch.options = input.options;
  if (input.isDefault !== undefined)  patch.is_default = input.isDefault;

  const { data, error } = await supabase
    .from("user_presets")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ConversionPreset;
}

/** Delete a preset. */
export async function deletePreset(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("user_presets").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** List the current user's presets (newest first). */
export async function listPresets(): Promise<ConversionPreset[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("user_presets")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ConversionPreset[];
}

/** Bump the use counter when a preset is applied (best-effort, fire-and-forget). */
export async function bumpUseCount(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  // Read-modify-write is fine here (single-user, low contention).
  const { data } = await supabase.from("user_presets").select("use_count").eq("id", id).maybeSingle();
  const next = ((data?.use_count as number) ?? 0) + 1;
  await supabase.from("user_presets").update({ use_count: next }).eq("id", id);
}

/** Clear the default flag on the current user's preset for a given format pair. */
async function clearDefault(fromFormat: string, toFormat: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("user_presets")
    .update({ is_default: false })
    .eq("user_id", user.id)
    .eq("from_format", fromFormat)
    .eq("to_format", toFormat)
    .eq("is_default", true);
}
