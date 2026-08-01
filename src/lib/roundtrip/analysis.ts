/**
 * Round-Trip Fidelity — analysis core (research gap 10: round-trip conversion
 * degradation is unmeasured).
 *
 * This module is the deterministic brain of the tracker. It does NOT convert or
 * embed anything — it plans conversion chains, turns per-hop SFI scores into the
 * two quantities the research actually cares about (LOCAL vs CUMULATIVE fidelity),
 * builds the degradation curve, and recommends the least-lossy path between two
 * formats. Keeping it pure makes every number reproducible and unit-testable.
 *
 * Key idea (the novel bit): a single conversion's SFI only tells you the loss of
 * that one leg. What a legal/medical user needs is the *accumulated* drift after a
 * document has passed through several formats. We measure both:
 *   • local retention  — hop_k scored against hop_{k-1}   (how bad was THIS step)
 *   • cumulative fidelity — hop_k scored against the ORIGINAL (total drift so far)
 * The gap between them exposes silent, compounding loss that no per-conversion
 * score can reveal.
 */

import type { FileFormat } from "@/types";

/** Formats that participate in text/document round-trips. */
export const RT_FORMATS: FileFormat[] = ["md", "html", "docx", "pdf", "txt"];

/**
 * Directed conversion edges among round-trip formats (subset of the app's
 * SUPPORTED_CONVERSIONS relevant here). Used to validate chains and to enumerate
 * alternative paths for the recommendation engine.
 */
export const RT_EDGES: Record<string, FileFormat[]> = {
  md:   ["html", "pdf", "docx", "txt"],
  html: ["md", "pdf", "docx", "txt"],
  docx: ["html", "md", "txt", "pdf"],
  pdf:  ["md", "html", "txt", "docx"],
  txt:  ["md", "html", "pdf"],
};

export function canConvert(from: FileFormat, to: FileFormat): boolean {
  return (RT_EDGES[from] ?? []).includes(to);
}

/** A chain is valid if every consecutive hop is a supported conversion. */
export function isValidChain(chain: FileFormat[]): boolean {
  if (chain.length < 2) return false;
  for (let i = 0; i < chain.length - 1; i++) {
    if (!canConvert(chain[i], chain[i + 1])) return false;
  }
  return true;
}

// ── Per-hop score shape (mirrors the SFI service response we consume) ──────────

export interface HopSfi {
  sfi_score: number;                    // 0..1
  grade: "A" | "B" | "C" | "D" | "F";
  breakdown: {
    structural: { score: number };
    semantic:   { score: number };
    functional: { score: number };
  };
}

export interface RoundTripHop {
  index: number;                 // 1-based hop number
  from: FileFormat;
  to: FileFormat;
  /** SFI of this hop's output vs the immediately previous artifact. */
  local: HopSfi;
  /** SFI of this hop's output vs the ORIGINAL document (cumulative drift). */
  cumulative: HopSfi;
}

export interface RoundTripReport {
  chain: FileFormat[];
  hops: RoundTripHop[];
  /** Cumulative fidelity after the final hop (vs original). */
  finalFidelity: number;
  /** Product of local retentions — the "multiplicative" loss model. */
  compoundedLocal: number;
  /** Largest single-hop drop in cumulative fidelity, with where it happened. */
  worstHop: { index: number; from: FileFormat; to: FileFormat; drop: number } | null;
  /** Human-readable verdict. */
  verdict: string;
  /** Points for the degradation curve (x = hop index, y = cumulative fidelity). */
  curve: { hop: number; cumulative: number; local: number }[];
}

/**
 * Assemble the report from the measured hops. `original` is implicitly curve
 * point 0 at fidelity 1.0 (the document compared with itself).
 */
export function buildReport(chain: FileFormat[], hops: RoundTripHop[]): RoundTripReport {
  const curve = [
    { hop: 0, cumulative: 1, local: 1 },
    ...hops.map((h) => ({ hop: h.index, cumulative: h.cumulative.sfi_score, local: h.local.sfi_score })),
  ];

  const finalFidelity = hops.length ? hops[hops.length - 1].cumulative.sfi_score : 1;
  const compoundedLocal = hops.reduce((acc, h) => acc * h.local.sfi_score, 1);

  // Worst hop = biggest drop in cumulative fidelity from the previous point.
  let worstHop: RoundTripReport["worstHop"] = null;
  let prev = 1;
  for (const h of hops) {
    const drop = prev - h.cumulative.sfi_score;
    if (!worstHop || drop > worstHop.drop) {
      worstHop = { index: h.index, from: h.from, to: h.to, drop: round(drop) };
    }
    prev = h.cumulative.sfi_score;
  }

  return {
    chain,
    hops,
    finalFidelity: round(finalFidelity),
    compoundedLocal: round(compoundedLocal),
    worstHop,
    verdict: verdictFor(finalFidelity, worstHop),
    curve: curve.map((c) => ({ hop: c.hop, cumulative: round(c.cumulative), local: round(c.local) })),
  };
}

function verdictFor(finalFidelity: number, worst: RoundTripReport["worstHop"]): string {
  const pct = Math.round(finalFidelity * 100);
  if (finalFidelity >= 0.85) return `Safe round trip — ${pct}% of meaning survives the full chain.`;
  if (finalFidelity >= 0.70) return `Mostly safe — ${pct}% retained; review formatting-sensitive content.`;
  if (finalFidelity >= 0.55) {
    const where = worst ? ` The ${worst.from.toUpperCase()}→${worst.to.toUpperCase()} step lost the most.` : "";
    return `Lossy — only ${pct}% retained.${where}`;
  }
  return `Unsafe — ${pct}% retained. Significant meaning was lost; avoid this path for important documents.`;
}

// ── Path recommendation ────────────────────────────────────────────────────────
//
// Given a start and end format, enumerate simple paths (no repeated interior
// format) up to a length bound and rank them. Because we haven't measured every
// path, ranking uses a static *edge-cost prior* derived from format capability:
// converting INTO a lossy sink (pdf/txt) mid-chain and back out is the classic
// degradation trap, so those edges cost more. This gives an a-priori "safe path"
// suggestion the user can then verify empirically by running it.

/** A-priori loss cost of a single hop (0 = lossless-ish, higher = riskier). */
export function edgeCost(from: FileFormat, to: FileFormat): number {
  // Entering a lossy sink destroys structure/links; leaving one can't recover it.
  const LOSSY = new Set<FileFormat>(["pdf", "txt"]);
  let cost = 0.05;                       // base cost of any transformation
  if (LOSSY.has(to)) cost += to === "pdf" ? 0.35 : 0.45;   // txt is the most destructive
  if (LOSSY.has(from)) cost += 0.25;     // re-parsing a lossy artifact is unreliable
  // md/html/docx interconversions are comparatively faithful.
  return cost;
}

export interface PathSuggestion {
  path: FileFormat[];
  predictedRetention: number;   // 0..1, from compounded (1 - edgeCost)
  hops: number;
}

/** Enumerate simple paths start→end (interior formats distinct), bounded length. */
export function enumeratePaths(start: FileFormat, end: FileFormat, maxHops = 4): FileFormat[][] {
  const out: FileFormat[][] = [];
  const walk = (node: FileFormat, path: FileFormat[]) => {
    if (path.length - 1 > maxHops) return;
    if (node === end && path.length >= 2) { out.push([...path]); return; }
    for (const next of RT_EDGES[node] ?? []) {
      // Allow revisiting `end` only as the terminal; keep interior nodes unique.
      if (next !== end && path.includes(next)) continue;
      if (next === end || !path.includes(next)) walk(next, [...path, next]);
    }
  };
  walk(start, [start]);
  // De-dupe (a node can reach end by the terminal rule more than once).
  const seen = new Set<string>();
  return out.filter((p) => { const k = p.join(">"); if (seen.has(k)) return false; seen.add(k); return true; });
}

/** Rank start→end paths by predicted retention (best first). */
export function recommendPaths(start: FileFormat, end: FileFormat, maxHops = 4, limit = 5): PathSuggestion[] {
  const paths = enumeratePaths(start, end, maxHops);
  const scored = paths.map((path) => {
    let retention = 1;
    for (let i = 0; i < path.length - 1; i++) retention *= 1 - edgeCost(path[i], path[i + 1]);
    return { path, predictedRetention: round(retention), hops: path.length - 1 };
  });
  scored.sort((a, b) => b.predictedRetention - a.predictedRetention || a.hops - b.hops);
  return scored.slice(0, limit);
}

function round(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}
