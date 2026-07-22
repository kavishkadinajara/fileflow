/**
 * Privacy-aware router — the decision matrix, complexity estimator, and the
 * local-quality prior. Privacy must always win ties.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decideRoute,
  estimateComplexity,
  predictLocalQuality,
  DEFAULT_THRESHOLDS,
} from "../src/lib/privacy/router";

const LONG_COMPLEX = [
  "# Annual engineering report",
  ...Array.from({ length: 24 }, (_, i) =>
    `## Section ${i}\n\n${"The subsystem behaviour under sustained load remains within the agreed envelope and the follow-up items are tracked in the register. ".repeat(18)}`),
  "| a | b | c |\n| --- | --- | --- |\n| 1 | 2 | 3 |\n| 4 | 5 | 6 |",
  "```js\nconst x = 1;\n```",
  "$E = mc^2$ and $F_1 = 2PR/(P+R)$",
].join("\n\n");

test("high sensitivity is an absolute LOCAL veto, regardless of complexity", () => {
  const sensitive = `${LONG_COMPLEX}\n\nPatient diagnosis: type 2 diabetes, metformin prescribed. NIC 853421876V. Card 4242 4242 4242 4242.`;
  const d = decideRoute(sensitive);
  assert.ok(d.sensitivity.score >= DEFAULT_THRESHOLDS.sensitivityHigh);
  assert.equal(d.route, "LOCAL");
});

test("low-sensitivity short document takes the LOCAL fast path", () => {
  const d = decideRoute("A short note about the garden schedule and watering rota.");
  assert.equal(d.route, "LOCAL");
  assert.ok(d.sensitivity.score < DEFAULT_THRESHOLDS.sensitivityMed);
});

test("low-sensitivity long/complex document escalates to CLOUD", () => {
  const d = decideRoute(LONG_COMPLEX);
  assert.ok(d.sensitivity.score < DEFAULT_THRESHOLDS.sensitivityMed, `sens ${d.sensitivity.score}`);
  assert.equal(d.route, "CLOUD");
});

test("every decision carries a human-readable reason", () => {
  for (const text of ["short note", LONG_COMPLEX]) {
    const d = decideRoute(text);
    assert.ok(d.reason.length > 10);
  }
});

test("estimateComplexity sees structure, not just length", () => {
  const prose = estimateComplexity("Just words. ".repeat(200));
  const structured = estimateComplexity(
    "Just words. ".repeat(200) +
    "\n| a | b |\n| --- | --- |\n| 1 | 2 |\n" +
    "\n$x = y$\n```py\npass\n```",
  );
  assert.ok(structured.score > prose.score);
  assert.equal(structured.signals.tables > 0, true);
  assert.equal(structured.signals.formulas > 0, true);
  assert.equal(structured.signals.codeBlocks, 1);
});

test("predictLocalQuality falls with complexity and rises with tier", () => {
  assert.ok(predictLocalQuality(0.2) > predictLocalQuality(0.8));
  assert.ok(predictLocalQuality(0.6, "medium") > predictLocalQuality(0.6, "small"));
  for (const c of [0, 0.5, 1]) {
    const q = predictLocalQuality(c);
    assert.ok(q >= 0.2 && q <= 0.92);
  }
});

test("routing is deterministic", () => {
  assert.deepEqual(decideRoute(LONG_COMPLEX), decideRoute(LONG_COMPLEX));
});
