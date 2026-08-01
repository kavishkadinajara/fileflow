import { RoundTripTracker } from "@/components/RoundTripTracker";
import { RotateCcw } from "lucide-react";

export const metadata = {
  title: "Round-Trip Fidelity Tracker — FileFlowOne",
  description:
    "Measure how much meaning a document loses when converted through a chain of formats (A→B→C→…). Per-hop and cumulative Semantic Fidelity Index scores, a degradation curve, and a safe-path recommender.",
};

export default function RoundTripPage() {
  return (
    <div className="container max-w-3xl py-10 space-y-8">
      <section className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
          <RotateCcw className="h-3.5 w-3.5" />
          Research metric · Gap 10
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Round-trip <span className="text-gradient">fidelity</span> tracker
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto leading-relaxed">
          A contract drafted in Word, shared as PDF, annotated in Markdown, and converted back
          passes through four formats — and no tool tells you what was lost. This one does. Build a
          conversion chain and measure the fidelity at every hop, both locally and cumulatively
          against the original, so silent compounding loss becomes visible.
        </p>
      </section>

      <RoundTripTracker />
    </div>
  );
}
