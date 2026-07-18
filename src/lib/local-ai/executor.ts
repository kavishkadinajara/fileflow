/**
 * Routed execution — closes the loop of research gap 3. The privacy router
 * *decides* LOCAL / HYBRID / CLOUD; this module *executes* the decision:
 *
 *   LOCAL  → WebLLM inference in-browser (webllm.ts). Zero outbound document bytes.
 *   HYBRID → PII pseudonymized on-device (mask.ts), masked text refined by the
 *            cloud route, response re-identified locally.
 *   CLOUD  → the existing /api/ai-modify route (multi-provider layer).
 *
 * Task-aware execution (the production layer):
 *   summarize — deterministic TextRank extraction runs FIRST, on-device, for
 *     every route; the language model only polishes the selected sentences. This
 *     grounds the output (the model cannot introduce facts the extractor didn't
 *     select), cuts local latency by an order of magnitude (the prompt is the
 *     extract, not the document), and means HYBRID/CLOUD summarization uploads
 *     ONLY the extracted sentences — minimum disclosure, not the whole document.
 *   proofread — long documents are chunked on paragraph boundaries for the local
 *     model's context window and processed sequentially.
 *   custom — free instruction; refused locally when it exceeds the context
 *     budget (document-level instructions can't be chunked soundly).
 *
 * After every run the output is quality-measured (quality.ts); LOCAL outcomes
 * feed the on-device calibration store so Factor 3 becomes empirical with use.
 * Capability fallback never weakens the privacy guarantee: if WebGPU is missing,
 * a LOCAL decision degrades to HYBRID (moderate sensitivity) or CLOUD (low), but
 * a privacy-veto document (high sensitivity) is refused rather than uploaded.
 */
import { decideRoute, type LocalTier, type Route, type RoutingDecision } from "@/lib/privacy/router";
import { recordQualitySample } from "@/lib/privacy/calibration";
import { summarizeExtractive } from "@/lib/summarize/extractive";
import { isWebGpuAvailable, localGenerate, LOCAL_MODEL_IDS, type LocalLoadProgress } from "./webllm";
import { droppedTokens, maskExtra, maskSensitive, unmask } from "./mask";
import { detectNamedEntities } from "./ner";
import { measureOutputQuality, type QualityReport } from "./quality";

export type LocalAiTask = "summarize" | "proofread" | "custom";
export type RunPhase = "extracting" | "loading-model" | "generating" | "masking" | "leak-check" | "cloud-request" | "unmasking";

/** Character budget per local prompt (Qwen/Phi INT4 builds carry a 4k context). */
const LOCAL_CHUNK_CHARS = 6000;

export interface RoutedRunOptions {
  text: string;
  task: LocalAiTask;
  /** Required for task "custom"; ignored otherwise. */
  instruction?: string;
  tier?: LocalTier;
  /** Precomputed decision (e.g. NER-boosted) — omitted, one is computed from text. */
  decision?: RoutingDecision;
  /** HYBRID: NER-scan the masked text and re-mask residual names before upload. */
  deepLeakCheck?: boolean;
  /** Aborts the cloud request path (local generation is stopped via interruptLocal). */
  signal?: AbortSignal;
  onPhase?: (phase: RunPhase) => void;
  /** Accumulated text so far (LOCAL route streams; cloud routes call once at the end). */
  onToken?: (partial: string) => void;
  onProgress?: (p: LocalLoadProgress) => void;
}

export interface RoutedRunResult {
  decision: RoutingDecision;
  task: LocalAiTask;
  /** Route actually executed (may differ from the decision on capability fallback). */
  executedRoute: Route;
  fallbackNote?: string;
  output: string;
  modelId: string;
  durationMs: number;
  tokensPerSecond?: number;
  /** HYBRID only: how many PII values were pseudonymized before upload. */
  maskedCount: number;
  /** HYBRID only: placeholder tokens the cloud model failed to preserve. */
  lostTokens: string[];
  /** HYBRID + deepLeakCheck: residual names the NER pass caught after regex masking. */
  leakCheck?: { residualFound: number; remasked: boolean };
  quality: QualityReport;
  notes: string[];
}

const SYSTEMS: Record<LocalAiTask, string> = {
  summarize: "You are a summarization engine. Rewrite the given key sentences into one fluent, well-ordered summary. Use ONLY facts present in the sentences — never add information. Output the summary text only, no preamble.",
  proofread: "You are a proofreading engine. Fix grammar, spelling, and punctuation. Preserve the meaning, tone, formatting, and structure exactly. Output ONLY the corrected text, no commentary.",
  custom: "You are FileFlowOne's on-device document engine. Apply the user's modification instruction to the document and return ONLY the modified document text — no explanations, no code fences, no commentary. Preserve the original structure and formatting wherever the instruction doesn't change it. If the instruction cannot be applied, return the document unchanged.",
};

const TOKEN_GUARD = " The text contains placeholder tokens shaped like [[PII_..._n]]. They stand for redacted private values: copy every token through EXACTLY as written, never alter, remove, translate, or invent tokens.";

/**
 * Resolve the decided route against device capability. Pure — exported so the UI
 * can show the fallback before running.
 */
export function resolveExecution(
  decision: RoutingDecision,
  webgpu: boolean = isWebGpuAvailable(),
): { route: Route; fallbackNote?: string } {
  if (decision.route !== "LOCAL" || webgpu) return { route: decision.route };
  if (decision.sensitivity.level === "high") {
    throw new Error(
      "This document is too sensitive to leave the device, but WebGPU is unavailable so it can't be processed locally either. Use a WebGPU-capable browser (Chrome/Edge 113+) — the document was NOT uploaded.",
    );
  }
  return decision.sensitivity.level === "moderate"
    ? { route: "HYBRID", fallbackNote: "WebGPU unavailable — fell back to HYBRID: PII was pseudonymized on-device before cloud refinement." }
    : { route: "CLOUD", fallbackNote: "WebGPU unavailable — fell back to CLOUD (document sensitivity is low)." };
}

async function cloudModify(text: string, instruction: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch("/api/ai-modify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileContent: text, fileName: "document.md", fileFormat: "md", instruction }),
    signal,
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error ?? `Cloud request failed (${res.status})`);
  return data.modifiedContent as string;
}

/**
 * The payload the language model actually works on, per task. For summarize this
 * is where the deterministic grounding happens — for EVERY route.
 */
function buildPayload(task: LocalAiTask, text: string, notes: string[]): { payload: string; cloudInstruction: string } {
  if (task === "summarize") {
    const extract = summarizeExtractive(text);
    notes.push(`Grounded on ${extract.selected.length} TextRank-selected sentences (of ${extract.stats.sentenceCount}); only these leave the extractor.`);
    const payload = `KEY TERMS: ${extract.keywords.join(", ")}\n\nKEY SENTENCES:\n${extract.summary}`;
    return { payload, cloudInstruction: "Rewrite these key sentences into one fluent, faithful summary. Use ONLY facts present in the sentences — never add information. Output the summary text only." };
  }
  if (task === "proofread") {
    return { payload: text, cloudInstruction: "Fix grammar, spelling, and punctuation. Preserve the meaning, tone, formatting, and structure exactly. Output only the corrected text." };
  }
  return { payload: text, cloudInstruction: "" };
}

/** Split on paragraph boundaries into chunks the local context can hold. */
function chunkParagraphs(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const paras = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let cur = "";
  for (const p of paras) {
    if (cur && cur.length + p.length + 2 > maxChars) { chunks.push(cur); cur = ""; }
    // A single paragraph larger than the budget is split hard on line breaks.
    if (p.length > maxChars) {
      if (cur) { chunks.push(cur); cur = ""; }
      for (let i = 0; i < p.length; i += maxChars) chunks.push(p.slice(i, i + maxChars));
      continue;
    }
    cur = cur ? `${cur}\n\n${p}` : p;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

function localPrompt(task: LocalAiTask, payload: string, instruction?: string): string {
  if (task === "summarize") return `${payload}\n\nWrite the summary:`;
  if (task === "proofread") return `--- TEXT START ---\n${payload}\n--- TEXT END ---\n\nReturn ONLY the corrected text:`;
  return `MODIFICATION REQUEST: ${instruction}\n\n--- DOCUMENT START ---\n${payload}\n--- DOCUMENT END ---\n\nReturn ONLY the modified document:`;
}

export async function runRouted(opts: RoutedRunOptions): Promise<RoutedRunResult> {
  const tier = opts.tier ?? "small";
  const decision = opts.decision ?? decideRoute(opts.text, { tier });
  const { route, fallbackNote } = resolveExecution(decision);
  const started = performance.now();
  const notes: string[] = [];
  if (fallbackNote) notes.push(fallbackNote);

  if (opts.task === "custom" && !opts.instruction?.trim()) {
    throw new Error("A custom run needs an instruction.");
  }

  opts.onPhase?.("extracting");
  const { payload, cloudInstruction } = buildPayload(opts.task, opts.text, notes);

  let output: string;
  let modelId: string;
  let tokensPerSecond: number | undefined;
  let maskedCount = 0;
  let lostTokens: string[] = [];
  let leakCheck: RoutedRunResult["leakCheck"];

  if (route === "LOCAL") {
    opts.onPhase?.("loading-model");
    const chunks = opts.task === "proofread"
      ? chunkParagraphs(payload, LOCAL_CHUNK_CHARS)
      : [payload];

    if (opts.task !== "proofread" && payload.length > LOCAL_CHUNK_CHARS * 1.5) {
      throw new Error(
        `This document is too long for the on-device model's context window (${payload.length.toLocaleString()} chars). ` +
        (opts.task === "custom"
          ? "Document-level instructions can't be applied piecewise — shorten the document or use the summarize task."
          : "Try again with a shorter document."),
      );
    }
    if (chunks.length > 1) notes.push(`Processed in ${chunks.length} chunks to fit the on-device context window.`);

    const outputs: string[] = [];
    let tpsSum = 0, tpsN = 0;
    for (const chunk of chunks) {
      const res = await localGenerate({
        tier,
        system: SYSTEMS[opts.task],
        prompt: localPrompt(opts.task, chunk, opts.instruction),
        maxTokens: opts.task === "summarize" ? 1200 : 4000,
        onToken: (partial) => opts.onToken?.([...outputs, partial].join("\n\n")),
        onProgress: (p) => {
          opts.onProgress?.(p);
          if (p.progress >= 1) opts.onPhase?.("generating");
        },
      });
      outputs.push(stripFences(res.text));
      if (res.tokensPerSecond) { tpsSum += res.tokensPerSecond; tpsN++; }
      modelId = res.modelId;
    }
    output = outputs.join("\n\n");
    modelId = LOCAL_MODEL_IDS[tier];
    tokensPerSecond = tpsN ? Math.round(tpsSum / tpsN) : undefined;
  } else if (route === "HYBRID") {
    opts.onPhase?.("masking");
    let { masked, map, count } = maskSensitive(payload);
    maskedCount = count;

    if (opts.deepLeakCheck) {
      opts.onPhase?.("leak-check");
      const residual = (await detectNamedEntities(masked, opts.onProgress))
        .filter((e) => e.type === "PER")
        .map((e) => e.text);
      const extra = maskExtra(masked, map, residual, "identity");
      leakCheck = { residualFound: extra.count, remasked: extra.count > 0 };
      if (extra.count > 0) {
        masked = extra.masked;
        map = extra.map;
        maskedCount += extra.count;
        notes.push(`Leak check re-masked ${extra.count} residual name(s) the regex pass missed.`);
      }
    }

    opts.onPhase?.("cloud-request");
    const instruction = (opts.task === "custom" ? opts.instruction! : cloudInstruction) + TOKEN_GUARD;
    const raw = await cloudModify(masked, instruction, opts.signal);
    opts.onPhase?.("unmasking");
    lostTokens = droppedTokens(raw, map);
    output = unmask(stripFences(raw), map);
    modelId = "cloud (pseudonymized)";
  } else {
    opts.onPhase?.("cloud-request");
    const instruction = opts.task === "custom" ? opts.instruction! : cloudInstruction;
    output = stripFences(await cloudModify(payload, instruction, opts.signal));
    modelId = "cloud";
  }

  if (route !== "LOCAL") opts.onToken?.(output);

  const quality = measureOutputQuality(opts.task, opts.text, output);
  if (route === "LOCAL" && output.trim()) {
    // One honest data point for this device: complexity at decision time vs
    // measured outcome. This is what turns Factor 3 empirical over time.
    recordQualitySample(tier, decision.complexity.score, quality.score);
  }

  return {
    decision,
    task: opts.task,
    executedRoute: route,
    fallbackNote,
    output,
    modelId,
    durationMs: Math.round(performance.now() - started),
    tokensPerSecond,
    maskedCount,
    lostTokens,
    leakCheck,
    quality,
    notes,
  };
}

/** The local model id the current tier would use (for UI display). */
export function localModelIdFor(tier: LocalTier): string {
  return LOCAL_MODEL_IDS[tier];
}

function stripFences(s: string): string {
  return s.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "").trim();
}
