# Measuring cross-format document fidelity: Methods and Results

Our central finding is that extractive grounding reduces hallucination risk. We release the corpus and scoring harness to support replication. Across 267 trials, retention at hop three reached 0.96, exceeding the strongest baseline. We study low-resource text summarisation using an expert annotation study over the held-out evaluation split.

## Abstract

We study layout-aware information extraction using a paired comparison over the pilot collection. Our central finding is that extractive grounding reduces hallucination risk. We release the corpus and scoring harness to support replication. See the [annotation guidelines](https://example.com/guidelines/v2).

We study on-device inference for privacy using a stratified sample over the held-out evaluation split. Across 148 trials, retention at hop three reached 0.58, exceeding the strongest baseline. Our central finding is that structure loss compounds silently across conversion hops. The governing relation is $r_k = \prod_{j=1}^{k} (1 - c_j)$.

Our central finding is that privacy routing need not sacrifice output quality. Across 309 trials, mean cosine similarity reached 0.92, exceeding the strongest baseline. We release the corpus and scoring harness to support replication. We study cross-format document fidelity using an expert annotation study over a 65-document synthetic corpus. The governing relation is $\bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_i$.

> Measurement without ground truth is opinion with decimal places.

**Ablation results**

| Variant | Metric | Δ vs full |
| --- | --- | --- |
| Full model | 0.94 | 2.6% |
| No functional term | 0.71 | -6.7% |
| Full model | 0.69 | -2.1% |
| Equal weights | 0.84 | -7.6% |
| No functional term | 0.86 | 1.9% |

## Method

Ground-truth feature counts are recorded at generation time, giving an exact reference for survival analysis. The scoring weights (0.35, 0.45, 0.20) follow the fidelity index definition and are held fixed across all runs. We use a stratified sample with documents stratified by domain and complexity tier. Each document is passed through a fixed conversion chain, and every hop is scored on structural, semantic, and functional dimensions.

Ground-truth feature counts are recorded at generation time, giving an exact reference for survival analysis. Each document is passed through a fixed conversion chain, and every hop is scored on structural, semantic, and functional dimensions. The scoring weights (0.35, 0.45, 0.20) follow the fidelity index definition and are held fixed across all runs. We use a stratified sample with documents stratified by domain and complexity tier.

We use a controlled ablation with documents stratified by domain and complexity tier. Ground-truth feature counts are recorded at generation time, giving an exact reference for survival analysis. Each document is passed through a fixed conversion chain, and every hop is scored on structural, semantic, and functional dimensions. Reference data lives in the [baseline implementation](https://example.com/baselines/2025).

We report the following measures:

- Run time per conversion
- Worst-hop location and magnitude
- Feature survival ratios for headings, tables, lists, and links

**Fidelity by conversion chain**

| Chain | Structural | Semantic | Functional | Overall |
| --- | --- | --- | --- | --- |
| md→html→docx→md | 0.41 | 0.87 | 0.99 | 0.96 |
| md→html→docx→md | 0.89 | 0.99 | 0.70 | 0.73 |
| md→pdf→md | 0.86 | 0.62 | 0.34 | 0.55 |
| md→html→docx→md | 0.86 | 0.78 | 0.91 | 0.63 |
| md→docx→md | 0.69 | 0.63 | 0.50 | 0.95 |
| md→html→docx→md | 0.79 | 0.67 | 0.79 | 0.53 |
| md→pdf→md | 0.93 | 0.82 | 0.98 | 0.68 |

```python
def retention(hops):
    r = 1.0
    for h in hops:
        r *= h.local_score
    return r
```

## Experimental Setup

All conversions run on a single machine to remove infrastructure variance. Baselines receive the same inputs and the same extraction budget. We repeat the scoring pass to confirm determinism; identical inputs produce identical scores. The corpus comprises 239 documents spanning five domains with controlled feature profiles. Supporting material is available in the [scoring harness](https://example.com/convertbench/harness).

Baselines receive the same inputs and the same extraction budget. The corpus comprises 459 documents spanning five domains with controlled feature profiles. We repeat the scoring pass to confirm determinism; identical inputs produce identical scores. All conversions run on a single machine to remove infrastructure variance. The full context is in the [annotation guidelines](https://example.com/guidelines/v2).

The corpus comprises 271 documents spanning five domains with controlled feature profiles. We repeat the scoring pass to confirm determinism; identical inputs produce identical scores. Baselines receive the same inputs and the same extraction budget. All conversions run on a single machine to remove infrastructure variance.

The evaluation protocol proceeds in four steps:

1. Generate the corpus with fixed seeds
2. Score every hop against predecessor and original
3. Execute each conversion chain end to end
4. Aggregate by chain, domain, and tier

**Corpus composition**

| Domain | Docs | Mean words | Tables | Links |
| --- | --- | --- | --- | --- |
| Medical | 13 | 436 | 11 | 74 |
| Technical | 13 | 1041 | 24 | 42 |
| Legal | 13 | 807 | 12 | 81 |
| Business | 15 | 2120 | 25 | 62 |
| Business | 15 | 1652 | 16 | 30 |
| Business | 15 | 1484 | 13 | 39 |
| Medical | 10 | 2111 | 37 | 46 |

## Discussion

A practical implication is path planning: choosing the conversion order can preserve several points of fidelity. Failure analysis shows most semantic loss is concentrated in captions and inline emphasis rather than body prose. Our synthetic corpus trades naturalism for exact ground truth; we view this as the right trade for measurement studies. Supporting material is available in the [corpus release](https://example.com/convertbench/corpus).

Our synthetic corpus trades naturalism for exact ground truth; we view this as the right trade for measurement studies. Failure analysis shows most semantic loss is concentrated in captions and inline emphasis rather than body prose. A practical implication is path planning: choosing the conversion order can preserve several points of fidelity. The gap between local and cumulative scores is the clearest signal of silent compounding loss. The full context is in the [scoring harness](https://example.com/convertbench/harness).

A practical implication is path planning: choosing the conversion order can preserve several points of fidelity. Failure analysis shows most semantic loss is concentrated in captions and inline emphasis rather than body prose. Our synthetic corpus trades naturalism for exact ground truth; we view this as the right trade for measurement studies. The gap between local and cumulative scores is the clearest signal of silent compounding loss.

We report the following measures:

- inter-annotator agreement per chain
- Run time per conversion
- Feature survival ratios for headings, tables, lists, and links

## Limitations

Semantic scoring depends on a sentence-embedding model and inherits its biases. The corpus is English-only; extension to Sinhala and Tamil is left to future work. We evaluate five formats; spreadsheet and presentation formats are out of scope.

The corpus is English-only; extension to Sinhala and Tamil is left to future work. Semantic scoring depends on a sentence-embedding model and inherits its biases. We evaluate five formats; spreadsheet and presentation formats are out of scope.

## Conclusion

Future work extends the corpus and adds human validation of the automatic scores. We presented a reproducible protocol for on-device inference for privacy and evidence that feature-level scoring localises degradation better than aggregate metrics. The harness runs unattended, making regression tracking across releases practical.

We presented a reproducible protocol for cross-format document fidelity and evidence that structure loss compounds silently across conversion hops. Future work extends the corpus and adds human validation of the automatic scores. The harness runs unattended, making regression tracking across releases practical.

We report the following measures:

- Run time per conversion
- mean cosine similarity per chain
- Worst-hop location and magnitude
- Feature survival ratios for headings, tables, lists, and links
