/**
 * ConvertBench-lite — router sensitivity precision/recall bench.
 *
 * Executes the PRODUCTION classifier and decision matrix (src/lib/privacy/
 * sensitivity.ts + router.ts, imported directly under Node's type stripping —
 * no reimplementation) against the hand-labeled dataset and reports:
 *
 *   • per-category precision / recall / F1 (+ micro/macro averages)
 *   • binary sensitive-vs-clean metrics at the router's moderate threshold
 *   • the PRIVACY GUARANTEE metric: % of high-sensitivity docs routed LOCAL
 *   • route distribution by labeled level, and every disagreement listed
 *
 * Usage: node bench/router/runrouter.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SAMPLES, CATEGORIES } from "./dataset.mjs";
import { classifySensitivity } from "../../src/lib/privacy/sensitivity.ts";
import { decideRoute, DEFAULT_THRESHOLDS } from "../../src/lib/privacy/router.ts";

const BENCH = dirname(dirname(fileURLToPath(import.meta.url)));
const RESULTS = join(BENCH, "results");

/** A category counts as predicted when its saturated score clears this floor. */
const CATEGORY_THRESHOLD = 0.15;

const f = (n, dp = 3) => (Number.isFinite(n) ? n.toFixed(dp) : "—");
const prf = (tp, fp, fn) => {
  const p = tp + fp ? tp / (tp + fp) : 1;
  const r = tp + fn ? tp / (tp + fn) : 1;
  const f1 = p + r ? (2 * p * r) / (p + r) : 0;
  return { p, r, f1 };
};

function main() {
  mkdirSync(RESULTS, { recursive: true });

  const perCat = Object.fromEntries(CATEGORIES.map((c) => [c, { tp: 0, fp: 0, fn: 0, tn: 0 }]));
  let binTP = 0, binFP = 0, binFN = 0, binTN = 0;
  let highTotal = 0, highLocal = 0;
  const routesByLevel = { low: {}, moderate: {}, high: {} };
  const disagreements = [];
  const rows = [];

  for (const s of SAMPLES) {
    const sens = classifySensitivity(s.text);
    const dec = decideRoute(s.text);

    const predCats = CATEGORIES.filter((c) => (sens.categoryScores[c] ?? 0) >= CATEGORY_THRESHOLD);
    for (const c of CATEGORIES) {
      const truth = s.categories.includes(c);
      const pred = predCats.includes(c);
      if (truth && pred) perCat[c].tp++;
      else if (!truth && pred) perCat[c].fp++;
      else if (truth && !pred) perCat[c].fn++;
      else perCat[c].tn++;
      if (truth !== pred) {
        disagreements.push({ id: s.id, kind: truth ? "MISS" : "FALSE-ALARM", category: c, score: f(sens.categoryScores[c] ?? 0, 3) });
      }
    }

    // Binary: labeled moderate/high should clear the router's moderate threshold.
    const truthSensitive = s.level !== "low";
    const predSensitive = sens.score >= DEFAULT_THRESHOLDS.sensitivityMed;
    if (truthSensitive && predSensitive) binTP++;
    else if (!truthSensitive && predSensitive) binFP++;
    else if (truthSensitive && !predSensitive) binFN++;
    else binTN++;

    if (s.level === "high") {
      highTotal++;
      if (dec.route === "LOCAL") highLocal++;
    }
    routesByLevel[s.level][dec.route] = (routesByLevel[s.level][dec.route] ?? 0) + 1;

    rows.push({
      id: s.id, level: s.level, truth_categories: s.categories.join(";"),
      pred_categories: predCats.join(";"), score: f(sens.score), sens_level: sens.level,
      route: dec.route, reason: dec.reason.slice(0, 90),
    });
  }

  // ── Report ──────────────────────────────────────────────────────────────────
  const catRows = CATEGORIES.map((c) => {
    const { tp, fp, fn } = perCat[c];
    const { p, r, f1 } = prf(tp, fp, fn);
    return { category: c, tp, fp, fn, precision: p, recall: r, f1 };
  });
  const microTP = catRows.reduce((a, r) => a + r.tp, 0);
  const microFP = catRows.reduce((a, r) => a + r.fp, 0);
  const microFN = catRows.reduce((a, r) => a + r.fn, 0);
  const micro = prf(microTP, microFP, microFN);
  const macro = {
    p: catRows.reduce((a, r) => a + r.precision, 0) / catRows.length,
    r: catRows.reduce((a, r) => a + r.recall, 0) / catRows.length,
    f1: catRows.reduce((a, r) => a + r.f1, 0) / catRows.length,
  };
  const bin = prf(binTP, binFP, binFN);

  console.log(`Router bench — ${SAMPLES.length} labeled samples\n`);
  console.log("Per-category detection (threshold " + CATEGORY_THRESHOLD + "):");
  for (const r of catRows) {
    console.log(`  ${r.category.padEnd(12)} P=${f(r.precision)} R=${f(r.recall)} F1=${f(r.f1)}  (tp=${r.tp} fp=${r.fp} fn=${r.fn})`);
  }
  console.log(`  micro        P=${f(micro.p)} R=${f(micro.r)} F1=${f(micro.f1)}`);
  console.log(`  macro        P=${f(macro.p)} R=${f(macro.r)} F1=${f(macro.f1)}`);
  console.log(`\nBinary sensitive (score ≥ ${DEFAULT_THRESHOLDS.sensitivityMed}): P=${f(bin.p)} R=${f(bin.r)} F1=${f(bin.f1)} (tp=${binTP} fp=${binFP} fn=${binFN} tn=${binTN})`);
  console.log(`Privacy guarantee: ${highLocal}/${highTotal} high-sensitivity docs routed LOCAL (${f((highLocal / Math.max(1, highTotal)) * 100, 1)}%)`);
  console.log("\nRoutes by labeled level:", JSON.stringify(routesByLevel));
  if (disagreements.length) {
    console.log(`\n${disagreements.length} category disagreements:`);
    for (const d of disagreements) console.log(`  ${d.kind.padEnd(11)} ${d.id.padEnd(10)} ${d.category} (score ${d.score})`);
  }

  // ── CSVs ────────────────────────────────────────────────────────────────────
  const csv = (rs, headers) => [headers.join(","), ...rs.map((r) => headers.map((h) => {
    const v = String(r[h] ?? "");
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(","))].join("\n") + "\n";

  writeFileSync(join(RESULTS, "router_categories.csv"), csv(
    [...catRows.map((r) => ({ ...r, precision: f(r.precision), recall: f(r.recall), f1: f(r.f1) })),
      { category: "micro", tp: microTP, fp: microFP, fn: microFN, precision: f(micro.p), recall: f(micro.r), f1: f(micro.f1) },
      { category: "macro", tp: "", fp: "", fn: "", precision: f(macro.p), recall: f(macro.r), f1: f(macro.f1) }],
    ["category", "tp", "fp", "fn", "precision", "recall", "f1"],
  ), "utf8");
  writeFileSync(join(RESULTS, "router_samples.csv"), csv(rows,
    ["id", "level", "truth_categories", "pred_categories", "score", "sens_level", "route", "reason"]), "utf8");

  const summary = {
    samples: SAMPLES.length,
    categoryThreshold: CATEGORY_THRESHOLD,
    perCategory: catRows.map((r) => ({ category: r.category, precision: +f(r.precision), recall: +f(r.recall), f1: +f(r.f1) })),
    micro: { precision: +f(micro.p), recall: +f(micro.r), f1: +f(micro.f1) },
    macro: { precision: +f(macro.p), recall: +f(macro.r), f1: +f(macro.f1) },
    binarySensitive: { precision: +f(bin.p), recall: +f(bin.r), f1: +f(bin.f1), tp: binTP, fp: binFP, fn: binFN, tn: binTN },
    privacyGuarantee: { highDocs: highTotal, routedLocal: highLocal, rate: +f(highLocal / Math.max(1, highTotal)) },
    routesByLevel,
    disagreements,
  };
  writeFileSync(join(RESULTS, "router_summary.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log("\nWrote router_categories.csv, router_samples.csv, router_summary.json");
}

main();
