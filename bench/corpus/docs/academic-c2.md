# An Empirical Study of on-device inference for privacy

Across 215 trials, macro-averaged F1 reached 0.55, exceeding the strongest baseline. We study semantic drift in derived corpora using an expert annotation study over the public benchmark release. Our central finding is that structure loss compounds silently across conversion hops. We release the corpus and scoring harness to support replication.

## Abstract

We study layout-aware information extraction using a replication of the base protocol over the public benchmark release. Across 219 trials, inter-annotator agreement reached 0.61, exceeding the strongest baseline. We release the corpus and scoring harness to support replication. Our central finding is that deterministic parsing outperforms learned baselines on ruled tables. See the [corpus release](https://example.com/convertbench/corpus).

We study semantic drift in derived corpora using a stratified sample over the public benchmark release. Our central finding is that structure loss compounds silently across conversion hops. We release the corpus and scoring harness to support replication. Across 341 trials, cell-level accuracy reached 0.66, exceeding the strongest baseline. Reference data lives in the [baseline implementation](https://example.com/baselines/2025).

We release the corpus and scoring harness to support replication. Our central finding is that feature-level scoring localises degradation better than aggregate metrics. Across 466 trials, inter-annotator agreement reached 0.76, exceeding the strongest baseline. We study low-resource text summarisation using a stratified sample over the held-out evaluation split. Details are recorded in the [annotation guidelines](https://example.com/guidelines/v2). The governing relation is $r_k = \prod_{j=1}^{k} (1 - c_j)$.

### Abstract — Supporting Evidence

We release the corpus and scoring harness to support replication. Across 328 trials, mean cosine similarity reached 0.93, exceeding the strongest baseline. We study on-device inference for privacy using a replication of the base protocol over the pilot collection. Our central finding is that privacy routing need not sacrifice output quality.

We report the following measures:

- inter-annotator agreement per chain
- Feature survival ratios for headings, tables, lists, and links
- Worst-hop location and magnitude
- Run time per conversion

**Corpus composition**

| Domain | Docs | Mean words | Tables | Links |
| --- | --- | --- | --- | --- |
| Business | 13 | 1968 | 21 | 66 |
| Technical | 10 | 992 | 32 | 75 |
| Legal | 14 | 1438 | 21 | 71 |
| Legal | 11 | 720 | 29 | 27 |
| Medical | 12 | 2070 | 29 | 29 |

## Introduction

The practical motivation is direct: users convert documents through several formats and have no visibility into accumulated loss. Prior work on low-resource text summarisation has largely reported aggregate scores, which obscure where degradation occurs. This paper contributes the pilot collection, an automated scoring pipeline, and an analysis of failure modes. We argue that deterministic parsing outperforms learned baselines on ruled tables, and we design the evaluation to test exactly this.

This paper contributes the annotated subset, an automated scoring pipeline, and an analysis of failure modes. Prior work on layout-aware information extraction has largely reported aggregate scores, which obscure where degradation occurs. The practical motivation is direct: users convert documents through several formats and have no visibility into accumulated loss. We argue that extractive grounding reduces hallucination risk, and we design the evaluation to test exactly this. Reference data lives in the [preregistration](https://example.com/prereg/2023).

This paper contributes the pilot collection, an automated scoring pipeline, and an analysis of failure modes. Prior work on semantic drift in derived corpora has largely reported aggregate scores, which obscure where degradation occurs. We argue that structure loss compounds silently across conversion hops, and we design the evaluation to test exactly this. The practical motivation is direct: users convert documents through several formats and have no visibility into accumulated loss. See the [baseline implementation](https://example.com/baselines/2023).

### Introduction — Timeline

The practical motivation is direct: users convert documents through several formats and have no visibility into accumulated loss. This paper contributes a 65-document synthetic corpus, an automated scoring pipeline, and an analysis of failure modes. We argue that privacy routing need not sacrifice output quality, and we design the evaluation to test exactly this.

> A benchmark that cannot be re-run is a press release, not an instrument.

**Corpus composition**

| Domain | Docs | Mean words | Tables | Links |
| --- | --- | --- | --- | --- |
| Academic | 11 | 1527 | 19 | 69 |
| Medical | 14 | 1123 | 38 | 39 |
| Academic | 16 | 2008 | 16 | 23 |
| Legal | 12 | 1729 | 11 | 21 |
| Legal | 13 | 1120 | 15 | 20 |
| Technical | 12 | 2147 | 28 | 74 |

```python
scores = [score(doc, chain) for doc in corpus]
by_tier = groupby(scores, key=lambda s: s.tier)
for tier, group in by_tier:
    print(tier, mean(g.overall for g in group))
```

## Experimental Setup

We repeat the scoring pass to confirm determinism; identical inputs produce identical scores. All conversions run on a single machine to remove infrastructure variance. The corpus comprises 184 documents spanning five domains with controlled feature profiles. Baselines receive the same inputs and the same extraction budget. Reference data lives in the [annotation guidelines](https://example.com/guidelines/v2). We compute this as $\bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_i$.

We repeat the scoring pass to confirm determinism; identical inputs produce identical scores. The corpus comprises 326 documents spanning five domains with controlled feature profiles. Baselines receive the same inputs and the same extraction budget.

### Experimental Setup — Notes

The corpus comprises 236 documents spanning five domains with controlled feature profiles. All conversions run on a single machine to remove infrastructure variance. We repeat the scoring pass to confirm determinism; identical inputs produce identical scores. Baselines receive the same inputs and the same extraction budget.

**Fidelity by conversion chain**

| Chain | Structural | Semantic | Functional | Overall |
| --- | --- | --- | --- | --- |
| md→txt→md | 0.46 | 1.00 | 0.62 | 0.52 |
| md→pdf→md | 0.89 | 0.80 | 0.42 | 0.87 |
| md→html→docx→md | 0.69 | 0.66 | 0.55 | 0.51 |
| md→docx→md | 0.84 | 0.91 | 0.34 | 0.52 |
| md→txt→md | 0.76 | 0.70 | 0.43 | 0.91 |
| md→docx→md | 0.60 | 0.81 | 0.79 | 0.51 |

```python
scores = [score(doc, chain) for doc in corpus]
by_tier = groupby(scores, key=lambda s: s.tier)
for tier, group in by_tier:
    print(tier, mean(g.overall for g in group))
```

## Results

mean cosine similarity averaged 0.73 on faithful chains and fell sharply on chains that pass through plain text. Domain effects are secondary to feature effects: table-heavy documents degrade fastest regardless of domain. These results support the claim that deterministic parsing outperforms learned baselines on ruled tables. Reference data lives in the [fidelity index definition](https://example.com/sfi/spec).

The largest single-hop drop occurs when structure must be reconstructed from an unstructured artifact. These results support the claim that privacy routing need not sacrifice output quality. Domain effects are secondary to feature effects: table-heavy documents degrade fastest regardless of domain. inter-annotator agreement averaged 0.69 on faithful chains and fell sharply on chains that pass through plain text. See the [corpus release](https://example.com/convertbench/corpus).

### Results — Detail

The largest single-hop drop occurs when structure must be reconstructed from an unstructured artifact. These results support the claim that structure loss compounds silently across conversion hops. Domain effects are secondary to feature effects: table-heavy documents degrade fastest regardless of domain.

The evaluation protocol proceeds in four steps:

1. Score every hop against predecessor and original
2. Generate the corpus with fixed seeds
3. Aggregate by chain, domain, and tier
4. Execute each conversion chain end to end

## Discussion

A practical implication is path planning: choosing the conversion order can preserve several points of fidelity. Failure analysis shows most semantic loss is concentrated in captions and inline emphasis rather than body prose. The gap between local and cumulative scores is the clearest signal of silent compounding loss. Our synthetic corpus trades naturalism for exact ground truth; we view this as the right trade for measurement studies.

Failure analysis shows most semantic loss is concentrated in captions and inline emphasis rather than body prose. A practical implication is path planning: choosing the conversion order can preserve several points of fidelity. The gap between local and cumulative scores is the clearest signal of silent compounding loss. Our synthetic corpus trades naturalism for exact ground truth; we view this as the right trade for measurement studies.

A practical implication is path planning: choosing the conversion order can preserve several points of fidelity. Failure analysis shows most semantic loss is concentrated in captions and inline emphasis rather than body prose. Our synthetic corpus trades naturalism for exact ground truth; we view this as the right trade for measurement studies. The gap between local and cumulative scores is the clearest signal of silent compounding loss.

### Discussion — Breakdown

Our synthetic corpus trades naturalism for exact ground truth; we view this as the right trade for measurement studies. The gap between local and cumulative scores is the clearest signal of silent compounding loss. A practical implication is path planning: choosing the conversion order can preserve several points of fidelity. Failure analysis shows most semantic loss is concentrated in captions and inline emphasis rather than body prose.

## Limitations

Semantic scoring depends on a sentence-embedding model and inherits its biases. The corpus is English-only; extension to Sinhala and Tamil is left to future work. We evaluate five formats; spreadsheet and presentation formats are out of scope.

We evaluate five formats; spreadsheet and presentation formats are out of scope. The corpus is English-only; extension to Sinhala and Tamil is left to future work. Semantic scoring depends on a sentence-embedding model and inherits its biases.

## Conclusion

Future work extends the corpus and adds human validation of the automatic scores. The harness runs unattended, making regression tracking across releases practical. We presented a reproducible protocol for layout-aware information extraction and evidence that privacy routing need not sacrifice output quality.

We presented a reproducible protocol for on-device inference for privacy and evidence that structure loss compounds silently across conversion hops. The harness runs unattended, making regression tracking across releases practical. Future work extends the corpus and adds human validation of the automatic scores. See the [annotation guidelines](https://example.com/guidelines/v2).

The harness runs unattended, making regression tracking across releases practical. We presented a reproducible protocol for semantic drift in derived corpora and evidence that extractive grounding reduces hallucination risk. Future work extends the corpus and adds human validation of the automatic scores.

We report the following measures:

- Worst-hop location and magnitude
- Run time per conversion
- Feature survival ratios for headings, tables, lists, and links
- cell-level accuracy per chain

We report the following measures:

- cell-level accuracy per chain
- Feature survival ratios for headings, tables, lists, and links
- Worst-hop location and magnitude
- Run time per conversion
