/**
 * ConvertBench-lite — table extractor accuracy bench.
 *
 * Scores the production extractor (POST :8000/api/pdf-tables, fmt=json) and the
 * pdfplumber baseline (pdfplumber_tables.json) against generated ground truth.
 *
 * Metrics per (extractor, fixture):
 *   • detection  — GT tables matched (≥50% cell accuracy) / GT tables, plus
 *                  false-positive tables (prose detected as a table)
 *   • cell accuracy — cells equal at the same (row, col) after whitespace
 *                  normalisation ÷ GT cells, on the best-matched table
 *
 * Prereqs: make_fixtures.py + baseline_pdfplumber.py already run; :8000 up.
 * Usage:   node bench/tables/runtables.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BENCH = dirname(HERE);
const RESULTS = join(BENCH, "results");
const PYTHON = process.env.PYTHON_BACKEND_URL ?? "http://localhost:8000";

const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

/** Drop fully-empty rows/columns (row-detection strategies emit spacer rows). */
function compact(cells) {
  const rows = cells.filter((r) => r.some((c) => norm(c) !== ""));
  if (!rows.length) return rows;
  const width = Math.max(...rows.map((r) => r.length));
  const keepCol = Array.from({ length: width }, (_, c) => rows.some((r) => norm(r[c]) !== ""));
  return rows.map((r) => r.filter((_, c) => keepCol[c]));
}

/** Cell accuracy of candidate matrix vs ground truth at identical positions. */
function cellAccuracy(gt, cand) {
  const total = gt.reduce((a, r) => a + r.length, 0);
  let hit = 0;
  for (let r = 0; r < gt.length; r++) {
    for (let c = 0; c < gt[r].length; c++) {
      if (norm(cand?.[r]?.[c]) === norm(gt[r][c])) hit++;
    }
  }
  return { hit, total, acc: total ? hit / total : 0 };
}

/** Greedy best assignment of extracted tables to GT tables (per fixture). */
function scoreFixture(gtTables, extracted) {
  const pairs = [];
  for (let g = 0; g < gtTables.length; g++) {
    for (let e = 0; e < extracted.length; e++) {
      pairs.push({ g, e, ...cellAccuracy(gtTables[g].cells, compact(extracted[e].cells)) });
    }
  }
  pairs.sort((a, b) => b.acc - a.acc);
  const usedG = new Set(), usedE = new Set(), matches = [];
  for (const p of pairs) {
    if (usedG.has(p.g) || usedE.has(p.e)) continue;
    usedG.add(p.g); usedE.add(p.e); matches.push(p);
  }
  const detected = matches.filter((m) => m.acc >= 0.5).length;
  const cellsHit = matches.reduce((a, m) => a + m.hit, 0);
  const cellsTotal = gtTables.reduce((a, t) => a + t.cells.reduce((x, r) => x + r.length, 0), 0);
  const falsePositives = extracted.length - detected;
  return { detected, gtCount: gtTables.length, falsePositives, cellsHit, cellsTotal,
           perTable: matches.map((m) => ({ gt: m.g, acc: +(m.acc).toFixed(4) })) };
}

async function extractOurs(pdfPath) {
  const bytes = readFileSync(pdfPath);
  const copy = new Uint8Array(bytes.byteLength); copy.set(bytes);
  const form = new FormData();
  form.append("file", new Blob([copy.buffer], { type: "application/pdf" }), "fixture.pdf");
  form.append("fmt", "json");
  const r = await fetch(`${PYTHON}/api/pdf-tables`, { method: "POST", body: form });
  if (!r.ok) throw new Error(`pdf-tables ${r.status}: ${await r.text()}`);
  const j = await r.json();
  // Summary shape: { tables: [{ page, headers, rows | cells, ... }] } — accept both.
  return (j.tables ?? []).map((t) => ({
    page: (t.page ?? 1) - 1,
    cells: t.cells ?? [t.headers ?? [], ...(t.rows ?? [])].filter((r) => r.length),
  }));
}

async function main() {
  mkdirSync(RESULTS, { recursive: true });
  const fixtures = JSON.parse(readFileSync(join(HERE, "fixtures.json"), "utf8"));
  const plumber = JSON.parse(readFileSync(join(HERE, "pdfplumber_tables.json"), "utf8"));

  const rows = [];
  for (const fx of fixtures) {
    const pdfPath = join(HERE, "fixtures", fx.file);
    const ours = await extractOurs(pdfPath);
    const base = plumber[fx.file] ?? [];

    for (const [name, extracted] of [["fileflowone", ours], ["pdfplumber", base]]) {
      const s = scoreFixture(fx.tables, extracted);
      rows.push({
        fixture: fx.file.replace(".pdf", ""), extractor: name,
        gt_tables: s.gtCount, detected: s.detected, false_positives: s.falsePositives,
        cell_accuracy: +(s.cellsHit / s.cellsTotal).toFixed(4),
        cells: `${s.cellsHit}/${s.cellsTotal}`,
      });
      console.log(`${fx.file.padEnd(28)} ${name.padEnd(12)} det ${s.detected}/${s.gtCount} fp=${s.falsePositives} cells ${s.cellsHit}/${s.cellsTotal} (${((s.cellsHit / s.cellsTotal) * 100).toFixed(1)}%)`);
    }
  }

  for (const name of ["fileflowone", "pdfplumber"]) {
    const rs = rows.filter((r) => r.extractor === name);
    const det = rs.reduce((a, r) => a + r.detected, 0);
    const gt = rs.reduce((a, r) => a + r.gt_tables, 0);
    const fp = rs.reduce((a, r) => a + r.false_positives, 0);
    const [hit, total] = rs.reduce((a, r) => { const [h, t] = r.cells.split("/").map(Number); return [a[0] + h, a[1] + t]; }, [0, 0]);
    console.log(`\nTOTAL ${name}: detection ${det}/${gt}, false positives ${fp}, cell accuracy ${((hit / total) * 100).toFixed(1)}%`);
    rows.push({ fixture: "TOTAL", extractor: name, gt_tables: gt, detected: det, false_positives: fp, cell_accuracy: +(hit / total).toFixed(4), cells: `${hit}/${total}` });
  }

  const headers = ["fixture", "extractor", "gt_tables", "detected", "false_positives", "cell_accuracy", "cells"];
  writeFileSync(join(RESULTS, "tables_accuracy.csv"),
    [headers.join(","), ...rows.map((r) => headers.map((h) => r[h]).join(","))].join("\n") + "\n", "utf8");
  console.log("\nWrote tables_accuracy.csv");
}

main();
