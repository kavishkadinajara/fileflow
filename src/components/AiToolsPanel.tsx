"use client";

import { Button } from "@/components/ui/button";
import { analyzeText, computeStatisticalScore, type StatisticalResult } from "@/lib/text-analysis";
import { cn } from "@/lib/utils";
import type { FileFormat } from "@/types";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Cpu,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
  User,
  Wand2,
  X,
} from "lucide-react";
import { useState } from "react";

interface LlmDetectResult {
  score: number;
  label: string;
  confidence: string;
  indicators: string[];
  flaggedSentences?: number;
  totalSentences?: number;
  summary: string;
  truncated?: boolean;
  model?: string;
}

interface AiToolsPanelProps {
  content: string;
  format: FileFormat | undefined;
  onApplyHumanized: (text: string) => void;
  onClose: () => void;
}

type PanelView = "menu" | "detecting" | "detected" | "humanizing" | "humanized" | "verifying" | "error";

// ─── Score Gauge ──────────────────────────────────────────────────────────────

function ScoreGauge({ score, size = "normal" }: { score: number; size?: "normal" | "small" }) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const hue = Math.round(120 - (clampedScore / 100) * 120);
  const color = `hsl(${hue}, 70%, 45%)`;
  const rotation = -90 + (clampedScore / 100) * 180;

  if (size === "small") {
    return (
      <div className="flex items-center gap-1.5">
        <div className="relative w-8 h-5 overflow-hidden">
          <div className="absolute inset-0 rounded-t-full border-[3px] border-b-0 border-muted/40" style={{ bottom: "-1px" }} />
          <div
            className="absolute bottom-0 left-1/2 w-px h-4 origin-bottom transition-transform duration-500"
            style={{ transform: `translateX(-50%) rotate(${rotation}deg)`, backgroundColor: color }}
          />
          <div
            className="absolute bottom-0 left-1/2 w-1.5 h-1.5 rounded-full -translate-x-1/2 translate-y-1/2"
            style={{ backgroundColor: color }}
          />
        </div>
        <span className="text-xs font-bold tabular-nums" style={{ color }}>{clampedScore}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-24 h-14 overflow-hidden">
        <div className="absolute inset-0 rounded-t-full border-[6px] border-b-0 border-muted/40" style={{ bottom: "-1px" }} />
        <div
          className="absolute bottom-0 left-1/2 w-0.5 h-10 origin-bottom transition-transform duration-700"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)`, backgroundColor: color }}
        />
        <div
          className="absolute bottom-0 left-1/2 w-3 h-3 rounded-full -translate-x-1/2 translate-y-1/2 border-2 border-background"
          style={{ backgroundColor: color }}
        />
      </div>
      <div className="text-xl font-bold tabular-nums" style={{ color }}>
        {clampedScore}
        <span className="text-xs font-normal text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLabelIcon(label: string) {
  if (label.includes("Human")) return User;
  if (label.includes("AI")) return Bot;
  return BrainCircuit;
}

function getLabelColor(label: string) {
  if (label === "Human") return "text-green-600 dark:text-green-400";
  if (label === "Likely Human") return "text-emerald-600 dark:text-emerald-400";
  if (label === "Mixed") return "text-amber-600 dark:text-amber-400";
  if (label === "Likely AI") return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

function getLabelBg(label: string) {
  if (label === "Human") return "bg-green-500/10 border-green-500/20";
  if (label === "Likely Human") return "bg-emerald-500/10 border-emerald-500/20";
  if (label === "Mixed") return "bg-amber-500/10 border-amber-500/20";
  if (label === "Likely AI") return "bg-orange-500/10 border-orange-500/20";
  return "bg-red-500/10 border-red-500/20";
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function AiToolsPanel({ content, format, onApplyHumanized, onClose }: AiToolsPanelProps) {
  const [view, setView] = useState<PanelView>("menu");
  const [statResult, setStatResult] = useState<StatisticalResult | null>(null);
  const [llmResult, setLlmResult] = useState<LlmDetectResult | null>(null);
  const [ensembleScore, setEnsembleScore] = useState<number | null>(null);
  const [humanizedText, setHumanizedText] = useState<string>("");
  const [beforeScore, setBeforeScore] = useState<number | null>(null);
  const [afterScore, setAfterScore] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [showIndicators, setShowIndicators] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [copied, setCopied] = useState(false);

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const isShort = wordCount < 20;

  async function runDetect() {
    if (!content.trim()) return;
    setView("detecting");
    setStatResult(null);
    setLlmResult(null);
    setEnsembleScore(null);

    try {
      // Layer 1: Client-side statistical analysis (instant)
      const stats = analyzeText(content);
      const statScore = computeStatisticalScore(stats);
      setStatResult(statScore);

      // Layer 2: LLM-based analysis (DeepSeek R1)
      const res = await fetch("/api/ai-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "detect", content, format }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Detection failed");
      setLlmResult(data);

      // Layer 3: Ensemble score (40% statistical + 60% LLM)
      const ensemble = Math.round(statScore.score * 0.4 + data.score * 0.6);
      setEnsembleScore(ensemble);
      setView("detected");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setView("error");
    }
  }

  async function runHumanize() {
    if (!content.trim()) return;
    setView("humanizing");
    setHumanizedText("");
    setBeforeScore(null);
    setAfterScore(null);

    try {
      // Save before score
      const stats = analyzeText(content);
      const before = computeStatisticalScore(stats);
      setBeforeScore(ensembleScore ?? before.score);

      // Humanize via LLM
      const res = await fetch("/api/ai-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "humanize", content, format }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Humanize failed");
      setHumanizedText(data.humanized);

      // Auto-verify: run statistical analysis on humanized text
      setView("verifying");
      const afterStats = analyzeText(data.humanized);
      const afterResult = computeStatisticalScore(afterStats);
      setAfterScore(afterResult.score);

      setView("humanized");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setView("error");
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const ensembleLabel = ensembleScore !== null
    ? ensembleScore <= 20 ? "Human"
      : ensembleScore <= 40 ? "Likely Human"
      : ensembleScore <= 59 ? "Mixed"
      : ensembleScore <= 79 ? "Likely AI"
      : "AI Generated"
    : "";

  return (
    <div className="rounded-2xl border bg-card shadow-lg overflow-hidden animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/10">
            <Wand2 className="h-3.5 w-3.5 text-violet-500" />
          </div>
          <span className="text-xs font-semibold">AI Tools</span>
          {wordCount > 0 && (
            <span className="text-[10px] text-muted-foreground">
              · {wordCount} words
            </span>
          )}
          {isShort && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400">
              (add more text for better results)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {view !== "menu" && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setView("menu")}>
              ← Back
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* ── Menu view ────────────────────────────────────────────────────── */}
      {view === "menu" && (
        <div className="p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={runDetect}
              disabled={!content.trim()}
              className="group flex flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition-all hover:border-violet-500/40 hover:bg-violet-500/5 hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2 w-full">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                  <BrainCircuit className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    Detect AI Content
                  </p>
                  <p className="text-[10px] text-muted-foreground">Multi-layer analysis</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Combines statistical analysis + DeepSeek AI for high-accuracy detection with sentence-level breakdown.
              </p>
            </button>

            <button
              onClick={runHumanize}
              disabled={!content.trim()}
              className="group flex flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition-all hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2 w-full">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Humanize Text
                  </p>
                  <p className="text-[10px] text-muted-foreground">Auto-verified rewriting</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Rewrites with natural style, then auto-verifies the result to show before/after AI scores.
              </p>
            </button>
          </div>

          {/* Tech stack info */}
          <div className="flex items-center gap-2 px-1 text-[10px] text-muted-foreground/70">
            <Layers className="h-3 w-3" />
            <span>Powered by Llama 4 Maverick (detection) + Llama 3.3 70B (rewriting) via Groq</span>
          </div>
        </div>
      )}

      {/* ── Loading states ───────────────────────────────────────────────── */}
      {(view === "detecting" || view === "humanizing" || view === "verifying") && (
        <div className="flex flex-col items-center justify-center gap-3 py-10 px-4">
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl",
            view === "detecting" ? "bg-violet-500/10" : "bg-emerald-500/10"
          )}>
            <Loader2 className={cn(
              "h-6 w-6 animate-spin",
              view === "detecting" ? "text-violet-500" : "text-emerald-500"
            )} />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium">
              {view === "detecting"
                ? "Running multi-layer analysis..."
                : view === "verifying"
                ? "Auto-verifying humanized output..."
                : "Rewriting for natural flow..."}
            </p>
            <p className="text-xs text-muted-foreground">
              {view === "detecting"
                ? "Layer 1: Statistical analysis · Layer 2: DeepSeek AI"
                : view === "verifying"
                ? "Checking if the rewrite passes AI detection"
                : "Preserving your content while improving human feel"}
            </p>
          </div>
          {/* Show statistical score progress for detection */}
          {view === "detecting" && statResult && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground animate-fade-up">
              <BarChart3 className="h-3 w-3" />
              Statistical score: {statResult.score}/100 · Waiting for AI layer...
            </div>
          )}
        </div>
      )}

      {/* ── Detection result ─────────────────────────────────────────────── */}
      {view === "detected" && (statResult || llmResult) && (
        <div className="p-4 space-y-4">
          {/* Ensemble Score + Label */}
          {ensembleScore !== null && (
            <div className="flex items-center gap-5 flex-wrap">
              <ScoreGauge score={ensembleScore} />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const Icon = getLabelIcon(ensembleLabel);
                    return (
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold",
                        getLabelBg(ensembleLabel), getLabelColor(ensembleLabel)
                      )}>
                        <Icon className="h-3.5 w-3.5" />
                        {ensembleLabel}
                      </span>
                    );
                  })()}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-semibold text-violet-600 dark:text-violet-400">
                    <Layers className="h-2.5 w-2.5" />
                    Ensemble
                  </span>
                </div>
                {llmResult?.summary && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {llmResult.summary}
                  </p>
                )}
                {llmResult?.truncated && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">
                    Only first 15,000 characters were analyzed
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Layer breakdown */}
          <div className="grid grid-cols-2 gap-2">
            {/* Statistical layer */}
            {statResult && (
              <div className="rounded-lg border p-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="h-3 w-3 text-blue-500" />
                  <span className="text-[10px] font-semibold">Statistical</span>
                  <ScoreGauge score={statResult.score} size="small" />
                </div>
                <p className="text-[10px] text-muted-foreground">{statResult.label} · {statResult.confidence} conf.</p>
              </div>
            )}

            {/* LLM layer */}
            {llmResult && (
              <div className="rounded-lg border p-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Cpu className="h-3 w-3 text-violet-500" />
                  <span className="text-[10px] font-semibold">Llama 4 AI</span>
                  <ScoreGauge score={llmResult.score} size="small" />
                </div>
                <p className="text-[10px] text-muted-foreground">{llmResult.label} · {llmResult.confidence} conf.</p>
                {llmResult.flaggedSentences !== undefined && llmResult.totalSentences !== undefined && (
                  <p className="text-[10px] text-muted-foreground">
                    {llmResult.flaggedSentences}/{llmResult.totalSentences} sentences flagged
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Indicators accordion */}
          {llmResult?.indicators && llmResult.indicators.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <button
                onClick={() => setShowIndicators((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:bg-muted/20 transition-colors"
              >
                AI indicators ({llmResult.indicators.length})
                {showIndicators ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {showIndicators && (
                <ul className="border-t bg-muted/10 px-3 py-2 space-y-1">
                  {llmResult.indicators.map((ind, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                      <span className="text-primary mt-0.5">·</span>
                      {ind}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Statistical details accordion */}
          {statResult && (
            <div className="rounded-lg border overflow-hidden">
              <button
                onClick={() => setShowStats((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:bg-muted/20 transition-colors"
              >
                Writing statistics
                {showStats ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {showStats && (
                <div className="border-t bg-muted/10 px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                  <span>Burstiness: <strong>{statResult.stats.burstiness.toFixed(2)}</strong></span>
                  <span>TTR: <strong>{statResult.stats.ttr.toFixed(2)}</strong></span>
                  <span>Avg sentence: <strong>{statResult.stats.avgSentenceLength.toFixed(1)} words</strong></span>
                  <span>Sentence StdDev: <strong>{statResult.stats.sentenceLengthStdDev.toFixed(1)}</strong></span>
                  <span>Transitions: <strong>{(statResult.stats.transitionDensity * 100).toFixed(0)}%</strong></span>
                  <span>Hedging: <strong>{(statResult.stats.hedgingDensity * 100).toFixed(0)}%</strong></span>
                  <span>Contractions: <strong>{(statResult.stats.contractionRate * 100).toFixed(0)}%</strong></span>
                  <span>First-person: <strong>{(statResult.stats.firstPersonDensity * 100).toFixed(1)}%</strong></span>
                  <span>Readability: <strong>{statResult.stats.fleschKincaid.toFixed(0)}</strong></span>
                  <span>Para. uniformity: <strong>{statResult.stats.paragraphUniformity.toFixed(2)}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={runHumanize}
            >
              <Sparkles className="h-3 w-3" />
              Humanize this text
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={runDetect}>
              <RefreshCw className="h-3 w-3" />
              Re-analyze
            </Button>
          </div>
        </div>
      )}

      {/* ── Humanized result ─────────────────────────────────────────────── */}
      {view === "humanized" && humanizedText && (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Text humanized & verified
            </span>
          </div>

          {/* Before/After score comparison */}
          {beforeScore !== null && afterScore !== null && (
            <div className="flex items-center gap-3 rounded-lg border p-2.5 bg-muted/10">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">Before</p>
                <ScoreGauge score={beforeScore} size="small" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">After</p>
                <ScoreGauge score={afterScore} size="small" />
              </div>
              <div className="flex-1 text-[10px] text-muted-foreground">
                {beforeScore - afterScore > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    -{beforeScore - afterScore} points — more human!
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">
                    Score unchanged — try rewriting again
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Preview of humanized text */}
          <div className="rounded-lg border bg-muted/10 p-3 max-h-48 overflow-y-auto">
            <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-words font-mono text-foreground/80">
              {humanizedText.slice(0, 1000)}
              {humanizedText.length > 1000 && (
                <span className="text-muted-foreground italic">
                  {"\n\n"}...{humanizedText.length - 1000} more chars
                </span>
              )}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => { onApplyHumanized(humanizedText); onClose(); }}
            >
              <Sparkles className="h-3 w-3" />
              Apply to editor
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => handleCopy(humanizedText)}
            >
              {copied ? (
                <><CheckCircle2 className="h-3 w-3 text-emerald-500" />Copied</>
              ) : (
                <><Copy className="h-3 w-3" />Copy text</>
              )}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 ml-auto" onClick={runHumanize}>
              <RefreshCw className="h-3 w-3" />
              Redo
            </Button>
          </div>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {view === "error" && (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-semibold">Something went wrong</span>
          </div>
          <p className="text-[11px] text-muted-foreground">{errorMsg}</p>
          <p className="text-[10px] text-muted-foreground/60">
            Make sure the GROQ_API_KEY is configured in your environment.
          </p>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setView("menu")}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
