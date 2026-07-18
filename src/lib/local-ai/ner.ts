/**
 * On-device NER deep-scan — the learned half of the sensitivity ensemble.
 *
 * The deterministic classifier (sensitivity.ts) finds *structured* PII (emails,
 * card numbers, NICs) but is blind to unstructured identity: person names. This
 * runs a quantized BERT NER model (~110 MB, Transformers.js/ONNX) entirely in the
 * browser — consistent with the router's premise that judging sensitivity must
 * not itself leak the document — and folds detected PER/LOC entities back into
 * the deterministic category scores via the same saturation curve, so the
 * ensemble stays explainable: every boost is a named detector with samples.
 */
import {
  composeSensitivity, desaturate, redactSample, saturate,
  type DetectorHit, type SensitivityResult,
} from "@/lib/privacy/sensitivity";
import type { LocalLoadProgress } from "./webllm";

export interface NamedEntity {
  text: string;
  type: "PER" | "ORG" | "LOC" | "MISC";
  score: number;
}

const NER_MODEL_ID = "Xenova/bert-base-NER";
const MAX_NER_CHARS = 6000;   // BERT context is small; the opening of a document carries most identity
const MIN_SCORE = 0.6;

type TokenResult = { entity: string; score: number; word: string };
type NerPipeline = (text: string) => Promise<TokenResult[]>;

let nerPromise: Promise<NerPipeline> | null = null;

export async function getNerPipeline(onProgress?: (p: LocalLoadProgress) => void): Promise<NerPipeline> {
  if (!nerPromise) {
    nerPromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      // Weights come from the HF CDN (a model-cdn origin in the network monitor);
      // skip the local-model probe so we don't spray 404s at our own origin.
      env.allowLocalModels = false;
      const pipe = await pipeline("token-classification", NER_MODEL_ID, {
        dtype: "q8",
        progress_callback: (p: { status: string; progress?: number; file?: string }) => {
          if (p.status === "progress" && typeof p.progress === "number") {
            onProgress?.({ progress: p.progress / 100, text: `Downloading NER model — ${p.file ?? ""}` });
          }
        },
      });
      return pipe as unknown as NerPipeline;
    })();
    nerPromise.catch(() => { nerPromise = null; });
  }
  return nerPromise;
}

/** Merge B-/I- token tags into whole entities (Transformers.js has no aggregation). */
export function aggregateTokens(tokens: TokenResult[]): NamedEntity[] {
  const out: NamedEntity[] = [];
  let cur: (NamedEntity & { minScore: number }) | null = null;

  for (const t of tokens) {
    const m = /^([BI])-(PER|ORG|LOC|MISC)$/.exec(t.entity);
    if (!m) { cur = null; continue; }
    const [, bi, type] = m as unknown as [string, "B" | "I", NamedEntity["type"]];
    const subword = t.word.startsWith("##");

    if (cur && cur.type === type && (bi === "I" || subword)) {
      cur.text += subword ? t.word.slice(2) : ` ${t.word}`;
      cur.minScore = Math.min(cur.minScore, t.score);
      cur.score = cur.minScore;
    } else {
      cur = { text: t.word.replace(/^##/, ""), type, score: t.score, minScore: t.score };
      out.push(cur);
    }
  }

  // De-duplicate case-insensitively, keep the highest-confidence occurrence.
  const best = new Map<string, NamedEntity>();
  for (const e of out) {
    if (e.score < MIN_SCORE || e.text.replace(/[^\p{L}]/gu, "").length < 2) continue;
    const key = `${e.type}:${e.text.toLowerCase()}`;
    const prev = best.get(key);
    if (!prev || e.score > prev.score) best.set(key, { text: e.text, type: e.type, score: e.score });
  }
  return [...best.values()];
}

export async function detectNamedEntities(
  text: string,
  onProgress?: (p: LocalLoadProgress) => void,
): Promise<NamedEntity[]> {
  const ner = await getNerPipeline(onProgress);
  const tokens = await ner(text.slice(0, MAX_NER_CHARS));
  return aggregateTokens(tokens);
}

/**
 * Fold NER entities into a sensitivity result: person names boost `identity`,
 * locations lightly boost `contact`. The boost is applied in RAW weight space
 * (desaturate → add → saturate) so it composes with the deterministic detectors
 * exactly as if they were one classifier.
 */
export function applyNerBoost(base: SensitivityResult, entities: NamedEntity[]): SensitivityResult {
  const persons = entities.filter((e) => e.type === "PER");
  const locations = entities.filter((e) => e.type === "LOC");
  if (persons.length === 0 && locations.length === 0) return base;

  const categoryScores = { ...base.categoryScores };
  const hits: DetectorHit[] = [...base.hits];

  if (persons.length > 0) {
    const w = 0.16;
    categoryScores.identity = round(saturate(desaturate(categoryScores.identity) + w * persons.length));
    hits.push({
      detector: "Person name (on-device NER)", category: "identity",
      count: persons.length, weight: w,
      samples: persons.slice(0, 3).map((p) => redactSample(p.text)),
    });
  }
  if (locations.length > 0) {
    const w = 0.04;
    categoryScores.contact = round(saturate(desaturate(categoryScores.contact) + w * locations.length));
    hits.push({
      detector: "Location (on-device NER)", category: "contact",
      count: locations.length, weight: w,
      samples: locations.slice(0, 3).map((l) => redactSample(l.text)),
    });
  }

  return composeSensitivity(categoryScores, hits);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
