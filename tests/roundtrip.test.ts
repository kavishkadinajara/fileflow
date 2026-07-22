/**
 * Round-trip analysis core — pure functions behind the fidelity tracker and
 * ConvertBench: chain validation, report assembly, and the safe-path ranking
 * whose ordering the 455-run bench empirically confirmed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isValidChain,
  buildReport,
  edgeCost,
  enumeratePaths,
  recommendPaths,
  type RoundTripHop,
  type HopSfi,
} from "../src/lib/roundtrip/analysis";
import type { FileFormat } from "../src/types";

const sfi = (score: number): HopSfi => ({
  sfi_score: score,
  grade: score >= 0.85 ? "A" : score >= 0.7 ? "B" : score >= 0.55 ? "C" : score >= 0.4 ? "D" : "F",
  breakdown: { structural: { score }, semantic: { score }, functional: { score } },
});

const hop = (index: number, from: FileFormat, to: FileFormat, local: number, cumulative: number): RoundTripHop =>
  ({ index, from, to, local: sfi(local), cumulative: sfi(cumulative) });

test("chain validation accepts supported edges and rejects the rest", () => {
  assert.equal(isValidChain(["md", "html", "md"] as FileFormat[]), true);
  assert.equal(isValidChain(["md", "docx", "pdf", "md"] as FileFormat[]), true);
  assert.equal(isValidChain(["txt", "docx"] as FileFormat[]), false); // txt→docx unsupported
  assert.equal(isValidChain(["md"] as FileFormat[]), false);          // needs ≥ 2
});

test("buildReport: curve starts at 1.0 and tracks cumulative fidelity", () => {
  const hops = [hop(1, "md", "pdf", 0.9, 0.9), hop(2, "pdf", "md", 0.85, 0.76)];
  const r = buildReport(["md", "pdf", "md"] as FileFormat[], hops);
  assert.deepEqual(r.curve[0], { hop: 0, cumulative: 1, local: 1 });
  assert.equal(r.curve[2].cumulative, 0.76);
  assert.equal(r.finalFidelity, 0.76);
});

test("buildReport: compoundedLocal is the product of local retentions", () => {
  const hops = [hop(1, "md", "html", 0.9, 0.9), hop(2, "html", "md", 0.8, 0.7)];
  const r = buildReport(["md", "html", "md"] as FileFormat[], hops);
  assert.ok(Math.abs(r.compoundedLocal - 0.72) < 1e-9);
});

test("buildReport: worstHop is the largest cumulative drop", () => {
  const hops = [
    hop(1, "md", "docx", 0.95, 0.95),
    hop(2, "docx", "pdf", 0.7, 0.68),   // drop 0.27 — worst
    hop(3, "pdf", "md", 0.9, 0.66),     // drop 0.02
  ];
  const r = buildReport(["md", "docx", "pdf", "md"] as FileFormat[], hops);
  assert.equal(r.worstHop?.index, 2);
  assert.equal(r.worstHop?.from, "docx");
  assert.equal(r.worstHop?.to, "pdf");
});

test("edgeCost: txt sink > pdf sink > faithful edges (matches the measured ranking)", () => {
  const toTxt = edgeCost("md" as FileFormat, "txt" as FileFormat);
  const toPdf = edgeCost("md" as FileFormat, "pdf" as FileFormat);
  const toHtml = edgeCost("md" as FileFormat, "html" as FileFormat);
  assert.ok(toTxt > toPdf);
  assert.ok(toPdf > toHtml);
});

test("recommendPaths ranks faithful md→docx routes above via-pdf routes", () => {
  const paths = recommendPaths("md" as FileFormat, "docx" as FileFormat);
  assert.ok(paths.length > 0);
  const best = paths[0];
  assert.ok(!best.path.includes("pdf" as FileFormat));
  assert.ok(!best.path.includes("txt" as FileFormat));
  for (let i = 1; i < paths.length; i++) {
    assert.ok(paths[i - 1].predictedRetention >= paths[i].predictedRetention);
  }
});

test("enumeratePaths keeps interior formats unique", () => {
  for (const p of enumeratePaths("md" as FileFormat, "docx" as FileFormat, 4)) {
    const interior = p.slice(1, -1);
    assert.equal(new Set(interior).size, interior.length, p.join(">"));
  }
});
