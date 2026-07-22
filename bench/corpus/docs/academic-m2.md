# On cross-format document fidelity: Evidence from a 65-document synthetic corpus

We argue that extractive grounding reduces hallucination risk, and we design the evaluation to test exactly this. This paper contributes the public benchmark release, an automated scoring pipeline, and an analysis of failure modes. Prior work on cross-format document fidelity has largely reported aggregate scores, which obscure where degradation occurs.

## Introduction

This paper contributes the annotated subset, an automated scoring pipeline, and an analysis of failure modes. Prior work on semantic drift in derived corpora has largely reported aggregate scores, which obscure where degradation occurs. We argue that structure loss compounds silently across conversion hops, and we design the evaluation to test exactly this. The full context is in the [baseline implementation](https://example.com/baselines/2024). The applicable formula is $r_k = \prod_{j=1}^{k} (1 - c_j)$.

The practical motivation is direct: users convert documents through several formats and have no visibility into accumulated loss. We argue that extractive grounding reduces hallucination risk, and we design the evaluation to test exactly this. This paper contributes the annotated subset, an automated scoring pipeline, and an analysis of failure modes. See the [corpus release](https://example.com/convertbench/corpus). The applicable formula is $F_1 = \frac{2PR}{P + R}$.

### Introduction — Breakdown

We argue that feature-level scoring localises degradation better than aggregate metrics, and we design the evaluation to test exactly this. Prior work on low-resource text summarisation has largely reported aggregate scores, which obscure where degradation occurs. The practical motivation is direct: users convert documents through several formats and have no visibility into accumulated loss. This paper contributes the held-out evaluation split, an automated scoring pipeline, and an analysis of failure modes.

> A benchmark that cannot be re-run is a press release, not an instrument.

We report the following measures:

- Feature survival ratios for headings, tables, lists, and links
- Run time per conversion
- Worst-hop location and magnitude
- inter-annotator agreement per chain

```python
scores = [score(doc, chain) for doc in corpus]
by_tier = groupby(scores, key=lambda s: s.tier)
for tier, group in by_tier:
    print(tier, mean(g.overall for g in group))
```

## Related Work

S. Fernando and colleagues proposed a similarity-based measure, but it ignores functional elements such as links and formulas. Earlier studies of layout-aware information extraction evaluated single conversions in isolation. Our protocol differs by scoring every intermediate artifact against both its predecessor and the original. Benchmark efforts in adjacent areas rely on manual inspection, which does not scale past a few dozen documents. Reference data lives in the [baseline implementation](https://example.com/baselines/2025).

The evaluation protocol proceeds in four steps:

1. Execute each conversion chain end to end
2. Aggregate by chain, domain, and tier
3. Score every hop against predecessor and original

**Corpus composition**

| Domain | Docs | Mean words | Tables | Links |
| --- | --- | --- | --- | --- |
| Technical | 11 | 1270 | 37 | 46 |
| Business | 13 | 797 | 15 | 83 |
| Legal | 11 | 558 | 9 | 61 |
| Technical | 12 | 2148 | 23 | 43 |

## Method

We use an expert annotation study with documents stratified by domain and complexity tier. Each document is passed through a fixed conversion chain, and every hop is scored on structural, semantic, and functional dimensions. The scoring weights (0.35, 0.45, 0.20) follow the fidelity index definition and are held fixed across all runs. Ground-truth feature counts are recorded at generation time, giving an exact reference for survival analysis. Supporting material is available in the [annotation guidelines](https://example.com/guidelines/v2).

## Experimental Setup

We repeat the scoring pass to confirm determinism; identical inputs produce identical scores. All conversions run on a single machine to remove infrastructure variance. The corpus comprises 165 documents spanning five domains with controlled feature profiles.

## Limitations

We evaluate five formats; spreadsheet and presentation formats are out of scope. The corpus is English-only; extension to Sinhala and Tamil is left to future work. Semantic scoring depends on a sentence-embedding model and inherits its biases.
