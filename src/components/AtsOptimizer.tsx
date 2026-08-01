"use client";

/**
 * ATS Resume Optimizer — upload a CV + paste a job description, get a deterministic
 * match score with an explainable gap report (missing skills/keywords, ATS
 * parse-ability issues), then optionally rewrite your experience bullets to weave in
 * the gaps with AI (grounded — it won't invent experience). A free, transparent
 * alternative to paid ATS scanners.
 */
import { Button } from "@/components/ui/button";
import { fileToBase64 } from "@/lib/utils";
import type { AtsReport } from "@/lib/ats";
import { recordScan } from "@/lib/supabase/atsHistory";
import { isCloudEnabled } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";
import {
  AlertTriangle, CheckCircle2, Copy, FileText, Info, Loader2, ScanLine, Sparkles,
  Upload, X,
} from "lucide-react";
import { useRef, useState } from "react";

function scoreColor(n: number): string {
  if (n >= 75) return "text-emerald-500";
  if (n >= 50) return "text-amber-500";
  return "text-rose-500";
}
function scoreRing(n: number): string {
  if (n >= 75) return "stroke-emerald-500";
  if (n >= 50) return "stroke-amber-500";
  return "stroke-rose-500";
}
// Literal classes (not built at runtime) so Tailwind keeps them in the bundle.
function scoreBg(n: number): string {
  if (n >= 75) return "bg-emerald-500";
  if (n >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

function ScoreRing({ value }: { value: number }) {
  const r = 52, c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} className="stroke-muted/40" strokeWidth="10" fill="none" />
        <circle
          cx="60" cy="60" r={r} className={scoreRing(value)} strokeWidth="10" fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 700ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold tabular-nums ${scoreColor(value)}`}>{value}</span>
        <span className="text-[10px] text-muted-foreground">ATS match</span>
      </div>
    </div>
  );
}

const SUB_LABEL: Record<string, string> = {
  keywords: "Keyword match", skills: "Skills match", similarity: "Relevance", format: "ATS format",
};
const SEVERITY_STYLE: Record<string, string> = {
  high: "border-rose-500/30 bg-rose-500/5",
  medium: "border-amber-500/30 bg-amber-500/5",
  low: "border-muted bg-muted/20",
};

export function AtsOptimizer({ onSaved }: { onSaved?: () => void } = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<AtsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((s) => s.user);

  // Bullet optimizer.
  const [bullets, setBullets] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [optimized, setOptimized] = useState("");
  const [copied, setCopied] = useState(false);

  function pickFile(f: File | null) {
    if (!f) return;
    const ok = /\.(pdf|docx)$/i.test(f.name);
    if (!ok) { setError("Please upload a PDF or DOCX resume."); return; }
    setError(null);
    setFile(f);
  }

  async function handleAnalyze() {
    if (!file || !jd.trim()) return;
    setAnalyzing(true);
    setError(null);
    setReport(null);
    setOptimized("");
    setSaved(false);
    try {
      const fileBase64 = await fileToBase64(file);
      const res = await fetch("/api/ats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "analyze", fileBase64, fileName: file.name, jd }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Analysis failed");
      const rpt = data.report as AtsReport;
      setReport(rpt);

      // Persist to scan history when signed in (best-effort — never blocks the UI).
      if (user) {
        recordScan(rpt, file.name, jd)
          .then((id) => { if (id) { setSaved(true); onSaved?.(); } })
          .catch(() => { /* history is non-critical */ });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleOptimize() {
    if (!bullets.trim() || !report) return;
    setOptimizing(true);
    setError(null);
    try {
      const res = await fetch("/api/ats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "optimize",
          bullets,
          missingKeywords: report.missingKeywords,
          missingSkills: report.missingSkills,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Optimization failed");
      setOptimized(data.optimized);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Optimization failed");
    } finally {
      setOptimizing(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Inputs */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* CV upload */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your resume</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0] ?? null); }}
            className="flex flex-col items-center justify-center gap-2 h-40 rounded-xl border-2 border-dashed cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-5 w-5 text-rose-500" />
                <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Drop your CV or click to upload</p>
                <p className="text-[11px] text-muted-foreground/70">PDF or DOCX</p>
              </>
            )}
          </div>
        </div>

        {/* JD paste */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Job description</label>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description here…"
            className="w-full h-40 resize-none rounded-xl border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleAnalyze} disabled={!file || !jd.trim() || analyzing} className="gap-2">
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
          Analyze match
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Deterministic scoring — your files are processed and discarded, never stored.
        </p>
      </div>

      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      {/* Results */}
      {report && (
        <div className="space-y-6 animate-fade-up">
          {/* History save indicator */}
          {saved && (
            <p className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved to your scan history — track your score over time below.
            </p>
          )}
          {!user && isCloudEnabled() && (
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Info className="h-3.5 w-3.5" /> Sign in to save this scan and track your improvement over time.
            </p>
          )}

          {/* Score + sub-scores */}
          <div className="rounded-2xl border bg-card p-5 flex flex-col sm:flex-row items-center gap-6">
            <ScoreRing value={report.overall} />
            <div className="flex-1 w-full grid grid-cols-2 gap-3">
              {Object.entries(report.subScores).map(([k, v]) => (
                <div key={k} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{SUB_LABEL[k] ?? k}</span>
                    <span className={`font-semibold tabular-nums ${scoreColor(v)}`}>{v}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${scoreBg(v)}`} style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <h3 className="text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Matched skills ({report.matchedSkills.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {report.matchedSkills.length ? report.matchedSkills.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">{s}</span>
                )) : <span className="text-[11px] text-muted-foreground">None matched yet.</span>}
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <h3 className="text-xs font-semibold flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                Missing skills ({report.missingSkills.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {report.missingSkills.length ? report.missingSkills.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-medium">{s}</span>
                )) : <span className="text-[11px] text-muted-foreground">Great — no key skills missing!</span>}
              </div>
            </div>
          </div>

          {/* Missing keywords */}
          {report.missingKeywords.length > 0 && (
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <h3 className="text-xs font-semibold">Missing keywords from the job description</h3>
              <div className="flex flex-wrap gap-1.5">
                {report.missingKeywords.map((k) => (
                  <span key={k} className="px-2 py-0.5 rounded bg-muted text-[11px] text-muted-foreground">{k}</span>
                ))}
              </div>
            </div>
          )}

          {/* Format issues */}
          {report.formatIssues.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-primary" />
                ATS parse-ability ({report.formatIssues.length} issue{report.formatIssues.length === 1 ? "" : "s"})
              </h3>
              <div className="space-y-2">
                {report.formatIssues.map((iss, i) => (
                  <div key={i} className={`rounded-lg border p-3 ${SEVERITY_STYLE[iss.severity]}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{iss.title}</span>
                      <span className="text-[9px] uppercase px-1.5 py-px rounded bg-background/60 text-muted-foreground">{iss.severity}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{iss.detail}</p>
                    <p className="text-[11px] text-foreground/80 mt-1"><strong>Fix:</strong> {iss.fix}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completeness */}
          <div className="rounded-xl border bg-card p-4 grid sm:grid-cols-2 gap-3 text-[11px]">
            <div>
              <span className="font-semibold">Sections: </span>
              {report.sectionsMissing.length === 0
                ? <span className="text-emerald-600 dark:text-emerald-400">all standard sections present</span>
                : <span className="text-amber-600 dark:text-amber-400">missing {report.sectionsMissing.join(", ")}</span>}
            </div>
            <div>
              <span className="font-semibold">Contact: </span>
              <span className={report.contact.email ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}>email {report.contact.email ? "✓" : "✗"}</span>{" · "}
              <span className={report.contact.phone ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}>phone {report.contact.phone ? "✓" : "✗"}</span>{" · "}
              <span className={report.contact.links ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>links {report.contact.links ? "✓" : "—"}</span>
            </div>
          </div>

          {/* AI bullet optimizer */}
          <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-transparent p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Optimize your experience bullets</h3>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Paste your real experience bullet points. AI rewrites them to weave in the missing
              keywords where truthful — it will <strong>never invent experience you don&apos;t have</strong>.
            </p>
            <textarea
              value={bullets}
              onChange={(e) => setBullets(e.target.value)}
              placeholder={"- Wrote test cases for an ERP system\n- Reported bugs and verified fixes"}
              className="w-full h-28 resize-y rounded-lg border bg-background p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Button size="sm" onClick={handleOptimize} disabled={!bullets.trim() || optimizing} className="gap-1.5">
              {optimizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Optimize with AI
            </Button>

            {optimized && (
              <div className="rounded-lg border bg-background p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Optimized bullets</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(optimized); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    {copied ? <><CheckCircle2 className="h-3 w-3 text-emerald-500" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
                  </button>
                </div>
                <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-words font-mono text-foreground/90">{optimized}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
