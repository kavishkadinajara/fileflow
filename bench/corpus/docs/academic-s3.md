# Measuring on-device inference for privacy: Methods and Results

Earlier studies of on-device inference for privacy evaluated single conversions in isolation. Our protocol differs by scoring every intermediate artifact against both its predecessor and the original. Benchmark efforts in adjacent areas rely on manual inspection, which does not scale past a few dozen documents.

## Related Work

K. Bandara and colleagues proposed a similarity-based measure, but it ignores functional elements such as links and formulas. Earlier studies of semantic drift in derived corpora evaluated single conversions in isolation. See the [scoring harness](https://example.com/convertbench/harness).

H. Weerasinghe and colleagues proposed a similarity-based measure, but it ignores functional elements such as links and formulas. Benchmark efforts in adjacent areas rely on manual inspection, which does not scale past a few dozen documents.

We report the following measures:

- Worst-hop location and magnitude
- mean cosine similarity per chain
- Run time per conversion
- Feature survival ratios for headings, tables, lists, and links

## Experimental Setup

We repeat the scoring pass to confirm determinism; identical inputs produce identical scores. All conversions run on a single machine to remove infrastructure variance. The corpus comprises 324 documents spanning five domains with controlled feature profiles.

**Ablation results**

| Variant | Metric | Δ vs full |
| --- | --- | --- |
| No structural term | 0.74 | 2.3% |
| No functional term | 0.53 | -4.5% |
| Equal weights | 0.65 | -6.7% |
| Equal weights | 0.58 | 0.5% |
