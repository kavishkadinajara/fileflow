# ConvertBench — FileFlowOne Fixture Dataset

Ground-truth documents for SFI benchmark evaluation. Part of **Gap 1** of the FileFlowOne research plan.

## Contents

### Source files (committed)

| File | Format | Archetype | Key SFI dimensions |
|------|--------|-----------|-------------------|
| `technical-api.md` / `.html` | MD, HTML | Technical documentation | Headings, tables, code blocks, links |
| `academic-paper.md` / `.html` | MD, HTML | Academic writing | Dense prose, formulas, citations, tables |
| `business-report.md` / `.html` | MD, HTML | Business document | Many tables, mixed lists and prose |
| `code-heavy.md` | MD | Code tutorial | Code fences, moderate prose |
| `table-heavy.md` | MD | Data-centric | Mostly tables, few headings |
| `minimal.md` | MD | Short document | Edge case for chunking logic |
| `prose-essay.txt` | TXT | Long-form prose | No markup, dense semantic content |
| `meeting-notes.txt` | TXT | Unstructured notes | Short paragraphs, action items |

### Generated files (not committed — gitignored)

Binary outputs (`.docx`, `.pdf`) are generated from the source files by `scripts/generate_fixtures.py`. They are excluded from git to avoid binary bloat. Regenerate any time:

```bash
# Requires: npm run dev (port 3000)
python scripts/generate_fixtures.py
# or to also generate html/txt derivatives:
python scripts/generate_fixtures.py --formats docx pdf html txt
```

## Running the Benchmark

```bash
# Requires: npm run dev + python backend (port 8000)
python scripts/benchmark.py

# Score pre-generated fixtures only (skip re-conversion)
python scripts/benchmark.py --no-convert

# Specific dataset directory and output file
python scripts/benchmark.py --dataset fixtures/ --out results/q1-2026.csv
```

Output: `benchmark_results.csv` with per-file SFI scores + console summary table.

## Design Principles

1. **Five content archetypes** — each exercises different SFI dimensions. A benchmark that only uses one type of document gives misleadingly narrow signal.

2. **Source files only** — `.md` and `.html` sources are the ground truth. Derived formats are regenerated, not stored, so benchmark results always reflect the current conversion pipeline.

3. **No binary files in git** — `.docx` and `.pdf` are gitignored. The `generate_fixtures.py` script is the reproducibility story for those formats.

4. **Short + long documents** — `minimal.md` is an edge case for the sentence-transformer chunking logic (fewer than 5 words per chunk should fall back gracefully). The academic paper and business report are long enough to stress-test latency.

## Known Gaps

- **Non-English documents** — all fixtures are in English. Multi-language evaluation is out of scope for v1.
- **Image-bearing documents** — fixtures contain no embedded images. Visual semantic content is not captured by text-based SFI.
- **Scanned PDFs** — fixtures assume PDFs with machine-readable text layers. OCR quality is a separate research question.
- **Scale** — 8 source files is a starter dataset. A production-grade benchmark would have 500+ documents. Use `generate_fixtures.py --formats docx pdf` to expand the corpus with derived files, then add more source documents here.
