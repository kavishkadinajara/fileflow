/**
 * Extractive summarizer — TextRank over TF-IDF sentence graph. Deterministic,
 * abbreviation-safe splitting, grounded selection in reading order.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { splitSentences, summarizeExtractive } from "../src/lib/summarize/extractive";

const DOC = [
  "The migration project moved the reporting warehouse to a governed model.",
  "Stakeholders agreed the key metric definitions before any pipeline work started.",
  "The ETL pipeline loads nightly sales data and validates schema on entry.",
  "Validation failures quarantine the batch instead of poisoning the warehouse.",
  "Dashboards read only from the governed semantic layer.",
  "Ad-hoc extracts were deprecated after the first quarter.",
  "Training sessions covered the new metric catalogue for every regional team.",
  "Adoption reached ninety percent of weekly active analysts by June.",
  "Remaining gaps concentrate in the legacy finance reports.",
  "A follow-up phase will migrate those reports next year.",
].join(" ");

test("splitSentences protects abbreviations", () => {
  const s = splitSentences("Dr. Silva met Mr. Perera at 3 p.m. yesterday. They agreed on the plan.");
  assert.equal(s.length, 2);
  assert.match(s[0], /Dr\. Silva/);
});

test("summary selects a grounded subset in reading order", () => {
  const r = summarizeExtractive(DOC);
  assert.ok(r.selected.length >= 3 && r.selected.length <= 8);
  for (let i = 1; i < r.selected.length; i++) {
    assert.ok(r.selected[i] > r.selected[i - 1], "reading order preserved");
  }
  for (const idx of r.selected) {
    const sentence = r.sentences[idx];
    assert.ok(DOC.includes(sentence.text.replace(/[.!?]$/, "")), sentence.text);
    assert.ok(r.summary.includes(sentence.text.slice(0, 30)), "summary contains selected sentence");
  }
});

test("keywords are non-empty and drawn from the document", () => {
  const r = summarizeExtractive(DOC);
  assert.ok(r.keywords.length > 0);
  for (const k of r.keywords) {
    assert.ok(DOC.toLowerCase().includes(k.toLowerCase()), k);
  }
});

test("stats report a real compression ratio", () => {
  const r = summarizeExtractive(DOC);
  assert.equal(r.stats.sentenceCount, 10);
  assert.ok(r.stats.compression > 0 && r.stats.compression < 1);
});

test("very short input is returned as-is", () => {
  const r = summarizeExtractive("One sentence only.");
  assert.equal(r.selected.length, 1);
  assert.match(r.summary, /One sentence only/);
});

test("markdown syntax does not leak into the summary", () => {
  const md = `# Title\n\n- bullet one\n\n${DOC}\n\n\`\`\`js\nconst x = 1;\n\`\`\``;
  const r = summarizeExtractive(md);
  assert.ok(!r.summary.includes("```"));
  assert.ok(!/^#/m.test(r.summary));
});

test("summarization is deterministic", () => {
  assert.deepEqual(summarizeExtractive(DOC), summarizeExtractive(DOC));
});

test("language detection reports English for English text", () => {
  assert.equal(summarizeExtractive(DOC).language, "en");
});
