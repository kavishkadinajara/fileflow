/**
 * Unified multi-provider AI layer.
 *
 * Picks an AI provider at runtime based on which API keys are present in the
 * environment, then returns a Vercel AI SDK `LanguageModel` for a given task.
 * Existing routes call `getModel(task)` instead of hardcoding a single provider,
 * so callers stay unchanged whether the key is Groq, Gemini, OpenAI, or DeepSeek.
 *
 * Priority is configurable via AI_PROVIDER_PRIORITY (comma-separated). Providers
 * without a key are skipped. With no keys at all, falls back to Groq so behaviour
 * matches the previous single-provider setup.
 */
import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import type { LanguageModel } from "ai";

export type AiProvider = "groq" | "gemini" | "openai" | "deepseek";

/**
 * Task the model is used for. Each provider maps a task to its best-fit model.
 * - chat        — conversational assistant (streaming)
 * - modify      — precise file content rewriting
 * - detect      — AI-content detection (needs strong reasoning)
 * - rewrite     — humanization / creative rewriting
 * - pdf-format  — structured JSON output for PDF auto-formatting
 */
export type AiTask = "chat" | "modify" | "detect" | "rewrite" | "pdf-format";

const DEFAULT_PRIORITY: AiProvider[] = ["groq", "gemini", "openai", "deepseek"];

/** Resolve the API key for a provider (supports a couple of common env aliases). */
function keyFor(provider: AiProvider): string | undefined {
  switch (provider) {
    case "groq":
      return process.env.GROQ_API_KEY;
    case "gemini":
      return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    case "openai":
      return process.env.OPENAI_API_KEY;
    case "deepseek":
      return process.env.DEEPSEEK_API_KEY;
  }
}

/**
 * Per-provider model id for each task. Kept conservative — these are current,
 * widely-available model ids for each provider as of the cutoff.
 */
const MODEL_MAP: Record<AiProvider, Record<AiTask, string>> = {
  groq: {
    chat: "llama-3.3-70b-versatile",
    modify: "llama-3.3-70b-versatile",
    detect: "meta-llama/llama-4-maverick-17b-128e-instruct",
    rewrite: "llama-3.3-70b-versatile",
    "pdf-format": "llama-3.3-70b-versatile",
  },
  gemini: {
    chat: "gemini-2.0-flash",
    modify: "gemini-2.0-flash",
    detect: "gemini-2.0-flash",
    rewrite: "gemini-2.0-flash",
    "pdf-format": "gemini-2.0-flash",
  },
  openai: {
    chat: "gpt-4o-mini",
    modify: "gpt-4o-mini",
    detect: "gpt-4o",
    rewrite: "gpt-4o-mini",
    "pdf-format": "gpt-4o-mini",
  },
  deepseek: {
    chat: "deepseek-chat",
    modify: "deepseek-chat",
    detect: "deepseek-chat",
    rewrite: "deepseek-chat",
    "pdf-format": "deepseek-chat",
  },
};

/** Provider order from env (AI_PROVIDER_PRIORITY), falling back to the default. */
function priority(): AiProvider[] {
  const raw = process.env.AI_PROVIDER_PRIORITY;
  if (!raw) return DEFAULT_PRIORITY;
  const parsed = raw
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter((p): p is AiProvider => DEFAULT_PRIORITY.includes(p as AiProvider));
  return parsed.length > 0 ? parsed : DEFAULT_PRIORITY;
}

/** First provider in priority order that has a configured key. */
export function resolveProvider(): AiProvider {
  for (const p of priority()) {
    if (keyFor(p)) return p;
  }
  // No keys configured — default to Groq so the model factory is at least valid.
  return "groq";
}

function buildModel(provider: AiProvider, modelId: string): LanguageModel {
  switch (provider) {
    case "groq":
      return createGroq({ apiKey: process.env.GROQ_API_KEY })(modelId);
    case "gemini":
      return createGoogleGenerativeAI({ apiKey: keyFor("gemini") })(modelId);
    case "openai":
      return createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(modelId);
    case "deepseek":
      return createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY })(modelId);
  }
}

/**
 * Return the AI model to use for a task. Resolves the active provider from env,
 * then maps the task to that provider's model id.
 */
export function getModel(task: AiTask): LanguageModel {
  const provider = resolveProvider();
  return buildModel(provider, MODEL_MAP[provider][task]);
}

/** The model id string for a task (for echoing back in responses, telemetry). */
export function modelIdFor(task: AiTask): string {
  return MODEL_MAP[resolveProvider()][task];
}
