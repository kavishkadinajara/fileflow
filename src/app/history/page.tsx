import { ConversionHistory } from "@/components/ConversionHistory";
import { Clock } from "lucide-react";

export const metadata = {
  title: "Conversion History — FileFlowOne",
  description:
    "Your past conversions in one place — filename, format pair, size and timing. Privacy-first: only metadata is stored, never your files.",
};

export default function HistoryPage() {
  return (
    <div className="container max-w-3xl py-10 space-y-8">
      <section className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
          <Clock className="h-3.5 w-3.5" />
          Your activity
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Conversion history
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed">
          Every conversion you run while signed in is logged here as metadata only — the
          filename, formats, size and timing. Your actual files are never stored.
        </p>
      </section>

      <section>
        <ConversionHistory />
      </section>
    </div>
  );
}
