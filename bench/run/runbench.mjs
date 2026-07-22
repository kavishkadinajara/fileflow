/**
 * ConvertBench-lite — round-trip bench runner.
 *
 * Drives every corpus document through a fixed set of conversion chains via the
 * app's /api/roundtrip endpoint (which reuses all production converters + the
 * Python SFI scorer), and appends one JSON line per (doc, chain) result to
 * bench/results/raw.jsonl.
 *
 * The runner is RESUMABLE: existing (doc, chain) keys in raw.jsonl are skipped,
 * so it can be interrupted and restarted freely. Failures are recorded in
 * errors.jsonl and retried on the next invocation.
 *
 * Prerequisites: Next dev server on :3000 and the Python backend on :8000.
 *
 * Usage:
 *   node bench/run/runbench.mjs                 # everything
 *   node bench/run/runbench.mjs --domain legal  # filter by domain
 *   node bench/run/runbench.mjs --tier complex  # filter by tier
 *   node bench/run/runbench.mjs --chain rt-pdf  # filter by chain id
 *   node bench/run/runbench.mjs --concurrency 3
 */

import { readFileSync, mkdirSync, existsSync, appendFileSync, readFileSync as read } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));   // bench/
const DOCS_DIR = join(ROOT, "corpus", "docs");
const RESULTS_DIR = join(ROOT, "results");
const RAW = join(RESULTS_DIR, "raw.jsonl");
const ERRORS = join(RESULTS_DIR, "errors.jsonl");

const SERVER = process.env.BENCH_SERVER ?? "http://localhost:3000";
const PYTHON = process.env.PYTHON_BACKEND_URL ?? "http://localhost:8000";
const RUN_TIMEOUT_MS = 240_000;

/** The chain battery. Ids are stable — they key the results file. */
export const CHAINS = [
  { id: "rt-html",  chain: ["md", "html", "md"] },
  { id: "rt-docx",  chain: ["md", "docx", "md"] },
  { id: "rt-pdf",   chain: ["md", "pdf", "md"] },
  { id: "rt-txt",   chain: ["md", "txt", "md"] },
  { id: "html-docx", chain: ["md", "html", "docx", "md"] },
  { id: "docx-pdf",  chain: ["md", "docx", "pdf", "md"] },
  { id: "long-4hop", chain: ["md", "html", "docx", "pdf", "md"] },
];

// ── CLI args ───────────────────────────────────────────────────────────────────

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const FILTER_DOMAIN = arg("domain", null);
const FILTER_TIER = arg("tier", null);
const FILTER_CHAIN = arg("chain", null);
const CONCURRENCY = Number(arg("concurrency", "2"));

// ── Helpers ────────────────────────────────────────────────────────────────────

async function checkHealth() {
  const checks = [
    ["Next server", `${SERVER}/api/roundtrip`, async (url) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "recommend", start: "md", end: "docx" }) });
      const j = await r.json();
      return r.ok && j.success;
    }],
    ["Python SFI backend", `${PYTHON}/openapi.json`, async (url) => (await fetch(url)).ok],
  ];
  for (const [name, url, fn] of checks) {
    try {
      if (!(await fn(url))) throw new Error("unhealthy response");
      console.log(`✓ ${name} reachable`);
    } catch (e) {
      console.error(`✗ ${name} NOT reachable at ${url}: ${e.message}`);
      process.exit(1);
    }
  }
}

function loadDoneKeys() {
  const done = new Set();
  if (existsSync(RAW)) {
    for (const line of read(RAW, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try { const r = JSON.parse(line); done.add(`${r.docId}|${r.chainId}`); } catch { /* skip corrupt line */ }
    }
  }
  return done;
}

async function runOne(doc, chainDef) {
  const md = readFileSync(join(DOCS_DIR, `${doc.id}.md`));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(`${SERVER}/api/roundtrip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        mode: "run",
        fileBase64: md.toString("base64"),
        startFormat: "md",
        chain: chainDef.chain,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error ?? `HTTP ${res.status}`);
    return {
      docId: doc.id,
      domain: doc.domain,
      tier: doc.tier,
      chainId: chainDef.id,
      chain: chainDef.chain,
      durationMs: Date.now() - started,
      at: new Date().toISOString(),
      report: data.report,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(RESULTS_DIR, { recursive: true });
  await checkHealth();

  const manifest = JSON.parse(readFileSync(join(ROOT, "corpus", "manifest.json"), "utf8"));
  let docs = manifest.docs;
  if (FILTER_DOMAIN) docs = docs.filter((d) => d.domain === FILTER_DOMAIN);
  if (FILTER_TIER) docs = docs.filter((d) => d.tier === FILTER_TIER);
  let chains = CHAINS;
  if (FILTER_CHAIN) chains = chains.filter((c) => c.id === FILTER_CHAIN);

  const done = loadDoneKeys();
  const tasks = [];
  for (const doc of docs) {
    for (const chainDef of chains) {
      if (!done.has(`${doc.id}|${chainDef.id}`)) tasks.push({ doc, chainDef });
    }
  }

  console.log(`Corpus: ${docs.length} docs × ${chains.length} chains — ${tasks.length} pending (${done.size} already done)`);
  if (!tasks.length) { console.log("Nothing to do."); return; }

  let ok = 0, fail = 0, idx = 0;
  const t0 = Date.now();

  async function worker() {
    while (idx < tasks.length) {
      const { doc, chainDef } = tasks[idx++];
      const label = `${doc.id}|${chainDef.id}`;
      try {
        const result = await runOne(doc, chainDef);
        appendFileSync(RAW, JSON.stringify(result) + "\n", "utf8");
        ok++;
        const fid = result.report.finalFidelity;
        console.log(`[${ok + fail}/${tasks.length}] ${label} → ${(fid * 100).toFixed(1)}% (${(result.durationMs / 1000).toFixed(1)}s)`);
      } catch (e) {
        fail++;
        appendFileSync(ERRORS, JSON.stringify({ docId: doc.id, chainId: chainDef.id, error: String(e.message ?? e), at: new Date().toISOString() }) + "\n", "utf8");
        console.error(`[${ok + fail}/${tasks.length}] ${label} FAILED: ${e.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, worker));

  const mins = ((Date.now() - t0) / 60000).toFixed(1);
  console.log(`\nDone in ${mins} min — ${ok} ok, ${fail} failed. Results → bench/results/raw.jsonl`);
  if (fail) console.log("Re-run the same command to retry failures.");
}

main();
