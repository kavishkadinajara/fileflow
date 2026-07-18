/**
 * Post-hoc output quality check — deterministic, client-side, instant.
 *
 * The router's Factor 3 *predicts* local quality before running; this *measures*
 * it after, closing the loop the routing literature leaves open (predictions are
 * never verified against outcomes). The measurement is task-aware:
 *
 *   summarize — keyword coverage (did the summary keep the source's top TF-IDF
 *               terms?) + compression sanity (a "summary" longer than the source,
 *               or near-empty, scores poorly).
 *   proofread / custom — content-word retention (Jaccard), structural retention
 *               (headings/lists/paragraph counts), and length-ratio sanity.
 *
 * Scores feed the on-device calibration store (calibration.ts), so every local
 * run makes the next routing prediction more honest for THIS device.
 */

export type QualityTask = "summarize" | "proofread" | "custom";

export interface QualityReport {
  score: number;               // 0..1
  components: { name: string; score: number }[];
}

const WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}\p{M}'’-]*/gu;

function contentWords(text: string): Set<string> {
  const words = (text.toLowerCase().match(WORD_RE) ?? []).filter((w) => w.length > 2);
  return new Set(words);
}

function topTerms(text: string, k: number): string[] {
  const freq = new Map<string, number>();
  for (const w of (text.toLowerCase().match(WORD_RE) ?? [])) {
    if (w.length <= 3) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([w]) => w);
}

function structureCounts(text: string) {
  return {
    headings: (text.match(/^#{1,6}\s/gm) ?? []).length,
    listItems: (text.match(/^\s*(?:[-*+]|\d+\.)\s/gm) ?? []).length,
    paragraphs: text.split(/\n\s*\n/).filter((p) => p.trim()).length,
  };
}

/** Ratio similarity: 1 when equal, falls toward 0 as counts diverge. */
function ratioScore(a: number, b: number): number {
  if (a === 0 && b === 0) return 1;
  return Math.min(a, b) / Math.max(a, b);
}

export function measureOutputQuality(task: QualityTask, source: string, output: string): QualityReport {
  const components: { name: string; score: number }[] = [];
  const out = output.trim();
  if (!out) return { score: 0, components: [{ name: "empty output", score: 0 }] };

  if (task === "summarize") {
    const terms = topTerms(source, 12);
    const outWords = contentWords(out);
    const covered = terms.filter((t) => outWords.has(t)).length;
    components.push({ name: "keyword coverage", score: terms.length ? covered / terms.length : 1 });

    const ratio = out.length / Math.max(1, source.length);
    // Ideal compression sits roughly in 5–50% of the source length.
    const compression = ratio > 0.6 ? Math.max(0, 1 - (ratio - 0.6) * 2)
      : ratio < 0.02 ? ratio / 0.02
      : 1;
    components.push({ name: "compression sanity", score: compression });
  } else {
    const src = contentWords(source);
    const dst = contentWords(out);
    let inter = 0;
    for (const w of src) if (dst.has(w)) inter++;
    const union = src.size + dst.size - inter;
    components.push({ name: "content retention", score: union ? inter / union : 1 });

    const s1 = structureCounts(source);
    const s2 = structureCounts(out);
    components.push({
      name: "structure retention",
      score: (ratioScore(s1.headings, s2.headings) + ratioScore(s1.listItems, s2.listItems) + ratioScore(s1.paragraphs, s2.paragraphs)) / 3,
    });

    components.push({ name: "length sanity", score: ratioScore(source.length, out.length) });
  }

  const score = components.reduce((acc, c) => acc + c.score, 0) / components.length;
  return { score: Math.round(score * 100) / 100, components };
}
