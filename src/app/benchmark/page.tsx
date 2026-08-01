import { BenchmarkDashboard } from "@/components/BenchmarkDashboard";
import { RotateCcw, ChevronRight } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "SFI Benchmark — FileFlowOne" };

export default function BenchmarkPage() {
  return (
    <div className="container max-w-5xl py-10 space-y-6">
      <Link
        href="/roundtrip"
        className="group flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
      >
        <RotateCcw className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Round-Trip Fidelity Tracker</p>
          <p className="text-xs text-muted-foreground">
            Measure cumulative meaning-loss across a chain of conversions (A→B→C→…) — the SFI, extended.
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
      </Link>
      <BenchmarkDashboard />
    </div>
  );
}
