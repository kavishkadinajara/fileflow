import { PrivacyRouter } from "@/components/PrivacyRouter";
import { Split } from "lucide-react";

export const metadata = {
  title: "Privacy-Aware Router — FileFlowOne",
  description:
    "A deterministic, in-browser router that decides whether a document should be processed locally, hybrid, or in the cloud — using sensitivity (PII), complexity, and predicted local-model quality as first-class signals.",
};

export default function PrivacyRouterPage() {
  return (
    <div className="container max-w-3xl py-10 space-y-8">
      <section className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
          <Split className="h-3.5 w-3.5" />
          Research metric · Gap 3
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Privacy-aware <span className="text-gradient">router</span>
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto leading-relaxed">
          Before sending a document to any AI model, one question matters most: <em>should it leave your
          device at all?</em> This router answers it on-device, weighing how sensitive the content is,
          how complex it is, and how well a small local model would handle it — then routes to local,
          hybrid, or cloud. Sensitive documents never leave, by construction.
        </p>
      </section>

      <PrivacyRouter />
    </div>
  );
}
