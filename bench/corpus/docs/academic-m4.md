# Measuring on-device inference for privacy: Methods and Results

This paper contributes the public benchmark release, an automated scoring pipeline, and an analysis of failure modes. We argue that feature-level scoring localises degradation better than aggregate metrics, and we design the evaluation to test exactly this. The practical motivation is direct: users convert documents through several formats and have no visibility into accumulated loss. Prior work on on-device inference for privacy has largely reported aggregate scores, which obscure where degradation occurs.

## Introduction

The practical motivation is direct: users convert documents through several formats and have no visibility into accumulated loss. This paper contributes a 65-document synthetic corpus, an automated scoring pipeline, and an analysis of failure modes. Prior work on low-resource text summarisation has largely reported aggregate scores, which obscure where degradation occurs. We argue that deterministic parsing outperforms learned baselines on ruled tables, and we design the evaluation to test exactly this. Details are recorded in the [preregistration](https://example.com/prereg/2025). Formally, $F_1 = \frac{2PR}{P + R}$, with terms as defined above.

### Introduction — Breakdown

This paper contributes the annotated subset, an automated scoring pipeline, and an analysis of failure modes. Prior work on low-resource text summarisation has largely reported aggregate scores, which obscure where degradation occurs. The practical motivation is direct: users convert documents through several formats and have no visibility into accumulated loss.

We report the following measures:

- mean cosine similarity per chain
- Feature survival ratios for headings, tables, lists, and links
- Worst-hop location and magnitude
- Run time per conversion

**Fidelity by conversion chain**

| Chain | Structural | Semantic | Functional | Overall |
| --- | --- | --- | --- | --- |
| md→docx→md | 0.86 | 0.86 | 0.81 | 0.91 |
| md→html→md | 0.48 | 0.86 | 0.39 | 0.58 |
| md→html→md | 0.76 | 0.81 | 0.90 | 0.62 |
| md→docx→md | 0.54 | 0.74 | 0.86 | 0.70 |
| md→html→md | 0.55 | 0.90 | 0.86 | 0.68 |

## Related Work

Earlier studies of semantic drift in derived corpora evaluated single conversions in isolation. Benchmark efforts in adjacent areas rely on manual inspection, which does not scale past a few dozen documents. N. Perera and colleagues proposed a similarity-based measure, but it ignores functional elements such as links and formulas. Details are recorded in the [baseline implementation](https://example.com/baselines/2023).

### Related Work — Timeline

Earlier studies of cross-format document fidelity evaluated single conversions in isolation. Benchmark efforts in adjacent areas rely on manual inspection, which does not scale past a few dozen documents. Our protocol differs by scoring every intermediate artifact against both its predecessor and the original.

> A benchmark that cannot be re-run is a press release, not an instrument.

We report the following measures:

- Worst-hop location and magnitude
- Run time per conversion
- inter-annotator agreement per chain

**Corpus composition**

| Domain | Docs | Mean words | Tables | Links |
| --- | --- | --- | --- | --- |
| Business | 11 | 710 | 38 | 62 |
| Medical | 13 | 2083 | 13 | 27 |
| Business | 15 | 1026 | 31 | 35 |
| Business | 12 | 498 | 30 | 50 |
| Technical | 16 | 756 | 32 | 88 |

## Results

Domain effects are secondary to feature effects: table-heavy documents degrade fastest regardless of domain. These results support the claim that privacy routing need not sacrifice output quality. macro-averaged F1 averaged 0.83 on faithful chains and fell sharply on chains that pass through plain text. See the [corpus release](https://example.com/convertbench/corpus). The applicable formula is $r_k = \prod_{j=1}^{k} (1 - c_j)$.

inter-annotator agreement averaged 0.86 on faithful chains and fell sharply on chains that pass through plain text. These results support the claim that privacy routing need not sacrifice output quality. Domain effects are secondary to feature effects: table-heavy documents degrade fastest regardless of domain. The largest single-hop drop occurs when structure must be reconstructed from an unstructured artifact. See the [scoring harness](https://example.com/convertbench/harness).

## Limitations

The corpus is English-only; extension to Sinhala and Tamil is left to future work. Semantic scoring depends on a sentence-embedding model and inherits its biases. We evaluate five formats; spreadsheet and presentation formats are out of scope. The full context is in the [corpus release](https://example.com/convertbench/corpus).

## Conclusion

We presented a reproducible protocol for semantic drift in derived corpora and evidence that deterministic parsing outperforms learned baselines on ruled tables. The harness runs unattended, making regression tracking across releases practical. Future work extends the corpus and adds human validation of the automatic scores.
