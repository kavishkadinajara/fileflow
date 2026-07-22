# An Empirical Study of low-resource text summarisation

Our central finding is that structure loss compounds silently across conversion hops. Across 197 trials, cell-level accuracy reached 0.58, exceeding the strongest baseline. We release the corpus and scoring harness to support replication.

## Abstract

We release the corpus and scoring harness to support replication. We study on-device inference for privacy using an expert annotation study over the public benchmark release. Across 417 trials, macro-averaged F1 reached 0.54, exceeding the strongest baseline. See the [annotation guidelines](https://example.com/guidelines/v2).

### Abstract — Timeline

We release the corpus and scoring harness to support replication. Our central finding is that extractive grounding reduces hallucination risk. We study on-device inference for privacy using an expert annotation study over a 65-document synthetic corpus.

**Ablation results**

| Variant | Metric | Δ vs full |
| --- | --- | --- |
| Equal weights | 0.65 | -11.4% |
| No structural term | 0.81 | -9.5% |
| Equal weights | 0.87 | -0.3% |
| No structural term | 0.88 | -11.0% |
| No structural term | 0.90 | -10.2% |

## Experimental Setup

We repeat the scoring pass to confirm determinism; identical inputs produce identical scores. The corpus comprises 399 documents spanning five domains with controlled feature profiles. All conversions run on a single machine to remove infrastructure variance. Reference data lives in the [annotation guidelines](https://example.com/guidelines/v2).

The corpus comprises 249 documents spanning five domains with controlled feature profiles. Baselines receive the same inputs and the same extraction budget. All conversions run on a single machine to remove infrastructure variance. The full context is in the [preregistration](https://example.com/prereg/2025). The applicable formula is $\sigma^2 = \frac{1}{n}\sum (x_i - \bar{x})^2$.

> A benchmark that cannot be re-run is a press release, not an instrument.

We report the following measures:

- Feature survival ratios for headings, tables, lists, and links
- Worst-hop location and magnitude
- macro-averaged F1 per chain
- Run time per conversion

**Fidelity by conversion chain**

| Chain | Structural | Semantic | Functional | Overall |
| --- | --- | --- | --- | --- |
| md→pdf→md | 0.52 | 0.72 | 0.77 | 0.92 |
| md→html→md | 0.90 | 0.94 | 0.63 | 0.59 |
| md→txt→md | 0.44 | 0.67 | 0.58 | 0.65 |
| md→pdf→md | 0.97 | 0.91 | 0.93 | 0.85 |
| md→docx→md | 0.53 | 0.81 | 0.83 | 0.90 |
| md→html→docx→md | 0.70 | 0.62 | 0.60 | 0.93 |

## Discussion

Failure analysis shows most semantic loss is concentrated in captions and inline emphasis rather than body prose. A practical implication is path planning: choosing the conversion order can preserve several points of fidelity. The gap between local and cumulative scores is the clearest signal of silent compounding loss. Our synthetic corpus trades naturalism for exact ground truth; we view this as the right trade for measurement studies. See the [fidelity index definition](https://example.com/sfi/spec). Formally, $r_k = \prod_{j=1}^{k} (1 - c_j)$, with terms as defined above.

Failure analysis shows most semantic loss is concentrated in captions and inline emphasis rather than body prose. The gap between local and cumulative scores is the clearest signal of silent compounding loss. A practical implication is path planning: choosing the conversion order can preserve several points of fidelity. Our synthetic corpus trades naturalism for exact ground truth; we view this as the right trade for measurement studies.

### Discussion — Timeline

A practical implication is path planning: choosing the conversion order can preserve several points of fidelity. Failure analysis shows most semantic loss is concentrated in captions and inline emphasis rather than body prose. Our synthetic corpus trades naturalism for exact ground truth; we view this as the right trade for measurement studies.

The evaluation protocol proceeds in four steps:

1. Generate the corpus with fixed seeds
2. Score every hop against predecessor and original
3. Aggregate by chain, domain, and tier

## Limitations

Semantic scoring depends on a sentence-embedding model and inherits its biases. The corpus is English-only; extension to Sinhala and Tamil is left to future work. We evaluate five formats; spreadsheet and presentation formats are out of scope.

We evaluate five formats; spreadsheet and presentation formats are out of scope. The corpus is English-only; extension to Sinhala and Tamil is left to future work. Semantic scoring depends on a sentence-embedding model and inherits its biases.

## Conclusion

Future work extends the corpus and adds human validation of the automatic scores. We presented a reproducible protocol for low-resource text summarisation and evidence that privacy routing need not sacrifice output quality. The harness runs unattended, making regression tracking across releases practical.

We presented a reproducible protocol for semantic drift in derived corpora and evidence that deterministic parsing outperforms learned baselines on ruled tables. Future work extends the corpus and adds human validation of the automatic scores. The harness runs unattended, making regression tracking across releases practical.
