/**
 * Privacy receipts — the verifiable per-run record. The attestation hash must
 * be recomputable from the receipt body, and documentLeftDevice must reflect
 * only uploads that can carry document content.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPrivacyReceipt } from "../src/lib/privacy/receipt";
import { decideRoute } from "../src/lib/privacy/router";
import type { NetworkEvent } from "../src/lib/privacy/networkMonitor";

const ev = (klass: string, hasBody: boolean): NetworkEvent =>
  ({ host: `${klass}.test`, klass, method: hasBody ? "POST" : "GET", hasBody } as unknown as NetworkEvent);

const DECISION = decideRoute("A plain note about the meeting schedule.");

test("LOCAL run with only metadata + model-cdn traffic: document did not leave", async () => {
  const r = await buildPrivacyReceipt({
    operation: "summarize",
    text: "the document body",
    decision: DECISION,
    executedRoute: "LOCAL",
    model: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    durationMs: 1200,
    maskedCount: 0,
    lostTokens: [],
    events: [ev("supabase", true), ev("supabase", true), ev("model-cdn", false), ev("first-party", false)],
  });
  assert.equal(r.network.documentLeftDevice, false);
  assert.equal(r.network.metadataUploads, 2);
  assert.equal(r.network.thirdPartyUploads, 0);
  assert.equal(r.network.requests.length, 4);
});

test("CLOUD run with an app-API upload: documentLeftDevice is true", async () => {
  const r = await buildPrivacyReceipt({
    operation: "custom",
    text: "the document body",
    decision: DECISION,
    executedRoute: "CLOUD",
    model: "llama-3.3-70b",
    durationMs: 900,
    maskedCount: 0,
    lostTokens: [],
    events: [ev("same-site-api", true)],
  });
  assert.equal(r.network.documentLeftDevice, true);
  assert.equal(r.network.appApiUploads, 1);
});

test("receipt never contains the document text, only its hash and length", async () => {
  const text = "SECRET-CONTENT-marker-string";
  const r = await buildPrivacyReceipt({
    operation: "summarize", text, decision: DECISION, executedRoute: "LOCAL",
    model: "m", durationMs: 1, maskedCount: 0, lostTokens: [], events: [],
  });
  assert.ok(!JSON.stringify(r).includes(text));
  assert.equal(r.document.chars, text.length);
  assert.match(r.document.sha256, /^[0-9a-f]{64}$/);
});

test("attestation hash is recomputable from the receipt body (tamper-evident)", async () => {
  const r = await buildPrivacyReceipt({
    operation: "summarize", text: "abc", decision: DECISION, executedRoute: "LOCAL",
    model: "m", durationMs: 1, maskedCount: 0, lostTokens: [], events: [ev("supabase", true)],
  });
  const { attestation, ...body } = r;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(body)));
  const recomputed = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  assert.equal(attestation.hash, recomputed);

  // Any tamper breaks the hash.
  const tampered = { ...body, operation: "different" };
  const d2 = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(tampered)));
  const h2 = [...new Uint8Array(d2)].map((b) => b.toString(16).padStart(2, "0")).join("");
  assert.notEqual(attestation.hash, h2);
});

test("same document text always yields the same sha256", async () => {
  const make = () => buildPrivacyReceipt({
    operation: "x", text: "stable content", decision: DECISION, executedRoute: "LOCAL",
    model: "m", durationMs: 1, maskedCount: 0, lostTokens: [], events: [],
  });
  const [a, b] = await Promise.all([make(), make()]);
  assert.equal(a.document.sha256, b.document.sha256);
});
