/**
 * Cloud-template CRUD via Supabase.
 *
 * Templates are stored in the `style_templates` table with row-level security:
 *   - Anyone can SELECT rows where is_public = true
 *   - Authenticated users can SELECT/INSERT/UPDATE/DELETE their own rows
 *
 * The JSON config column holds the full StyleConfig — Supabase's `jsonb`
 * type validates structure on insert.
 */
import { requireSupabase } from "@/lib/supabase/client";
import type { StyleConfig } from "@/types/style";
import type { TemplateCategory } from "@/types/style";

export interface CloudTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  config: StyleConfig;
  is_public: boolean;
  fork_count: number;
  /** id of the template this was forked from, if any */
  forked_from: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveTemplateInput {
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  config: StyleConfig;
  isPublic: boolean;
  forkedFrom?: string;
}

/** Save a new template owned by the current user. */
export async function saveTemplate(input: SaveTemplateInput): Promise<CloudTemplate> {
  const supabase = requireSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to save templates to the cloud");

  const row = {
    user_id: user.id,
    name: input.name,
    description: input.description,
    category: input.category,
    tags: input.tags,
    config: input.config,
    is_public: input.isPublic,
    forked_from: input.forkedFrom ?? null,
  };

  const { data, error } = await supabase
    .from("style_templates")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as CloudTemplate;
}

/** Update an existing template (owner only — RLS enforces). */
export async function updateTemplate(id: string, input: Partial<SaveTemplateInput>): Promise<CloudTemplate> {
  const supabase = requireSupabase();
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined)        patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.category !== undefined)    patch.category = input.category;
  if (input.tags !== undefined)        patch.tags = input.tags;
  if (input.config !== undefined)      patch.config = input.config;
  if (input.isPublic !== undefined)    patch.is_public = input.isPublic;
  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("style_templates")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as CloudTemplate;
}

/** Delete a template (owner only). */
export async function deleteTemplate(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("style_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** List the current user's templates (newest first). */
export async function listMyTemplates(): Promise<CloudTemplate[]> {
  const supabase = requireSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("style_templates")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CloudTemplate[];
}

/** List public templates from the community gallery. */
export async function listPublicTemplates(opts?: { category?: TemplateCategory; limit?: number }): Promise<CloudTemplate[]> {
  const supabase = requireSupabase();
  let query = supabase
    .from("style_templates")
    .select("*")
    .eq("is_public", true)
    .order("fork_count", { ascending: false })
    .order("created_at", { ascending: false });
  if (opts?.category) query = query.eq("category", opts.category);
  if (opts?.limit)    query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as CloudTemplate[];
}

/** Fork a public template into the current user's collection. */
export async function forkTemplate(sourceId: string): Promise<CloudTemplate> {
  const supabase = requireSupabase();
  const { data: src, error: srcErr } = await supabase
    .from("style_templates")
    .select("*")
    .eq("id", sourceId)
    .single();
  if (srcErr || !src) throw new Error(srcErr?.message ?? "Template not found");

  // Increment fork count via SECURITY DEFINER function (bypasses RLS on
  // non-owned rows). Best-effort — fork still succeeds if this errors.
  await supabase.rpc("increment_fork_count", { template_id: sourceId });

  return saveTemplate({
    name: `${src.name} (fork)`,
    description: src.description,
    category: src.category,
    tags: src.tags,
    config: src.config,
    isPublic: false,
    forkedFrom: sourceId,
  });
}

/** Fetch a single template by id (public or owned). */
export async function getTemplateById(id: string): Promise<CloudTemplate | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("style_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as CloudTemplate) ?? null;
}
