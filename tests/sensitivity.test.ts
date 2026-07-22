/**
 * Deterministic sensitivity classifier — detector correctness, including the
 * calibration fixes driven by the router bench (spaced IBANs, vendor token
 * shapes, plural-aware lexicon) and the hard negatives that must NOT fire.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifySensitivity,
  findSensitiveSpans,
  saturate,
  desaturate,
} from "../src/lib/privacy/sensitivity";

const cat = (text: string, c: string) => classifySensitivity(text).categoryScores[c as never] as number;

test("Luhn-valid card fires financial; Luhn-invalid lookalike does not", () => {
  assert.ok(cat("Charge the card 4111 1111 1111 1111 today.", "financial") > 0.3);
  assert.equal(cat("Order reference 4111 1111 1111 1112 was scanned.", "financial"), 0);
});

test("IBAN matches both compact and canonical spaced forms", () => {
  assert.ok(cat("Refund to GB82WEST12345698765432 please.", "financial") > 0.3);
  assert.ok(cat("Refund to IBAN GB82 WEST 1234 5698 7654 32 please.", "financial") > 0.3);
});

test("vendor credential token shapes are detected", () => {
  assert.ok(cat("key AKIAIOSFODNN7EXAMPLE is in the vault", "credentials") > 0.3);
  assert.ok(cat("leaked ghp_a1B2c3D4e5F6g7H8i9J0kLmNoPqRsTuVwXyZ token", "credentials") > 0.3);
  assert.ok(cat("use sk-live-9f8g7h6j5k4l3m2n1p0qrstuvwx for now", "credentials") > 0.3);
});

test("Sri Lanka NIC (old and new format) fires identity", () => {
  assert.ok(cat("Applicant NIC 853421876V attached.", "identity") > 0.3);
  assert.ok(cat("Customer NIC 200012345678 verified.", "identity") > 0.3);
});

test("lexicon matching handles plurals", () => {
  assert.ok(cat("Payment arrives in three tranches next quarter.", "financial") > 0);
  assert.ok(cat("Both loans were restructured.", "financial") > 0);
});

test("hard negatives stay clean", () => {
  const clean = [
    "The key of the second movement shifts from D minor to F major.",
    "Serial number 1234 5678 9012 3456 identifies the casting batch.",
    "The chess engine sacrifices the exchange for a passed pawn.",
  ];
  for (const text of clean) {
    assert.equal(classifySensitivity(text).level, "low", text);
  }
});

test("medical text is sensitive and must never route to CLOUD", async () => {
  const text =
    "The patient presents with type 2 diabetes; HbA1c 9.1 despite metformin. Starting insulin and referring to the clinic.";
  const r = classifySensitivity(text);
  assert.ok(r.score >= 0.3, `score ${r.score}`);
  assert.notEqual(r.level, "low");
  const { decideRoute } = await import("../src/lib/privacy/router");
  assert.equal(decideRoute(text).route, "LOCAL");
});

test("every score point traces to a named detector hit", () => {
  const r = classifySensitivity("Email me at someone@example.com about the invoice.");
  assert.ok(r.hits.length > 0);
  for (const h of r.hits) {
    assert.ok(h.detector.length > 0);
    assert.ok(h.count > 0);
  }
});

test("redacted samples never contain the full original value", () => {
  const r = classifySensitivity("Contact nadeesha.perera@acmeholdings.com now.");
  const contact = r.hits.find((h) => h.category === "contact");
  assert.ok(contact);
  for (const s of contact.samples) {
    assert.ok(!s.includes("nadeesha.perera@acmeholdings.com"));
    assert.ok(s.includes("•"));
  }
});

test("findSensitiveSpans returns non-overlapping, position-accurate spans", () => {
  const text = "Mail a@b.co or call +94 71 234 5678.";
  const spans = findSensitiveSpans(text);
  assert.ok(spans.length >= 2);
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) {
    assert.ok(sorted[i].start >= sorted[i - 1].end, "spans overlap");
  }
  for (const s of spans) {
    assert.equal(text.slice(s.start, s.end), s.text);
  }
});

test("saturate/desaturate are inverse over the working range", () => {
  for (const x of [0.05, 0.2, 0.5, 1, 2]) {
    assert.ok(Math.abs(desaturate(saturate(x)) - x) < 1e-9);
  }
});

test("classification is deterministic", () => {
  const text = "NIC 853421876V, card 4242 4242 4242 4242, dr. prescribed metformin.";
  assert.deepEqual(classifySensitivity(text), classifySensitivity(text));
});
