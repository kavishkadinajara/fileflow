# Benchmark Conversion

Design or run a conversion quality benchmark (ConvertBench) for FileFlowOne.

## Arguments
`$ARGUMENTS` — scope, e.g. "create test fixture set for md→docx→md round-trip" or "measure round-trip degradation for legal documents"

## Background (from research gap report)

ConvertBench is a structured benchmark with:
- 500+ documents across 10+ formats
- Domains: academic, legal, medical, financial, technical
- Test types: unidirectional, bidirectional, round-trip (A→B→C→A)
- Evaluated using the Semantic Fidelity Index (SFI) from the `/sfi-score` command

## Implementation guide

### Fixture structure
```
docs/benchmark/
  fixtures/
    academic/   *.md, *.docx, *.html, *.pdf
    legal/
    technical/
  ground-truth/
    <fixture-id>_<format>.json   # structural annotations
  results/
    <run-date>_results.json
```

### Benchmark script
Create `scripts/benchmark.ts` (run with `npx tsx scripts/benchmark.ts`):
1. For each fixture, run the conversion via `POST /api/convert` (server must be running)
2. Call `POST /api/slm-score` with original + converted pair
3. Record SFI scores per dimension
4. For round-trip: chain A→B→C→A and record cumulative score at each step
5. Output JSON results + markdown summary table

### Round-trip test
Key chains to test:
- `md → docx → md` (heading/table preservation)
- `md → html → md` (link/code preservation)
- `json → yaml → json` (data integrity)
- `md → pdf → md` (highest loss expected — establishes baseline)

### Metrics to record per conversion
- SFI composite score
- S_structural, S_semantic, S_functional sub-scores
- Conversion time (ms)
- Output file size ratio
- Any error/exception

Use results to identify which format pairs are "safe" (SFI ≥ 0.85) vs "lossy" (SFI < 0.65) and surface this in the UI via format pair warnings.
