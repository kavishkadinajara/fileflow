import { BenchmarkDashboard } from "@/components/BenchmarkDashboard";

export const metadata = { title: "SFI Benchmark — FileFlowOne" };

export default function BenchmarkPage() {
  return (
    <div className="container max-w-5xl py-10">
      <BenchmarkDashboard />
    </div>
  );
}
