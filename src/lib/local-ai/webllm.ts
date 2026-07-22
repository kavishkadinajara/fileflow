/**
 * In-browser SLM engine — research gap 5 (browser-based AI + format conversion).
 *
 * Wraps @mlc-ai/web-llm so the rest of the app can run real language-model
 * inference ON DEVICE via WebGPU: the document never leaves the browser, which is
 * what makes the privacy router's LOCAL route an executable guarantee rather than
 * a label. Model weights (INT4, ~1–2.4 GB) stream once from the MLC CDN and are
 * cached by the browser (Cache API), so later runs are download-free.
 *
 * The engine is a lazy singleton: nothing is imported or downloaded until the
 * first localGenerate() call, and switching tiers reloads the same engine with
 * the other model rather than holding two models in GPU memory.
 */
import type { MLCEngine } from "@mlc-ai/web-llm";
import type { LocalTier } from "@/lib/privacy/router";

/** Prebuilt MLC model ids per router tier (verified against web-llm 0.2.x). */
export const LOCAL_MODEL_IDS: Record<LocalTier, string> = {
  small: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",   // ~0.9 GB VRAM
  medium: "Phi-3.5-mini-instruct-q4f16_1-MLC",  // ~2.4 GB VRAM
};

export interface LocalLoadProgress {
  /** 0..1 across fetch + shader compile. */
  progress: number;
  text: string;
}

export function isWebGpuAvailable(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

let enginePromise: Promise<MLCEngine> | null = null;
let loadedModelId: string | null = null;
let progressListener: ((p: LocalLoadProgress) => void) | null = null;

async function getEngine(modelId: string, onProgress?: (p: LocalLoadProgress) => void): Promise<MLCEngine> {
  // The active listener is swapped per call so reloads report to the current UI.
  progressListener = onProgress ?? null;

  if (enginePromise) {
    const engine = await enginePromise;
    if (loadedModelId !== modelId) {
      loadedModelId = modelId;
      await engine.reload(modelId);
    }
    return engine;
  }

  loadedModelId = modelId;
  enginePromise = (async () => {
    const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
    return CreateMLCEngine(modelId, {
      initProgressCallback: (report) => {
        progressListener?.({ progress: report.progress, text: report.text });
      },
    });
  })();

  try {
    return await enginePromise;
  } catch (err) {
    // A failed init must not poison every later attempt.
    enginePromise = null;
    loadedModelId = null;
    throw err;
  }
}

export interface LocalGenerateOptions {
  tier: LocalTier;
  system: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  /** Called with the accumulated text after each streamed chunk. */
  onToken?: (partial: string) => void;
  onProgress?: (p: LocalLoadProgress) => void;
}

export interface LocalGenerateResult {
  text: string;
  modelId: string;
  /** Decode speed measured by the engine (tokens ÷ generation wall time). */
  tokensPerSecond?: number;
  completionTokens?: number;
}

export async function localGenerate(opts: LocalGenerateOptions): Promise<LocalGenerateResult> {
  if (!isWebGpuAvailable()) {
    throw new Error("WebGPU is not available in this browser — on-device inference needs Chrome/Edge 113+ or Firefox 141+.");
  }
  const modelId = LOCAL_MODEL_IDS[opts.tier];
  const engine = await getEngine(modelId, opts.onProgress);

  const chunks = await engine.chat.completions.create({
    stream: true,
    stream_options: { include_usage: true },
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.prompt },
    ],
    temperature: opts.temperature ?? 0.1,
    max_tokens: opts.maxTokens ?? 4000,
  });

  let text = "";
  let completionTokens: number | undefined;
  const genStart = performance.now();
  for await (const chunk of chunks) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta) {
      text += delta;
      opts.onToken?.(text);
    }
    if (chunk.usage) completionTokens = chunk.usage.completion_tokens;
  }
  const genSeconds = (performance.now() - genStart) / 1000;
  const tokensPerSecond = completionTokens && genSeconds > 0
    ? Math.round(completionTokens / genSeconds)
    : undefined;

  return { text, modelId, tokensPerSecond, completionTokens };
}

export interface LocalChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LocalChatOptions {
  tier: LocalTier;
  /** Full conversation incl. system message — the caller owns history trimming. */
  messages: LocalChatMessage[];
  temperature?: number;
  maxTokens?: number;
  onToken?: (partial: string) => void;
  onProgress?: (p: LocalLoadProgress) => void;
}

/** Multi-turn on-device chat completion (same engine singleton as localGenerate). */
export async function localChat(opts: LocalChatOptions): Promise<LocalGenerateResult> {
  if (!isWebGpuAvailable()) {
    throw new Error("WebGPU is not available in this browser — on-device inference needs Chrome/Edge 113+ or Firefox 141+.");
  }
  const modelId = LOCAL_MODEL_IDS[opts.tier];
  const engine = await getEngine(modelId, opts.onProgress);

  const chunks = await engine.chat.completions.create({
    stream: true,
    stream_options: { include_usage: true },
    messages: opts.messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 1200,
  });

  let text = "";
  let completionTokens: number | undefined;
  const genStart = performance.now();
  for await (const chunk of chunks) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta) {
      text += delta;
      opts.onToken?.(text);
    }
    if (chunk.usage) completionTokens = chunk.usage.completion_tokens;
  }
  const genSeconds = (performance.now() - genStart) / 1000;
  const tokensPerSecond = completionTokens && genSeconds > 0
    ? Math.round(completionTokens / genSeconds)
    : undefined;

  return { text, modelId, tokensPerSecond, completionTokens };
}

/** Stop the current on-device generation (the stream ends with what was produced). */
export async function interruptLocal(): Promise<void> {
  if (!enginePromise) return;
  const engine = await enginePromise;
  engine.interruptGenerate();
}
