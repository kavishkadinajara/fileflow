import { UsageAnalytics } from "@/components/UsageAnalytics";
import { BarChart3 } from "lucide-react";

export const metadata = {
  title: "Usage Analytics — FileFlowOne",
  description: "Aggregate usage analytics — the most popular conversion format pairs. Counts only, no personal data.",
};

export default function AnalyticsPage() {
  return (
    <div className="container max-w-3xl py-10 space-y-8">
      <section className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
          <BarChart3 className="h-3.5 w-3.5" />
          Aggregate insights
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Usage analytics
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed">
          Which conversions do people run most? This view aggregates conversion history into ranked
          format-pair counts — and nothing else. It reads through a security-definer function that
          returns totals only, so no individual&apos;s activity is ever exposed.
        </p>
      </section>

      <UsageAnalytics />
    </div>
  );
}
