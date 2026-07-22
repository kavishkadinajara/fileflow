# ConvertBench-lite

Automated evaluation suite for FileFlowOne (Research Gap 2). Generates the
dissertation's evaluation evidence end to end: a reproducible corpus, a
round-trip fidelity benchmark over the production conversion pipeline, and
three side-benchmarks (privacy router, ATS scorer, table extractor).

Full generated results: [report/RESULTS.md](report/RESULTS.md).

## Layout

```
bench/
  corpus/     generate.mjs — 65 seeded markdown docs (5 domains × 3 tiers)
              + manifest.json with ground-truth feature counts
  run/        runbench.mjs — resumable harness: 7 chains/doc via /api/roundtrip
  report/     aggregate.mjs — CSVs + SVG figures + RESULTS.md
  router/     dataset.mjs (72 hand-labeled samples) + runrouter.mjs (P/R/F1)
  ats/        runats.mjs — determinism + invariance gates on the ATS scorer
  tables/     make_fixtures.py + baseline_pdfplumber.py + runtables.mjs
  results/    raw.jsonl + all CSVs/JSON outputs (generated)
```

## Design decisions

- **Synthetic corpus with exact ground truth.** Every document is produced from
  a PRNG seeded on its id — `generate.mjs` reproduces the corpus byte-for-byte,
  and the manifest records true feature counts (headings, tables, lists, links,
  formulas) at generation time. Naturalism is traded for measurement validity.
- **Production code paths only.** Conversions go through `/api/convert`,
  scoring through the Python SFI service, the router bench imports the real
  `sensitivity.ts`/`router.ts` modules, the ATS bench converts CVs through the
  real md→docx pipeline. Nothing is reimplemented for the bench.
- **Resumable by construction.** `runbench.mjs` keys results by (doc, chain) in
  `results/raw.jsonl`; interrupt and re-run freely. Failures land in
  `errors.jsonl` and retry on the next invocation.
- **Instrument validated before use.** A 4-document pilot exposed one converter
  defect and two SFI measurement bugs before the full run (see RESULTS.md
  “Instrument validation”); the full run started only after fixes.

## Running

Prerequisites: Next dev server on :3000, Python backend on :8000
(`python_backend/.venv`), Node 22+.

```bash
node bench/corpus/generate.mjs          # 1. corpus (deterministic)
node bench/run/runbench.mjs             # 2. 455 chain runs (~30 min, resumable)
node bench/report/aggregate.mjs         # 3. tables + figures + RESULTS.md

npx tsx bench/router/runrouter.mjs      # router P/R (standalone, no servers)
node bench/ats/runats.mjs               # ATS invariance gates
python_backend/.venv/Scripts/python bench/tables/make_fixtures.py
python_backend/.venv/Scripts/python bench/tables/baseline_pdfplumber.py
node bench/tables/runtables.mjs         # table extractor vs pdfplumber
```

`runbench.mjs` accepts `--domain`, `--tier`, `--chain`, `--concurrency` filters.
