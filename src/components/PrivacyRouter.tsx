"use client";

/**
 * Privacy-Aware Router — interactive demo of research gap 3.
 *
 * Paste or type document text and the three routing factors compute live, entirely
 * in the browser (no request is made — which is the whole point of judging
 * sensitivity before deciding whether the document may leave the device). The
 * routing decision (LOCAL / HYBRID / CLOUD) and its reason update as you type.
 */
import {
  decideRoute,
  type RoutingDecision,
  type LocalTier,
} from "@/lib/privacy/router";
import { labelFor, type SensitivityCategory } from "@/lib/privacy/sensitivity";
import {
  Cpu, Cloud, Split, ShieldCheck, Gauge, Layers, Eye, Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

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

export function PrivacyRouter() {
  const [text, setText] = useState(SAMPLES[0].text);
  const [tier, setTier] = useState<LocalTier>("small");

  const decision: RoutingDecision | null = useMemo(() => {
    if (!text.trim()) return null;
    return decideRoute(text, { tier });
  }, [text, tier]);

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
              hint={`How well the on-device ${tier} model is expected to handle this document`} />
          </div>

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
