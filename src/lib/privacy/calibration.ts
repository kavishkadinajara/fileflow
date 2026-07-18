/**
 * On-device router calibration — turns Factor 3 from an a-priori prior into a
 * measured, per-device curve.
 *
 * predictLocalQuality() ships with fixed (ceiling, slope) priors because no
 * published data maps document complexity → small-model output quality (research
 * gap 4). Every completed LOCAL run gives us one real data point for THIS device
 * and model tier: (complexity, measured quality). We store them in localStorage
 * (no server, consistent with the privacy thesis), fit a least-squares line, and
 * blend it with the prior by sample count — so the router starts sensible and
 * grows honest with use. Existing routers (RouteLLM, FrugalGPT, Hybrid-LLM) train
 * offline on server logs; a router that self-calibrates from on-device outcomes,
 * without telemetry, has no published counterpart.
 */
import { predictLocalQuality, type LocalTier } from "./router";

export interface QualitySample {
  complexity: number;   // 0..1 at decision time
  quality: number;      // 0..1 measured post-hoc
  ts: number;
}

const STORE_KEY = "fileflow.router.calibration.v1";
const MAX_SAMPLES = 200;
/** Samples needed before the empirical fit gets any weight at all. */
const MIN_SAMPLES = 3;
/** Blend half-point: at this many samples, prior and fit weigh equally. */
const BLEND_N = 10;

type Store = Record<LocalTier, QualitySample[]>;

function load(): Store {
  if (typeof window === "undefined") return { small: [], medium: [] };
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Store>) : {};
    return { small: parsed.small ?? [], medium: parsed.medium ?? [] };
  } catch {
    return { small: [], medium: [] };
  }
}

function save(store: Store) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // Quota/privacy-mode failures just mean we stay on the prior.
  }
}

export function recordQualitySample(tier: LocalTier, complexity: number, quality: number) {
  if (typeof window === "undefined") return;
  const store = load();
  store[tier] = [...store[tier], { complexity, quality, ts: Date.now() }].slice(-MAX_SAMPLES);
  save(store);
}

export function sampleCount(tier: LocalTier): number {
  return load()[tier].length;
}

export function clearCalibration() {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORE_KEY);
}

/** Least-squares fit quality = a + b·complexity over the stored samples. */
function fitLine(samples: QualitySample[]): { a: number; b: number } | null {
  const n = samples.length;
  if (n < MIN_SAMPLES) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const s of samples) {
    sx += s.complexity; sy += s.quality;
    sxx += s.complexity * s.complexity; sxy += s.complexity * s.quality;
  }
  const denom = n * sxx - sx * sx;
  // Degenerate spread (all runs at ~the same complexity): fall back to the mean
  // as a flat line rather than dividing by ~0.
  if (Math.abs(denom) < 1e-6) return { a: sy / n, b: 0 };
  const b = (n * sxy - sx * sy) / denom;
  const a = (sy - b * sx) / n;
  return { a, b };
}

export interface CalibratedPrediction {
  quality: number;          // blended 0..1
  prior: number;            // what the shipped prior said
  empirical: number | null; // what this device's history says (null = not enough data)
  samples: number;
  /** 0..1 — how much of the answer came from measured data. */
  empiricalWeight: number;
}

export function predictLocalQualityCalibrated(complexity: number, tier: LocalTier): CalibratedPrediction {
  const prior = predictLocalQuality(complexity, tier);
  const samples = load()[tier];
  const fit = fitLine(samples);
  if (!fit) return { quality: prior, prior, empirical: null, samples: samples.length, empiricalWeight: 0 };

  const empirical = clamp01(fit.a + fit.b * complexity);
  const w = samples.length / (samples.length + BLEND_N);
  const quality = Math.round((w * empirical + (1 - w) * prior) * 100) / 100;
  return { quality, prior, empirical: Math.round(empirical * 100) / 100, samples: samples.length, empiricalWeight: Math.round(w * 100) / 100 };
}

function clamp01(n: number): number {
  return Math.max(0.05, Math.min(1, n));
}
