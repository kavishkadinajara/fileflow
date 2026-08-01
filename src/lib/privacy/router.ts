/**
 * Privacy-aware adaptive router — research gap 3.
 *
 * Decides, per document, whether an AI-assisted operation should run LOCAL (never
 * leaves the device), HYBRID (local extraction + cloud refinement of non-sensitive
 * parts), or CLOUD (send to a cloud model). Existing routing work (RouteLLM,
 * FrugalGPT, Hybrid-LLM) routes by *cost* or *difficulty* and assumes server-side
 * deployment; none treats PRIVACY as a first-class routing signal for a
 * browser/edge deployment. This does.
 *
 * Three factors, combined by an explicit decision matrix:
 *   F1 Sensitivity  — deterministic PII/sensitivity score (see sensitivity.ts).
 *                     HIGH sensitivity is an absolute veto: force LOCAL.
 *   F2 Complexity   — structural difficulty of the document (length, tables,
 *                     formulas, code, columns). Higher complexity is where a small
 *                     local model is likelier to underperform a cloud model.
 *   F3 Predicted local quality — from complexity + (optional) local-model tier.
 *                     If predicted quality is too low AND the document is not
 *                     sensitive, escalate to CLOUD.
 *
 * Every decision carries its reason, so the user sees *why* their document is or
 * isn't leaving the device.
 */

import { classifySensitivity, type SensitivityResult } from "@/lib/privacy/sensitivity";

export type Route = "LOCAL" | "HYBRID" | "CLOUD";

export interface ComplexitySignals {
  words: number;
  tables: number;
  formulas: number;
  codeBlocks: number;
  headings: number;
  links: number;
  multiColumnHint: boolean;
}

export interface ComplexityResult {
  score: number;              // 0..1
  signals: ComplexitySignals;
}

/** Deterministic structural-complexity estimate from document text. */
export function estimateComplexity(text: string): ComplexityResult {
  const words = (text.match(/\S+/g) ?? []).length;
  const tables = (text.match(/^\s*\|.*\|\s*$/gm) ?? []).length;
  const formulas = (text.match(/\$[^$\n]+\$|\\\([^)]*\\\)|\\\[[^\]]*\\\]/g) ?? []).length;
  const codeBlocks = (text.match(/```[\s\S]*?```/g) ?? []).length;
  const headings = (text.match(/^#{1,6}\s/gm) ?? []).length;
  const links = (text.match(/\[[^\]]+\]\([^)]+\)/g) ?? []).length;
  // Cheap multi-column hint: many lines with a wide internal run of spaces.
  const colLines = (text.match(/^\S.*\s{3,}\S.*$/gm) ?? []).length;
  const multiColumnHint = colLines > 8;

  const signals: ComplexitySignals = { words, tables, formulas, codeBlocks, headings, links, multiColumnHint };

  // Weighted, saturating blend. Length matters but plateaus; structure (tables,
  // formulas, code, columns) is what actually strains a small model.
  const lenScore = 1 - Math.exp(-words / 1500);          // ~0.63 at 1500 words
  const structScore = Math.min(1,
    0.12 * tables + 0.15 * formulas + 0.12 * codeBlocks +
    0.03 * headings + 0.02 * links + (multiColumnHint ? 0.25 : 0));
  const score = round(Math.min(1, 0.45 * lenScore + 0.75 * structScore));
  return { score, signals };
}

/** Local model tiers we might deploy in-browser (affects predicted quality). */
export type LocalTier = "small" | "medium";  // ~1-2B vs ~3-4B INT4

/**
 * Predicted quality of the LOCAL model on this document (0..1). Falls with
 * complexity; a larger local tier tolerates more complexity before degrading.
 * These are a-priori priors (the quantization/SLM study in the research plan is
 * what would replace them with measured curves).
 */
export function predictLocalQuality(complexity: number, tier: LocalTier = "small"): number {
  const ceiling = tier === "medium" ? 0.92 : 0.85;
  const slope = tier === "medium" ? 0.45 : 0.65;   // small model degrades faster
  return round(Math.max(0.2, ceiling - slope * complexity));
}

export interface RouteThresholds {
  sensitivityHigh: number;    // ≥ → force LOCAL
  sensitivityMed: number;     // ≥ → HYBRID unless quality forces otherwise
  qualityFloor: number;       // predicted local quality < → consider CLOUD
  complexityCloud: number;    // ≥ (with low sensitivity) → CLOUD allowed
}

export const DEFAULT_THRESHOLDS: RouteThresholds = {
  sensitivityHigh: 0.6,
  sensitivityMed: 0.3,
  qualityFloor: 0.6,
  complexityCloud: 0.7,
};

export interface RoutingDecision {
  route: Route;
  reason: string;
  sensitivity: SensitivityResult;
  complexity: ComplexityResult;
  predictedLocalQuality: number;
  factors: { sensitivity: number; complexity: number; localQuality: number };
}

/**
 * The decision matrix — deterministic, and ordered so privacy always wins ties.
 */
export function decideRoute(
  text: string,
  opts: { tier?: LocalTier; thresholds?: Partial<RouteThresholds> } = {},
): RoutingDecision {
  const th = { ...DEFAULT_THRESHOLDS, ...(opts.thresholds ?? {}) };
  const sensitivity = classifySensitivity(text);
  const complexity = estimateComplexity(text);
  const localQuality = predictLocalQuality(complexity.score, opts.tier ?? "small");

  let route: Route;
  let reason: string;

  if (sensitivity.score >= th.sensitivityHigh) {
    // Privacy veto — never leaves the device, regardless of quality cost.
    route = "LOCAL";
    reason = `High sensitivity (${pct(sensitivity.score)}): ${sensitivity.topReason}. Processed on-device only.`;
  } else if (sensitivity.score >= th.sensitivityMed) {
    // Moderately sensitive → keep the sensitive extraction local, allow cloud to
    // refine only if the local model would struggle.
    if (localQuality < th.qualityFloor && complexity.score >= th.complexityCloud) {
      route = "HYBRID";
      reason = `Moderate sensitivity with high complexity (${pct(complexity.score)}) — extract locally, refine non-sensitive parts in the cloud.`;
    } else {
      route = "LOCAL";
      reason = `Moderate sensitivity (${pct(sensitivity.score)}) and the local model is predicted adequate (${pct(localQuality)}). Kept on-device.`;
    }
  } else {
    // Low sensitivity → optimise for quality.
    if (localQuality < th.qualityFloor || complexity.score >= th.complexityCloud) {
      route = "CLOUD";
      reason = `Low sensitivity (${pct(sensitivity.score)}) but high complexity (${pct(complexity.score)}) — a cloud model will give a better result.`;
    } else {
      route = "LOCAL";
      reason = `Low sensitivity and low complexity — the fast on-device path is sufficient.`;
    }
  }

  return {
    route,
    reason,
    sensitivity,
    complexity,
    predictedLocalQuality: localQuality,
    factors: { sensitivity: sensitivity.score, complexity: complexity.score, localQuality },
  };
}

function pct(n: number): string { return `${Math.round(n * 100)}%`; }
function round(n: number): number { return Math.round(n * 100) / 100; }
