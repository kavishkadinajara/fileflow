"use client";

/**
 * Privacy-Aware Router — research gap 3, decision AND execution.
 *
 * Paste or type document text and the three routing factors compute live, entirely
 * in the browser (no request is made — which is the whole point of judging
 * sensitivity before deciding whether the document may leave the device). The
 * routing decision (LOCAL / HYBRID / CLOUD) updates as you type, and the Execute
 * panel then RUNS the document on that route: on-device WebLLM for LOCAL,
 * pseudonymized cloud for HYBRID, cloud for CLOUD. Every run issues a verifiable
 * Privacy Receipt and (for local runs) a quality sample that calibrates Factor 3
 * for this device.
 */
import {
  buildDecision,
  estimateComplexity,
  predictLocalQuality,
  type RoutingDecision,
  type LocalTier,
} from "@/lib/privacy/router";
import { classifySensitivity, labelFor, type SensitivityCategory } from "@/lib/privacy/sensitivity";
import {
  predictLocalQualityCalibrated,
  type CalibratedPrediction,
} from "@/lib/privacy/calibration";
import { getEvents } from "@/lib/privacy/networkMonitor";
import {
  buildPrivacyReceipt, downloadReceipt, type PrivacyReceipt,
} from "@/lib/privacy/receipt";
import {
  localModelIdFor, resolveExecution, runRouted,
  type LocalAiTask, type RoutedRunResult, type RunPhase,
} from "@/lib/local-ai/executor";
import { interruptLocal, isWebGpuAvailable } from "@/lib/local-ai/webllm";
import { applyNerBoost, detectNamedEntities, type NamedEntity } from "@/lib/local-ai/ner";
import {
  Cpu, Cloud, Split, ShieldCheck, Gauge, Layers, Eye, Sparkles,
  Play, Loader2, AlertTriangle, Download, ScanSearch, Square, ReceiptText, BadgeCheck,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const ROUTE_META = {
  LOCAL: { icon: Cpu, label: "Local", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    blurb: "Processed on your device. Nothing is uploaded." },
  HYBRID: { icon: Split, label: "Hybrid", cls: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    blurb: "Sensitive parts stay local; only non-sensitive content is refined in the cloud." },
  CLOUD: { icon: Cloud, label: "Cloud", cls: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    blurb: "Sent to a cloud model for the best result — safe because no sensitive data was found." },
} as const;

const SAMPLES: { label: string; text: string }[] = [
  { label: "Medical letter", text: "Dear Dr. Silva,\n\nRe: Patient Nimal Perera (NIC 923456789V), date of birth 12/03/1992.\n\nThe patient's recent diagnosis confirms Type 2 diabetes with elevated blood pressure. Current medication and dosage have been adjusted. Please contact the clinic at nimal.records@health.lk or 077 123 4567 to schedule a follow-up.\n\nRegards,\nMedical Records Department" },
  { label: "Public article", text: "# Getting Started with Sourdough\n\nBaking sourdough at home is easier than it looks. Begin by mixing equal parts flour and water to create a starter, and let it ferment at room temperature for about twelve hours. Once bubbly and active, combine it with more flour, water, and a pinch of salt.\n\nShape the dough, let it rise, then bake in a hot oven at around 240 degrees until the crust is golden." },
  { label: "Financial statement", text: "ACCOUNT STATEMENT\n\nAccount holder: Jane Doe\nBank account number: 1234567890\nRouting number: 021000021\n\nAnnual salary credited: significant. Recent wire transfer processed to SWIFT code ABCDLKLX. Card on file ending 0366. Please keep this statement confidential." },
];

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round(value * 100)}%`, background: color }} />
    </div>
  );
}

function FactorCard({ icon: Icon, title, value, hint, color }: {
  icon: typeof Gauge; title: string; value: number; hint: string; color: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {title}</span>
        <span className="text-sm font-bold tabular-nums" style={{ color }}>{Math.round(value * 100)}%</span>
      </div>
      <Bar value={value} color={color} />
      <p className="text-[10px] text-muted-foreground leading-relaxed">{hint}</p>
    </div>
  );
}

function sensColor(s: number): string {
  return s >= 0.6 ? "#ef4444" : s >= 0.3 ? "#f59e0b" : "#10b981";
}

const PHASE_LABELS: Record<RunPhase, string> = {
  extracting: "Extracting key content on-device…",
  "loading-model": "Preparing the on-device model…",
  generating: "Generating on-device — nothing is leaving this browser…",
  masking: "Pseudonymizing PII on-device…",
  "leak-check": "NER leak check — scanning masked text for residual names…",
  "cloud-request": "Cloud model working…",
  unmasking: "Restoring private values locally…",
};

const DOWNLOAD_HINTS: Record<LocalTier, string> = {
  small: "first run downloads ~0.9 GB of weights (cached by the browser afterwards)",
  medium: "first run downloads ~2.4 GB of weights (cached by the browser afterwards)",
};

const TASKS: { id: LocalAiTask; label: string }[] = [
  { id: "summarize", label: "Summarize" },
  { id: "proofread", label: "Proofread" },
  { id: "custom", label: "Custom instruction" },
];

/**
 * Decision → execution. Runs the document on the decided route, measures the
 * output, and issues a downloadable Privacy Receipt for the run.
 */
function ExecutePanel({ text, tier, decision, onRunComplete }: {
  text: string; tier: LocalTier; decision: RoutingDecision; onRunComplete: () => void;
}) {
  const [task, setTask] = useState<LocalAiTask>("summarize");
  const [instruction, setInstruction] = useState("");
  const [leakCheckOn, setLeakCheckOn] = useState(true);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<RunPhase | null>(null);
  const [progress, setProgress] = useState<{ progress: number; text: string } | null>(null);
  const [output, setOutput] = useState("");
  const [result, setResult] = useState<RoutedRunResult | null>(null);
  const [receipt, setReceipt] = useState<PrivacyReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  // WebGPU is read in an effect so SSR and the first client render agree.
  const [webgpu, setWebgpu] = useState(true);
  useEffect(() => { setWebgpu(isWebGpuAvailable()); }, []);
  const runSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const planned = useMemo(() => {
    try {
      return { ...resolveExecution(decision, webgpu), veto: null as string | null };
    } catch (err) {
      return { route: null, fallbackNote: undefined, veto: err instanceof Error ? err.message : String(err) };
    }
  }, [decision, webgpu]);

  async function run() {
    const seq = ++runSeq.current;
    const abort = new AbortController();
    abortRef.current = abort;
    setRunning(true); setError(null); setOutput(""); setResult(null); setReceipt(null); setPhase(null); setProgress(null);

    // The receipt's network window: everything the monitor records after this id.
    const startEventId = getEvents()[0]?.id ?? 0;

    try {
      const res = await runRouted({
        text, task,
        instruction: task === "custom" ? instruction : undefined,
        tier, decision,
        deepLeakCheck: leakCheckOn,
        signal: abort.signal,
        onPhase: (p) => { if (seq === runSeq.current) setPhase(p); },
        onToken: (t) => { if (seq === runSeq.current) setOutput(t); },
        onProgress: (p) => { if (seq === runSeq.current) setProgress(p); },
      });
      if (seq !== runSeq.current) return;
      setResult(res);
      setOutput(res.output);
      onRunComplete();

      const events = getEvents().filter((e) => e.id > startEventId).reverse();
      const built = await buildPrivacyReceipt({
        operation: task,
        text,
        decision: res.decision,
        executedRoute: res.executedRoute,
        fallbackNote: res.fallbackNote,
        model: res.modelId,
        durationMs: res.durationMs,
        maskedCount: res.maskedCount,
        lostTokens: res.lostTokens,
        leakCheck: res.leakCheck,
        measuredQuality: res.quality.score,
        events,
      });
      if (seq === runSeq.current) setReceipt(built);
    } catch (err) {
      if (seq !== runSeq.current) return;
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Stopped — the request was cancelled before completion.");
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (seq === runSeq.current) { setRunning(false); setPhase(null); setProgress(null); abortRef.current = null; }
    }
  }

  function stop() {
    abortRef.current?.abort();
    void interruptLocal(); // local stream ends with the tokens produced so far
  }

  const plannedHint = planned.route === "LOCAL"
    ? `Runs entirely in this browser tab on ${localModelIdFor(tier)} — ${DOWNLOAD_HINTS[tier]}. The document never leaves the device.`
    : planned.route === "HYBRID"
      ? "PII values are replaced with opaque tokens on-device; only the pseudonymized text goes to the cloud, and the values are restored locally afterwards."
      : planned.route === "CLOUD"
        ? "The document is sent to the app's cloud AI route — allowed because no sensitive content was detected."
        : null;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Play className="h-4 w-4 text-primary" /> Run it — decision → execution
      </h3>

      {planned.veto ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{planned.veto}</p>
        </div>
      ) : (
        <>
          {plannedHint && <p className="text-[11px] text-muted-foreground leading-relaxed">{plannedHint}</p>}
          {planned.fallbackNote && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {planned.fallbackNote}
            </p>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            {TASKS.map((t) => (
              <button key={t.id} onClick={() => setTask(t.id)} disabled={running}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${task === t.id
                  ? "border-primary/60 bg-primary/10 text-primary font-semibold"
                  : "hover:border-primary/40 hover:text-primary"}`}>
                {t.label}
              </button>
            ))}
            {task === "summarize" && (
              <span className="text-[10px] text-muted-foreground">
                grounded — TextRank picks the sentences on-device; the model only rewrites them
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {task === "custom" ? (
              <input
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                disabled={running}
                placeholder="e.g. Translate to Sinhala · Turn into bullet points…"
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            ) : (
              <div className="flex-1" />
            )}
            {running ? (
              <button onClick={stop}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors">
                <Square className="h-3.5 w-3.5" /> Stop
              </button>
            ) : (
              <button
                onClick={run}
                disabled={task === "custom" && !instruction.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                <Play className="h-3.5 w-3.5" /> Run
              </button>
            )}
          </div>

          {planned.route === "HYBRID" && (
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={leakCheckOn} onChange={(e) => setLeakCheckOn(e.target.checked)}
                disabled={running} className="h-3.5 w-3.5 accent-primary" />
              NER leak check — scan the masked text for residual names before anything is uploaded (~110 MB model, cached)
            </label>
          )}
        </>
      )}

      {running && phase && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            {phase === "loading-model" ? <Download className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}
            {PHASE_LABELS[phase]}
          </p>
          {(phase === "loading-model" || phase === "leak-check") && progress && (
            <>
              <Bar value={progress.progress} color="#10b981" />
              <p className="text-[10px] text-muted-foreground truncate">{progress.text}</p>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {output && (
        <textarea
          readOnly
          value={output}
          className="w-full h-40 resize-y rounded-lg border bg-background p-3 text-xs font-mono focus:outline-none"
        />
      )}

      {result && (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium">
              executed: {result.executedRoute.toLowerCase()}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full border text-muted-foreground">
              model: {result.modelId}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full border text-muted-foreground tabular-nums">
              {(result.durationMs / 1000).toFixed(1)}s{result.tokensPerSecond ? ` · ${result.tokensPerSecond} tok/s` : ""}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full border text-muted-foreground flex items-center gap-1"
              title={result.quality.components.map((c) => `${c.name}: ${Math.round(c.score * 100)}%`).join(" · ")}>
              <BadgeCheck className="h-3 w-3" /> measured quality {Math.round(result.quality.score * 100)}%
            </span>
            {result.executedRoute === "HYBRID" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border text-muted-foreground">
                {result.maskedCount} PII value{result.maskedCount === 1 ? "" : "s"} pseudonymized
              </span>
            )}
            {result.leakCheck && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${result.leakCheck.residualFound
                ? "border-amber-500/40 text-amber-600 dark:text-amber-400"
                : "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"}`}>
                leak check: {result.leakCheck.residualFound ? `${result.leakCheck.residualFound} residual name(s) re-masked` : "clean"}
              </span>
            )}
            {result.lostTokens.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/40 text-amber-600 dark:text-amber-400">
                {result.lostTokens.length} placeholder(s) dropped by the cloud model
              </span>
            )}
            {result.executedRoute === "LOCAL" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> zero document bytes uploaded
              </span>
            )}
          </div>

          {result.notes.length > 0 && (
            <ul className="text-[10px] text-muted-foreground space-y-0.5">
              {result.notes.map((n, i) => <li key={i}>· {n}</li>)}
            </ul>
          )}

          {receipt && (
            <div className="rounded-lg border bg-background p-3 flex items-center gap-3">
              <ReceiptText className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium">Privacy Receipt issued</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  doc sha256 {receipt.document.sha256.slice(0, 16)}… · {receipt.network.requests.length} request(s) in window ·{" "}
                  {receipt.network.thirdPartyUploads} third-party upload(s)
                  {receipt.network.metadataUploads > 0 && ` · ${receipt.network.metadataUploads} metadata-only (auth/history)`}
                  {" "}· document left device: {receipt.network.documentLeftDevice ? "yes" : "NO"}
                </p>
              </div>
              <button onClick={() => downloadReceipt(receipt)}
                className="text-[10px] px-2.5 py-1 rounded-lg border hover:border-primary/40 hover:text-primary transition-colors shrink-0">
                Download JSON
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function PrivacyRouter() {
  const [text, setText] = useState(SAMPLES[0].text);
  const [tier, setTier] = useState<LocalTier>("small");
  const [nerEntities, setNerEntities] = useState<NamedEntity[] | null>(null);
  const [nerRunning, setNerRunning] = useState(false);
  const [nerProgress, setNerProgress] = useState<string | null>(null);
  const [nerError, setNerError] = useState<string | null>(null);
  // Bumped after each local run so the calibrated Factor 3 refreshes.
  const [calVersion, setCalVersion] = useState(0);
  // localStorage-backed calibration must not be read during the server/first-client
  // render (server has no localStorage) — that mismatch would trigger a hydration
  // error. Stay on the a-priori prior until after mount, then re-render with it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // A deep-scan belongs to the text it scanned — new text invalidates it.
  useEffect(() => { setNerEntities(null); setNerError(null); }, [text]);

  const computed: { decision: RoutingDecision; cal: CalibratedPrediction } | null = useMemo(() => {
    if (!text.trim()) return null;
    const base = classifySensitivity(text);
    const sens = nerEntities ? applyNerBoost(base, nerEntities) : base;
    const complexity = estimateComplexity(text).score;
    const cal = mounted
      ? predictLocalQualityCalibrated(complexity, tier)
      : { quality: predictLocalQuality(complexity, tier), prior: predictLocalQuality(complexity, tier), empirical: null, samples: 0, empiricalWeight: 0 };
    return { decision: buildDecision(sens, text, { tier, localQualityOverride: cal.quality }), cal };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, tier, nerEntities, calVersion, mounted]);

  async function deepScan() {
    setNerRunning(true); setNerError(null); setNerProgress(null);
    try {
      const entities = await detectNamedEntities(text, (p) => {
        setNerProgress(`${Math.round(p.progress * 100)}% — ${p.text}`);
      });
      setNerEntities(entities);
    } catch (err) {
      setNerError(err instanceof Error ? err.message : String(err));
    } finally {
      setNerRunning(false); setNerProgress(null);
    }
  }

  const decision = computed?.decision ?? null;
  const cal = computed?.cal ?? null;
  const RM = decision ? ROUTE_META[decision.route] : null;
  const activeCats = decision
    ? (Object.entries(decision.sensitivity.categoryScores) as [SensitivityCategory, number][])
        .filter(([, v]) => v > 0.01)
        .sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Document text</label>
          <div className="flex items-center gap-1.5">
            {SAMPLES.map((s) => (
              <button key={s.label} onClick={() => setText(s.text)}
                className="text-[10px] px-2 py-0.5 rounded-full border hover:border-primary/40 hover:text-primary transition-colors">
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type a document. Everything is analysed locally — this box makes no network request."
          className="w-full h-44 resize-y rounded-xl border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            <Eye className="h-3 w-3 text-emerald-500" /> Analysed entirely in your browser — nothing is sent anywhere.
          </p>
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            Local model:
            <select value={tier} onChange={(e) => setTier(e.target.value as LocalTier)}
              className="rounded border bg-background px-1.5 py-0.5 text-[10px]">
              <option value="small">Small (~1–2B)</option>
              <option value="medium">Medium (~3–4B)</option>
            </select>
          </label>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={deepScan}
            disabled={nerRunning || !text.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
          >
            {nerRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <ScanSearch className="h-3 w-3" />}
            {nerRunning ? "Scanning on-device…" : nerEntities ? "Re-scan" : "Deep scan — find names (on-device NER)"}
          </button>
          {nerRunning && nerProgress && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[50%]">{nerProgress}</span>
          )}
          {nerEntities && !nerRunning && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-teal-500/40 text-teal-600 dark:text-teal-400">
              ensemble active — {nerEntities.length} entit{nerEntities.length === 1 ? "y" : "ies"} found, folded into sensitivity
            </span>
          )}
          {nerError && <span className="text-[10px] text-rose-500">{nerError}</span>}
          <span className="text-[10px] text-muted-foreground">
            BERT NER (~110 MB, cached) runs in this tab — the text is never uploaded to scan it.
          </span>
        </div>
      </div>

      {decision && RM && (
        <div className="space-y-5 animate-fade-up">
          {/* Decision banner */}
          <div className={`rounded-2xl border p-5 flex items-center gap-4 ${RM.cls}`}>
            <RM.icon className="h-10 w-10 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Route: {RM.label}</h2>
                {decision.route === "LOCAL" && decision.sensitivity.score >= 0.6 && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-background/60">
                    <ShieldCheck className="h-3 w-3" /> privacy veto
                  </span>
                )}
              </div>
              <p className="text-xs opacity-90 mt-0.5">{RM.blurb}</p>
              <p className="text-[11px] text-foreground/70 mt-1.5">{decision.reason}</p>
            </div>
          </div>

          {/* Three factors */}
          <div className="grid gap-3 sm:grid-cols-3">
            <FactorCard icon={ShieldCheck} title="Sensitivity" value={decision.factors.sensitivity}
              color={sensColor(decision.factors.sensitivity)}
              hint={`${decision.sensitivity.level} — ${decision.sensitivity.topReason}`} />
            <FactorCard icon={Layers} title="Complexity" value={decision.factors.complexity} color="#8b5cf6"
              hint={`${decision.complexity.signals.words} words, ${decision.complexity.signals.tables} tables, ${decision.complexity.signals.formulas} formulas`} />
            <FactorCard icon={Gauge} title="Predicted local quality" value={decision.factors.localQuality} color="#3b82f6"
              hint={cal && cal.empiricalWeight > 0
                ? `Calibrated from ${cal.samples} measured run${cal.samples === 1 ? "" : "s"} on this device (${Math.round(cal.empiricalWeight * 100)}% empirical, prior ${Math.round(cal.prior * 100)}%)`
                : `A-priori estimate for the on-device ${tier} model — runs on this device will calibrate it`} />
          </div>

          {/* Decision → execution */}
          <ExecutePanel text={text} tier={tier} decision={decision} onRunComplete={() => setCalVersion((v) => v + 1)} />

          {/* Sensitivity breakdown */}
          {activeCats.length > 0 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> What was detected
              </h3>
              <div className="space-y-2">
                {activeCats.map(([cat, val]) => {
                  const catHits = decision.sensitivity.hits.filter((h) => h.category === cat);
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{labelFor(cat)}</span>
                        <span className="tabular-nums text-muted-foreground">{Math.round(val * 100)}%</span>
                      </div>
                      <Bar value={val} color={sensColor(val)} />
                      <div className="flex flex-wrap gap-1">
                        {catHits.map((h) => (
                          <span key={h.detector} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {h.detector} ×{h.count}
                            {h.samples.length > 0 && h.detector !== "IP address" && (
                              <span className="opacity-60"> · {h.samples.slice(0, 2).join(", ")}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" />
                Detectors are deterministic (regex + lexicons). Examples are redacted; the full text never leaves this page.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
