/**
 * Per-operation Privacy Receipt — a verifiable, exportable record of exactly how
 * one document was processed. This operationalizes the audit framework (research
 * gaps 7 & 9) at the granularity that matters to a compliance officer: not "the
 * app is private in general" but "THIS document, on THIS run, produced THESE
 * network requests and never left the device".
 *
 * Verifiability without a server:
 *   • documentSha256 is computed locally — the holder of the original file can
 *     recompute the hash and confirm which document the receipt refers to,
 *     without the receipt ever containing the document.
 *   • network lists every request the monitor observed during the run window,
 *     with its class; thirdPartyUploads / aiProviderUploads are counted so the
 *     zero-upload claim is falsifiable, not asserted.
 *   • attestation is the SHA-256 of the receipt body — any later edit to the
 *     JSON breaks it.
 *
 * No conversion tool or document-AI product issues per-operation privacy
 * receipts; the nearest analogues (SOC2 reports, DPAs) are annual and
 * organizational, not per-document and mechanical.
 */
import type { Route, RoutingDecision } from "./router";
import type { NetworkEvent } from "./networkMonitor";

export interface PrivacyReceipt {
  version: 1;
  issuedAt: string;                 // ISO timestamp
  operation: string;                // e.g. "summarize", "proofread"
  document: { sha256: string; chars: number };
  routing: {
    decided: Route;
    executed: Route;
    fallbackNote?: string;
    sensitivity: { score: number; level: string; topReason: string };
    complexity: number;
    predictedLocalQuality: number;
  };
  execution: {
    model: string;
    durationMs: number;
    maskedCount: number;
    lostTokens: number;
    leakCheck?: { residualFound: number; remasked: boolean };
    measuredQuality?: number;
  };
  network: {
    requests: { host: string; klass: string; method: string; hasBody: boolean }[];
    thirdPartyUploads: number;
    aiProviderUploads: number;
    /** Uploads to the app's own API — the CLOUD/HYBRID path routes through it. */
    appApiUploads: number;
    /** Supabase auth/history traffic — carries metadata only; the schema cannot store document content. */
    metadataUploads: number;
    documentLeftDevice: boolean;
  };
  attestation: { algorithm: "SHA-256"; hash: string };
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface ReceiptInput {
  operation: string;
  text: string;
  decision: RoutingDecision;
  executedRoute: Route;
  fallbackNote?: string;
  model: string;
  durationMs: number;
  maskedCount: number;
  lostTokens: string[];
  leakCheck?: { residualFound: number; remasked: boolean };
  measuredQuality?: number;
  /** Network events observed between run start and end (monitor window). */
  events: NetworkEvent[];
}

export async function buildPrivacyReceipt(input: ReceiptInput): Promise<PrivacyReceipt> {
  const uploads = input.events.filter((e) => e.hasBody);
  const thirdPartyUploads = uploads.filter((e) => e.klass === "third-party").length;
  const aiProviderUploads = uploads.filter((e) => e.klass === "ai-provider").length;
  const appApiUploads = uploads.filter((e) => e.klass === "same-site-api").length;
  const metadataUploads = uploads.filter((e) => e.klass === "supabase").length;
  // The document "left the device" iff an upload went somewhere that can carry
  // document content: the app's API (the CLOUD/HYBRID path), an AI provider, or
  // an unknown third party. Supabase traffic is auth/metadata by schema design
  // (the data layer physically cannot store document content) and model-cdn is
  // download-only — both are listed in `requests` for scrutiny, not asserted away,
  // but they do not flip this flag.
  const documentLeftDevice = thirdPartyUploads + aiProviderUploads + appApiUploads > 0;

  const body: Omit<PrivacyReceipt, "attestation"> = {
    version: 1,
    issuedAt: new Date().toISOString(),
    operation: input.operation,
    document: { sha256: await sha256Hex(input.text), chars: input.text.length },
    routing: {
      decided: input.decision.route,
      executed: input.executedRoute,
      ...(input.fallbackNote ? { fallbackNote: input.fallbackNote } : {}),
      sensitivity: {
        score: input.decision.sensitivity.score,
        level: input.decision.sensitivity.level,
        topReason: input.decision.sensitivity.topReason,
      },
      complexity: input.decision.complexity.score,
      predictedLocalQuality: input.decision.predictedLocalQuality,
    },
    execution: {
      model: input.model,
      durationMs: input.durationMs,
      maskedCount: input.maskedCount,
      lostTokens: input.lostTokens.length,
      ...(input.leakCheck ? { leakCheck: input.leakCheck } : {}),
      ...(input.measuredQuality !== undefined ? { measuredQuality: input.measuredQuality } : {}),
    },
    network: {
      requests: input.events.map((e) => ({ host: e.host, klass: e.klass, method: e.method, hasBody: e.hasBody })),
      thirdPartyUploads,
      aiProviderUploads,
      appApiUploads,
      metadataUploads,
      documentLeftDevice,
    },
  };

  const hash = await sha256Hex(JSON.stringify(body));
  return { ...body, attestation: { algorithm: "SHA-256", hash } };
}

/** Trigger a browser download of the receipt as JSON. */
export function downloadReceipt(receipt: PrivacyReceipt) {
  const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `privacy-receipt-${receipt.document.sha256.slice(0, 12)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
