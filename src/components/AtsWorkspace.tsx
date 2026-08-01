"use client";

/**
 * Client wrapper that wires the ATS optimizer to its history panel: when a scan
 * is saved, the optimizer fires onSaved → the history panel refreshes so the new
 * scan appears in the timeline immediately.
 */
import { AtsOptimizer } from "@/components/AtsOptimizer";
import { AtsHistory, type AtsHistoryHandle } from "@/components/AtsHistory";
import { useRef } from "react";

export function AtsWorkspace() {
  const historyRef = useRef<AtsHistoryHandle>(null);
  return (
    <div className="space-y-10">
      <AtsOptimizer onSaved={() => historyRef.current?.refresh()} />
      <AtsHistory ref={historyRef} />
    </div>
  );
}
