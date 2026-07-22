/**
 * Self-calibrating router — least-squares fit over on-device quality samples,
 * blended with the prior by sample count. Runs against a stubbed localStorage.
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  recordQualitySample,
  sampleCount,
  clearCalibration,
  predictLocalQualityCalibrated,
} from "../src/lib/privacy/calibration";
import { predictLocalQuality } from "../src/lib/privacy/router";

// calibration.ts only reads window.localStorage at CALL time (never at module
// load), so installing the in-memory stand-in after import but before the
// first test is safe.
const store = new Map<string, string>();
(globalThis as Record<string, unknown>).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
};

beforeEach(() => clearCalibration());

test("with no samples the prediction equals the prior", () => {
  const p = predictLocalQualityCalibrated(0.5, "small");
  assert.equal(p.quality, predictLocalQuality(0.5, "small"));
  assert.equal(p.samples, 0);
  assert.equal(p.empiricalWeight, 0);
});

test("samples are recorded and counted per tier", () => {
  recordQualitySample("small", 0.3, 0.8);
  recordQualitySample("small", 0.6, 0.6);
  recordQualitySample("medium", 0.5, 0.9);
  assert.equal(sampleCount("small"), 2);
  assert.equal(sampleCount("medium"), 1);
});

test("consistent empirical evidence pulls the prediction toward the fit", () => {
  // Device measures much better quality than the prior expects: q = 0.95 - 0.1·c
  for (let i = 0; i < 20; i++) {
    const c = (i % 10) / 10;
    recordQualitySample("small", c, 0.95 - 0.1 * c);
  }
  const p = predictLocalQualityCalibrated(0.5, "small");
  const prior = predictLocalQuality(0.5, "small");
  assert.ok(p.empirical !== null);
  assert.ok(p.empiricalWeight > 0.5, `weight ${p.empiricalWeight}`);
  assert.ok(p.quality > prior, `calibrated ${p.quality} should exceed prior ${prior}`);
});

test("empirical weight grows with sample count", () => {
  recordQualitySample("small", 0.2, 0.9);
  recordQualitySample("small", 0.8, 0.5);
  recordQualitySample("small", 0.5, 0.7);
  const few = predictLocalQualityCalibrated(0.5, "small").empiricalWeight;
  for (let i = 0; i < 30; i++) recordQualitySample("small", (i % 10) / 10, 0.9 - 0.4 * ((i % 10) / 10));
  const many = predictLocalQualityCalibrated(0.5, "small").empiricalWeight;
  assert.ok(many > few);
});

test("clearCalibration returns the router to the prior", () => {
  for (let i = 0; i < 12; i++) recordQualitySample("small", 0.5, 0.9);
  clearCalibration();
  const p = predictLocalQualityCalibrated(0.5, "small");
  assert.equal(p.samples, 0);
  assert.equal(p.quality, predictLocalQuality(0.5, "small"));
});
