import { AtsWorkspace } from "@/components/AtsWorkspace";
import { ScanLine, ShieldCheck, Sparkles, Zap } from "lucide-react";

export const metadata = {
  title: "Resume ATS Optimizer — FileFlowOne",
  description:
    "Free, deterministic ATS resume scanner. Upload your CV and a job description to get an explainable match score, missing keywords & skills, ATS parse-ability checks, and AI-grounded bullet rewriting.",
};

const FEATURES = [
  { icon: ScanLine, title: "Explainable score", desc: "A transparent match score — keyword, skills, relevance & format sub-scores you can see, not a black box." },
  { icon: Zap, title: "Real gap report", desc: "Exactly which skills and keywords the job wants that your CV is missing, ranked." },
  { icon: ShieldCheck, title: "Parse-ability checks", desc: "Flags layouts that break ATS parsers — columns, tables, image-only pages, headers." },
  { icon: Sparkles, title: "Grounded AI rewrite", desc: "Rewrites your real bullets to weave in keywords — it never invents experience." },
];

export default function AtsPage() {
  return (
    <div className="container max-w-4xl py-10 space-y-10">
      {/* Hero */}
      <section className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
          <ScanLine className="h-3.5 w-3.5" />
          Free ATS Resume Scanner
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Beat the <span className="text-gradient">resume robots</span>
        </h1>
        <p className="text-muted-foreground text-base max-w-2xl mx-auto leading-relaxed">
          Most applications are filtered by an ATS before a human reads them. Paste a job description,
          upload your CV, and see exactly how well you match — and how to fix the gaps. No account, no
          paywall, no upload stored.
        </p>
      </section>

      {/* Feature strip */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border bg-card p-4 space-y-2">
            <f.icon className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold">{f.title}</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Tool */}
      <section>
        <AtsWorkspace />
      </section>
    </div>
  );
}
