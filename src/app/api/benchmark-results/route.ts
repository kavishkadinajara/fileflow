/**
 * GET /api/benchmark-results
 * Reads benchmark_results.csv from the repo root and returns parsed JSON.
 * Returns 404 if the file doesn't exist yet (benchmark hasn't been run).
 */

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export interface BenchmarkRow {
  file: string;
  src_format: string;
  tgt_format: string;
  sfi_score: number;
  grade: string;
  structural: number;
  semantic: number;
  functional: number;
  processing_ms: number;
  error: string;
}

function parseCsv(text: string): BenchmarkRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const vals = line.split(",");
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h.trim()] = (vals[i] ?? "").trim(); });
    return {
      file:          obj.file          ?? "",
      src_format:    obj.src_format    ?? "",
      tgt_format:    obj.tgt_format    ?? "",
      sfi_score:     parseFloat(obj.sfi_score)    || 0,
      grade:         obj.grade         ?? "",
      structural:    parseFloat(obj.structural)   || 0,
      semantic:      parseFloat(obj.semantic)     || 0,
      functional:    parseFloat(obj.functional)   || 0,
      processing_ms: parseFloat(obj.processing_ms) || 0,
      error:         obj.error         ?? "",
    };
  });
}

export async function GET() {
  const csvPath = path.join(process.cwd(), "benchmark_results.csv");
  if (!fs.existsSync(csvPath)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const text = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCsv(text);
  return NextResponse.json({ rows, generated_at: fs.statSync(csvPath).mtime });
}
