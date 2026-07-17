import { PrivacyAuditDashboard } from "@/components/PrivacyAuditDashboard";
import { ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Privacy Audit — FileFlowOne",
  description:
    "A live, measured audit of FileFlowOne's privacy: a real-time network monitor proving zero third-party uploads, a formal threat model, and a per-feature processing-location map you can export.",
};

export default function PrivacyAuditPage() {
  return (
    <div className="container max-w-4xl py-10 space-y-8">
      <section className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
          <ShieldCheck className="h-3.5 w-3.5" />
          Measured, not promised
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Privacy <span className="text-gradient">audit</span>
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto leading-relaxed">
          Most apps <em>claim</em> to be private. This one lets you <strong>verify</strong> it. A live monitor
          records every network request your browser makes and classifies it by destination — so you can
          see, in real time, that no document is uploaded to a third party. Below it: the formal threat
          model and exactly where each feature processes your data.
        </p>
        <a href="/privacy-router" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
          See the privacy-aware router that decides what may leave your device →
        </a>
      </section>

      <PrivacyAuditDashboard />
    </div>
  );
}
