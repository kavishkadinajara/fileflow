# An Empirical Study of low-resource text summarisation

We study semantic drift in derived corpora using an expert annotation study over a 65-document synthetic corpus. Across 116 trials, cell-level accuracy reached 0.60, exceeding the strongest baseline. We release the corpus and scoring harness to support replication. Our central finding is that feature-level scoring localises degradation better than aggregate metrics.

## Abstract

Across 219 trials, cell-level accuracy reached 0.56, exceeding the strongest baseline. Our central finding is that extractive grounding reduces hallucination risk. We release the corpus and scoring harness to support replication. We study on-device inference for privacy using an expert annotation study over a 65-document synthetic corpus.

Across 62 trials, inter-annotator agreement reached 0.70, exceeding the strongest baseline. We release the corpus and scoring harness to support replication. We study on-device inference for privacy using a controlled ablation over the public benchmark release. Our central finding is that feature-level scoring localises degradation better than aggregate metrics.

We study on-device inference for privacy using a controlled ablation over the held-out evaluation split. Across 448 trials, mean cosine similarity reached 0.64, exceeding the strongest baseline. Our central finding is that structure loss compounds silently across conversion hops. The full context is in the [baseline implementation](https://example.com/baselines/2024).

### Abstract — Detail

We study semantic drift in derived corpora using a paired comparison over the pilot collection. We release the corpus and scoring harness to support replication. Across 387 trials, inter-annotator agreement reached 0.92, exceeding the strongest baseline. Our central finding is that feature-level scoring localises degradation better than aggregate metrics.

## Introduction

The practical motivation is direct: users convert documents through several formats and have no visibility into accumulated loss. We argue that feature-level scoring localises degradation better than aggregate metrics, and we design the evaluation to test exactly this. Prior work on on-device inference for privacy has largely reported aggregate scores, which obscure where degradation occurs. This paper contributes the held-out evaluation split, an automated scoring pipeline, and an analysis of failure modes. Supporting material is available in the [annotation guidelines](https://example.com/guidelines/v2).

This paper contributes the public benchmark release, an automated scoring pipeline, and an analysis of failure modes. We argue that structure loss compounds silently across conversion hops, and we design the evaluation to test exactly this. Prior work on cross-format document fidelity has largely reported aggregate scores, which obscure where degradation occurs. The practical motivation is direct: users convert documents through several formats and have no visibility into accumulated loss.

We report the following measures:

- Worst-hop location and magnitude
- Feature survival ratios for headings, tables, lists, and links
- inter-annotator agreement per chain
- Run time per conversion

```python
def retention(hops):
    r = 1.0
    for h in hops:
        r *= h.local_score
    return r
```

## Related Work

Benchmark efforts in adjacent areas rely on manual inspection, which does not scale past a few dozen documents. A. Jayasuriya and colleagues proposed a similarity-based measure, but it ignores functional elements such as links and formulas. Our protocol differs by scoring every intermediate artifact against both its predecessor and the original. Earlier studies of on-device inference for privacy evaluated single conversions in isolation.

Earlier studies of cross-format document fidelity evaluated single conversions in isolation. Benchmark efforts in adjacent areas rely on manual inspection, which does not scale past a few dozen documents. Our protocol differs by scoring every intermediate artifact against both its predecessor and the original. S. Fernando and colleagues proposed a similarity-based measure, but it ignores functional elements such as links and formulas. The full context is in the [preregistration](https://example.com/prereg/2024). The governing relation is $SFI = 0.35 S_s + 0.45 S_m + 0.20 S_f$.

Our protocol differs by scoring every intermediate artifact against both its predecessor and the original. H. Weerasinghe and colleagues proposed a similarity-based measure, but it ignores functional elements such as links and formulas. Earlier studies of on-device inference for privacy evaluated single conversions in isolation. Benchmark efforts in adjacent areas rely on manual inspection, which does not scale past a few dozen documents. See the [corpus release](https://example.com/convertbench/corpus).

> Measurement without ground truth is opinion with decimal places.

**Ablation results**

| Variant | Metric | Δ vs full |
| --- | --- | --- |
| No functional term | 0.68 | -6.6% |
| No semantic term | 0.57 | -3.6% |
| No structural term | 0.86 | -5.7% |
| Full model | 0.88 | 1.8% |
| No semantic term | 0.65 | -1.9% |
| No functional term | 0.61 | -3.9% |

## Results

Domain effects are secondary to feature effects: table-heavy documents degrade fastest regardless of domain. These results support the claim that feature-level scoring localises degradation better than aggregate metrics. cell-level accuracy averaged 0.56 on faithful chains and fell sharply on chains that pass through plain text. The largest single-hop drop occurs when structure must be reconstructed from an unstructured artifact. Details are recorded in the [preregistration](https://example.com/prereg/2024).

Domain effects are secondary to feature effects: table-heavy documents degrade fastest regardless of domain. macro-averaged F1 averaged 0.89 on faithful chains and fell sharply on chains that pass through plain text. These results support the claim that feature-level scoring localises degradation better than aggregate metrics. The largest single-hop drop occurs when structure must be reconstructed from an unstructured artifact.

cell-level accuracy averaged 0.62 on faithful chains and fell sharply on chains that pass through plain text. These results support the claim that deterministic parsing outperforms learned baselines on ruled tables. The largest single-hop drop occurs when structure must be reconstructed from an unstructured artifact. Domain effects are secondary to feature effects: table-heavy documents degrade fastest regardless of domain. See the [fidelity index definition](https://example.com/sfi/spec).

### Results — Notes

These results support the claim that extractive grounding reduces hallucination risk. inter-annotator agreement averaged 0.83 on faithful chains and fell sharply on chains that pass through plain text. The largest single-hop drop occurs when structure must be reconstructed from an unstructured artifact. Domain effects are secondary to feature effects: table-heavy documents degrade fastest regardless of domain.

> Measurement without ground truth is opinion with decimal places.

The evaluation protocol proceeds in four steps:

1. Generate the corpus with fixed seeds
2. Score every hop against predecessor and original
3. Execute each conversion chain end to end

## Discussion

Failure analysis shows most semantic loss is concentrated in captions and inline emphasis rather than body prose. A practical implication is path planning: choosing the conversion order can preserve several points of fidelity. Our synthetic corpus trades naturalism for exact ground truth; we view this as the right trade for measurement studies. The gap between local and cumulative scores is the clearest signal of silent compounding loss.

The gap between local and cumulative scores is the clearest signal of silent compounding loss. A practical implication is path planning: choosing the conversion order can preserve several points of fidelity. Failure analysis shows most semantic loss is concentrated in captions and inline emphasis rather than body prose. Our synthetic corpus trades naturalism for exact ground truth; we view this as the right trade for measurement studies. Reference data lives in the [fidelity index definition](https://example.com/sfi/spec).

Failure analysis shows most semantic loss is concentrated in captions and inline emphasis rather than body prose. A practical implication is path planning: choosing the conversion order can preserve several points of fidelity. Our synthetic corpus trades naturalism for exact ground truth; we view this as the right trade for measurement studies. The gap between local and cumulative scores is the clearest signal of silent compounding loss. We compute this as $\sigma^2 = \frac{1}{n}\sum (x_i - \bar{x})^2$.

### Discussion — Detail

A practical implication is path planning: choosing the conversion order can preserve several points of fidelity. Our synthetic corpus trades naturalism for exact ground truth; we view this as the right trade for measurement studies. The gap between local and cumulative scores is the clearest signal of silent compounding loss. Failure analysis shows most semantic loss is concentrated in captions and inline emphasis rather than body prose.

## Limitations

Semantic scoring depends on a sentence-embedding model and inherits its biases. The corpus is English-only; extension to Sinhala and Tamil is left to future work. We evaluate five formats; spreadsheet and presentation formats are out of scope.

The corpus is English-only; extension to Sinhala and Tamil is left to future work. We evaluate five formats; spreadsheet and presentation formats are out of scope. Semantic scoring depends on a sentence-embedding model and inherits its biases. The governing relation is $r_k = \prod_{j=1}^{k} (1 - c_j)$.

The evaluation protocol proceeds in four steps:

1. Execute each conversion chain end to end
2. Generate the corpus with fixed seeds
3. Aggregate by chain, domain, and tier

**Ablation results**

| Variant | Metric | Δ vs full |
| --- | --- | --- |
| No semantic term | 0.50 | -9.4% |
| No functional term | 0.75 | 0.8% |
| Full model | 0.52 | -9.8% |
| Full model | 0.93 | -4.3% |
| Full model | 0.91 | -6.2% |
| No structural term | 0.50 | -9.8% |
| No semantic term | 0.64 | -4.3% |

**Ablation results**

| Variant | Metric | Δ vs full |
| --- | --- | --- |
| No functional term | 0.90 | -7.5% |
| No semantic term | 0.53 | -0.6% |
| Equal weights | 0.69 | 1.8% |
| Equal weights | 0.91 | -9.4% |
| No functional term | 0.53 | -6.7% |

**Corpus composition**

| Domain | Docs | Mean words | Tables | Links |
| --- | --- | --- | --- | --- |
| Business | 15 | 1613 | 32 | 88 |
| Legal | 16 | 548 | 38 | 48 |
| Technical | 11 | 1679 | 12 | 26 |
| Technical | 10 | 2161 | 17 | 36 |
| Legal | 11 | 1147 | 27 | 22 |
| Business | 12 | 1343 | 11 | 64 |
| Technical | 10 | 1157 | 34 | 73 |
| Academic | 11 | 797 | 39 | 76 |
