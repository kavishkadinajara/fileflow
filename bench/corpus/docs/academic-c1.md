# Measuring low-resource text summarisation: Methods and Results

We argue that structure loss compounds silently across conversion hops, and we design the evaluation to test exactly this. This paper contributes the held-out evaluation split, an automated scoring pipeline, and an analysis of failure modes. The practical motivation is direct: users convert documents through several formats and have no visibility into accumulated loss. Prior work on layout-aware information extraction has largely reported aggregate scores, which obscure where degradation occurs.

## Introduction

We argue that structure loss compounds silently across conversion hops, and we design the evaluation to test exactly this. This paper contributes the pilot collection, an automated scoring pipeline, and an analysis of failure modes. The practical motivation is direct: users convert documents through several formats and have no visibility into accumulated loss. Prior work on cross-format document fidelity has largely reported aggregate scores, which obscure where degradation occurs. Supporting material is available in the [fidelity index definition](https://example.com/sfi/spec).

We argue that deterministic parsing outperforms learned baselines on ruled tables, and we design the evaluation to test exactly this. This paper contributes the annotated subset, an automated scoring pipeline, and an analysis of failure modes. Prior work on cross-format document fidelity has largely reported aggregate scores, which obscure where degradation occurs. The practical motivation is direct: users convert documents through several formats and have no visibility into accumulated loss. See the [scoring harness](https://example.com/convertbench/harness). We compute this as $\bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_i$.

This paper contributes a 65-document synthetic corpus, an automated scoring pipeline, and an analysis of failure modes. We argue that structure loss compounds silently across conversion hops, and we design the evaluation to test exactly this. The practical motivation is direct: users convert documents through several formats and have no visibility into accumulated loss. Prior work on low-resource text summarisation has largely reported aggregate scores, which obscure where degradation occurs. Reference data lives in the [baseline implementation](https://example.com/baselines/2024). The governing relation is $SFI = 0.35 S_s + 0.45 S_m + 0.20 S_f$.

### Introduction — Supporting Evidence

The practical motivation is direct: users convert documents through several formats and have no visibility into accumulated loss. This paper contributes the pilot collection, an automated scoring pipeline, and an analysis of failure modes. Prior work on cross-format document fidelity has largely reported aggregate scores, which obscure where degradation occurs.

> Measurement without ground truth is opinion with decimal places.

**Fidelity by conversion chain**

| Chain | Structural | Semantic | Functional | Overall |
| --- | --- | --- | --- | --- |
| md→docx→md | 0.45 | 0.98 | 1.00 | 0.93 |
| md→html→md | 0.86 | 0.80 | 0.60 | 0.54 |
| md→txt→md | 0.79 | 0.86 | 0.82 | 0.99 |
| md→html→md | 0.42 | 0.86 | 0.45 | 0.99 |
| md→docx→md | 0.62 | 0.72 | 0.82 | 0.99 |
| md→html→md | 0.86 | 0.87 | 0.54 | 0.65 |

```python
def retention(hops):
    r = 1.0
    for h in hops:
        r *= h.local_score
    return r
```

## Related Work

H. Weerasinghe and colleagues proposed a similarity-based measure, but it ignores functional elements such as links and formulas. Benchmark efforts in adjacent areas rely on manual inspection, which does not scale past a few dozen documents. Our protocol differs by scoring every intermediate artifact against both its predecessor and the original. Earlier studies of layout-aware information extraction evaluated single conversions in isolation. Supporting material is available in the [baseline implementation](https://example.com/baselines/2025). The applicable formula is $SFI = 0.35 S_s + 0.45 S_m + 0.20 S_f$.

N. Perera and colleagues proposed a similarity-based measure, but it ignores functional elements such as links and formulas. Our protocol differs by scoring every intermediate artifact against both its predecessor and the original. Earlier studies of cross-format document fidelity evaluated single conversions in isolation.

We report the following measures:

- Worst-hop location and magnitude
- inter-annotator agreement per chain
- Feature survival ratios for headings, tables, lists, and links

**Fidelity by conversion chain**

| Chain | Structural | Semantic | Functional | Overall |
| --- | --- | --- | --- | --- |
| md→txt→md | 0.53 | 0.96 | 0.93 | 0.86 |
| md→html→docx→md | 0.58 | 0.87 | 0.60 | 0.73 |
| md→html→docx→md | 0.97 | 0.88 | 0.93 | 0.62 |
| md→docx→md | 0.99 | 0.79 | 0.45 | 0.82 |
| md→html→docx→md | 0.61 | 0.61 | 0.48 | 0.55 |
| md→html→md | 0.43 | 0.90 | 0.48 | 0.60 |
| md→html→docx→md | 0.61 | 0.73 | 0.68 | 0.75 |

```python
def retention(hops):
    r = 1.0
    for h in hops:
        r *= h.local_score
    return r
```

## Method

We use a replication of the base protocol with documents stratified by domain and complexity tier. Each document is passed through a fixed conversion chain, and every hop is scored on structural, semantic, and functional dimensions. Ground-truth feature counts are recorded at generation time, giving an exact reference for survival analysis. Details are recorded in the [scoring harness](https://example.com/convertbench/harness).

Ground-truth feature counts are recorded at generation time, giving an exact reference for survival analysis. Each document is passed through a fixed conversion chain, and every hop is scored on structural, semantic, and functional dimensions. The scoring weights (0.35, 0.45, 0.20) follow the fidelity index definition and are held fixed across all runs. We use a stratified sample with documents stratified by domain and complexity tier. Details are recorded in the [baseline implementation](https://example.com/baselines/2025).

> A benchmark that cannot be re-run is a press release, not an instrument.

**Ablation results**

| Variant | Metric | Δ vs full |
| --- | --- | --- |
| Full model | 0.77 | -2.2% |
| Equal weights | 0.89 | -7.0% |
| No functional term | 0.79 | -7.6% |
| No functional term | 0.57 | 1.7% |
| Full model | 0.67 | -9.4% |
| Equal weights | 0.60 | -1.1% |
| No structural term | 0.88 | -9.6% |

## Experimental Setup

All conversions run on a single machine to remove infrastructure variance. Baselines receive the same inputs and the same extraction budget. We repeat the scoring pass to confirm determinism; identical inputs produce identical scores. The corpus comprises 355 documents spanning five domains with controlled feature profiles.

We repeat the scoring pass to confirm determinism; identical inputs produce identical scores. All conversions run on a single machine to remove infrastructure variance. The corpus comprises 392 documents spanning five domains with controlled feature profiles. Baselines receive the same inputs and the same extraction budget.

### Experimental Setup — Supporting Evidence

The corpus comprises 70 documents spanning five domains with controlled feature profiles. All conversions run on a single machine to remove infrastructure variance. Baselines receive the same inputs and the same extraction budget. We repeat the scoring pass to confirm determinism; identical inputs produce identical scores.

We report the following measures:

- inter-annotator agreement per chain
- Worst-hop location and magnitude
- Feature survival ratios for headings, tables, lists, and links
- Run time per conversion

## Results

Domain effects are secondary to feature effects: table-heavy documents degrade fastest regardless of domain. mean cosine similarity averaged 0.89 on faithful chains and fell sharply on chains that pass through plain text. The largest single-hop drop occurs when structure must be reconstructed from an unstructured artifact.

Domain effects are secondary to feature effects: table-heavy documents degrade fastest regardless of domain. These results support the claim that structure loss compounds silently across conversion hops. mean cosine similarity averaged 0.90 on faithful chains and fell sharply on chains that pass through plain text. Supporting material is available in the [annotation guidelines](https://example.com/guidelines/v2).

### Results — Timeline

Domain effects are secondary to feature effects: table-heavy documents degrade fastest regardless of domain. The largest single-hop drop occurs when structure must be reconstructed from an unstructured artifact. inter-annotator agreement averaged 0.69 on faithful chains and fell sharply on chains that pass through plain text.

The evaluation protocol proceeds in four steps:

1. Score every hop against predecessor and original
2. Generate the corpus with fixed seeds
3. Execute each conversion chain end to end
4. Aggregate by chain, domain, and tier

## Discussion

Failure analysis shows most semantic loss is concentrated in captions and inline emphasis rather than body prose. Our synthetic corpus trades naturalism for exact ground truth; we view this as the right trade for measurement studies. The gap between local and cumulative scores is the clearest signal of silent compounding loss.

A practical implication is path planning: choosing the conversion order can preserve several points of fidelity. The gap between local and cumulative scores is the clearest signal of silent compounding loss. Our synthetic corpus trades naturalism for exact ground truth; we view this as the right trade for measurement studies. Failure analysis shows most semantic loss is concentrated in captions and inline emphasis rather than body prose.

We report the following measures:

- Run time per conversion
- Feature survival ratios for headings, tables, lists, and links
- macro-averaged F1 per chain

## Conclusion

The harness runs unattended, making regression tracking across releases practical. Future work extends the corpus and adds human validation of the automatic scores. We presented a reproducible protocol for layout-aware information extraction and evidence that deterministic parsing outperforms learned baselines on ruled tables.

The harness runs unattended, making regression tracking across releases practical. Future work extends the corpus and adds human validation of the automatic scores. We presented a reproducible protocol for cross-format document fidelity and evidence that deterministic parsing outperforms learned baselines on ruled tables.

We presented a reproducible protocol for on-device inference for privacy and evidence that feature-level scoring localises degradation better than aggregate metrics. Future work extends the corpus and adds human validation of the automatic scores. The harness runs unattended, making regression tracking across releases practical.
