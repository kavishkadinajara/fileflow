/**
 * ATS scan history — persistence for résumé scan results so users can track
 * their match score improving over time.
 *
 * Privacy-by-design: we store the four sub-scores, the overall score, and a
 * one-way SHA-256 hash of the job description (so two scans against the same JD
 * can be grouped without ever keeping the JD text). The résumé itself and the JD
 * text are NEVER stored — only the matched/missing skill *names* per scan.
 *
 * The scan header + its skill rows are written atomically via the
 * `record_ats_scan` Postgres function (one transaction → never a header without
 * its details). RLS restricts every row to its owner.
 */
import { requireSupabase, getSupabase } from "@/lib/supabase/client";
import type { AtsReport } from "@/lib/ats";

export interface AtsScanRow {
  id: string;
  user_id: string;
  resume_name: string;
  jd_hash: string;
  overall: number;
  score_keyword: number;
  score_skills: number;
  score_similarity: number;
  score_format: number;
  created_at: string;
}

export interface AtsScanSkillRow {
  id: string;
  scan_id: string;
  skill: string;
  matched: boolean;
  category: string;
}

/** A scan plus its skill rows, for the detail view. */
export interface AtsScanDetail extends AtsScanRow {
  skills: AtsScanSkillRow[];
}

/** SHA-256 of the job description (one-way, so we never store the JD text). */
async function hashJd(jd: string): Promise<string> {
  const data = new TextEncoder().encode(jd.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Skill payload for the atomic insert function. */
function skillsPayload(report: AtsReport): Array<{ skill: string; matched: boolean; category: string }> {
  const rows: Array<{ skill: string; matched: boolean; category: string }> = [];
  for (const s of report.matchedSkills) rows.push({ skill: s, matched: true, category: "skill" });
  for (const s of report.missingSkills) rows.push({ skill: s, matched: false, category: "skill" });
  return rows;
}

/**
 * Persist a completed scan, keyed by a one-way hash of the job description so
 * scans against the same posting group together in the timeline.
 *
 * Best-effort: returns the new scan id, or null if cloud sync is disabled or the
 * user isn't signed in (the scan UI works fully without an account — history is
 * an enhancement, not a requirement).
 */
export async function recordScan(report: AtsReport, resumeName: string, jd: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const jd_hash = await hashJd(jd);
  const { data, error } = await supabase.rpc("record_ats_scan", {
    p_resume_name: resumeName.slice(0, 255),
    p_jd_hash: jd_hash,
    p_overall: report.overall,
    p_score_keyword: report.subScores.keywords,
    p_score_skills: report.subScores.skills,
    p_score_similarity: report.subScores.similarity,
    p_score_format: report.subScores.format,
    p_skills: skillsPayload(report),
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Timeline of the user's scans, oldest → newest (for the improvement chart). */
export async function listScans(limit = 50): Promise<AtsScanRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("ats_scans")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as AtsScanRow[];
}

/** One scan with its skill rows. */
export async function getScanDetail(scanId: string): Promise<AtsScanDetail | null> {
  const supabase = requireSupabase();
  const { data: scan, error: e1 } = await supabase
    .from("ats_scans")
    .select("*")
    .eq("id", scanId)
    .maybeSingle();
  if (e1) throw new Error(e1.message);
  if (!scan) return null;

  const { data: skills, error: e2 } = await supabase
    .from("ats_scan_skills")
    .select("*")
    .eq("scan_id", scanId)
    .order("matched", { ascending: false });
  if (e2) throw new Error(e2.message);

  return { ...(scan as AtsScanRow), skills: (skills ?? []) as AtsScanSkillRow[] };
}

/**
 * Skills the user keeps missing across recent scans (the persistent gap report).
 * Aggregates the junction table client-side from the returned rows.
 */
export async function persistentGaps(limit = 10): Promise<Array<{ skill: string; timesMissing: number }>> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch this user's missing-skill rows via an inner join on owned scans.
  const { data, error } = await supabase
    .from("ats_scan_skills")
    .select("skill, ats_scans!inner(user_id)")
    .eq("matched", false)
    .eq("ats_scans.user_id", user.id);
  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ skill: string }>) {
    counts.set(row.skill, (counts.get(row.skill) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([skill, timesMissing]) => ({ skill, timesMissing }))
    .sort((a, b) => b.timesMissing - a.timesMissing)
    .slice(0, limit);
}

/** Delete a single scan (skill rows cascade). */
export async function deleteScan(scanId: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("ats_scans").delete().eq("id", scanId);
  if (error) throw new Error(error.message);
}

/** Clear all of the current user's scan history. */
export async function clearScans(): Promise<void> {
  const supabase = requireSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from("ats_scans").delete().eq("user_id", user.id);
  if (error) throw new Error(error.message);
}
