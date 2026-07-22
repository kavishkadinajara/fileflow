/**
 * HYBRID pseudonymization — masking must be reversible EXACTLY, stable for
 * repeated values, and able to report tokens a cloud model dropped.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { maskSensitive, maskExtra, unmask, droppedTokens } from "../src/lib/local-ai/mask";

const TEXT = "Contact kasun.w@example.com or +94 71 555 0101. Backup card 4242 4242 4242 4242. Again: kasun.w@example.com.";

test("unmask(mask(text)) restores the original exactly", () => {
  const { masked, map } = maskSensitive(TEXT);
  assert.notEqual(masked, TEXT);
  assert.equal(unmask(masked, map), TEXT);
});

test("masked text contains no original PII values", () => {
  const { masked, map } = maskSensitive(TEXT);
  for (const original of Object.values(map)) {
    assert.ok(!masked.includes(original), `leaked: ${original}`);
  }
});

test("the same value repeated gets the same token", () => {
  const { masked, count } = maskSensitive(TEXT);
  const emailTokens = masked.match(/\[\[PII_CONTACT_\d+\]\]/g) ?? [];
  assert.ok(count >= 3);
  const first = emailTokens[0];
  assert.ok(emailTokens.filter((t) => t === first).length >= 2, "repeated email should reuse its token");
});

test("droppedTokens reports tokens missing from the model output", () => {
  const { masked, map } = maskSensitive(TEXT);
  const tokens = Object.keys(map);
  const withoutFirst = masked.split(tokens[0]).join("");
  const dropped = droppedTokens(withoutFirst, map);
  assert.deepEqual(dropped, [tokens[0]]);
  assert.deepEqual(droppedTokens(masked, map), []);
});

test("maskExtra replaces longest values first and extends the map", () => {
  const base = maskSensitive("No regex PII here.");
  const r = maskExtra(base.masked + " Nimal Perera met Nimal at noon.", base.map, ["Nimal", "Nimal Perera"], "person");
  assert.ok(!r.masked.includes("Nimal Perera"));
  assert.ok(!/\bNimal\b/.test(r.masked));
  assert.equal(unmask(r.masked, r.map), base.masked + " Nimal Perera met Nimal at noon.");
});

test("text without PII passes through untouched", () => {
  const { masked, map, count } = maskSensitive("The reservoir levels remain within operating bands.");
  assert.equal(masked, "The reservoir levels remain within operating bands.");
  assert.equal(count, 0);
  assert.deepEqual(map, {});
});
