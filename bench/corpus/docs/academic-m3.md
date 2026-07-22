# An Empirical Study of cross-format document fidelity

We study low-resource text summarisation using a replication of the base protocol over the annotated subset. Our central finding is that privacy routing need not sacrifice output quality. Across 147 trials, retention at hop three reached 0.60, exceeding the strongest baseline. We release the corpus and scoring harness to support replication.

## Abstract

Our central finding is that privacy routing need not sacrifice output quality. We study on-device inference for privacy using a stratified sample over the annotated subset. We release the corpus and scoring harness to support replication. Across 189 trials, retention at hop three reached 0.96, exceeding the strongest baseline. Supporting material is available in the [scoring harness](https://example.com/convertbench/harness).

Across 26 trials, macro-averaged F1 reached 0.84, exceeding the strongest baseline. We release the corpus and scoring harness to support replication. We study cross-format document fidelity using a controlled ablation over a 65-document synthetic corpus. Our central finding is that structure loss compounds silently across conversion hops. We compute this as $\sigma^2 = \frac{1}{n}\sum (x_i - \bar{x})^2$.

We report the following measures:

- mean cosine similarity per chain
- Feature survival ratios for headings, tables, lists, and links
- Worst-hop location and magnitude

## Related Work

Earlier studies of low-resource text summarisation evaluated single conversions in isolation. Benchmark efforts in adjacent areas rely on manual inspection, which does not scale past a few dozen documents. Our protocol differs by scoring every intermediate artifact against both its predecessor and the original. Formally, $\bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_i$, with terms as defined above.

Earlier studies of on-device inference for privacy evaluated single conversions in isolation. S. Fernando and colleagues proposed a similarity-based measure, but it ignores functional elements such as links and formulas. Our protocol differs by scoring every intermediate artifact against both its predecessor and the original. Benchmark efforts in adjacent areas rely on manual inspection, which does not scale past a few dozen documents. The full context is in the [annotation guidelines](https://example.com/guidelines/v2).

> A benchmark that cannot be re-run is a press release, not an instrument.

The evaluation protocol proceeds in four steps:

1. Generate the corpus with fixed seeds
2. Aggregate by chain, domain, and tier
3. Execute each conversion chain end to end
4. Score every hop against predecessor and original

## Discussion

A practical implication is path planning: choosing the conversion order can preserve several points of fidelity. The gap between local and cumulative scores is the clearest signal of silent compounding loss. Failure analysis shows most semantic loss is concentrated in captions and inline emphasis rather than body prose. Our synthetic corpus trades naturalism for exact ground truth; we view this as the right trade for measurement studies.

### Discussion — Detail

The gap between local and cumulative scores is the clearest signal of silent compounding loss. Our synthetic corpus trades naturalism for exact ground truth; we view this as the right trade for measurement studies. Failure analysis shows most semantic loss is concentrated in captions and inline emphasis rather than body prose.

**Fidelity by conversion chain**

| Chain | Structural | Semantic | Functional | Overall |
| --- | --- | --- | --- | --- |
| md→pdf→md | 0.88 | 0.90 | 0.78 | 0.99 |
| md→html→md | 0.42 | 0.98 | 0.59 | 0.69 |
| md→html→md | 0.97 | 0.83 | 0.61 | 0.88 |
| md→html→docx→md | 0.48 | 0.84 | 0.37 | 0.87 |
| md→pdf→md | 0.65 | 0.67 | 0.52 | 0.61 |
| md→html→md | 0.72 | 0.94 | 0.77 | 0.88 |

## Conclusion

The harness runs unattended, making regression tracking across releases practical. We presented a reproducible protocol for layout-aware information extraction and evidence that extractive grounding reduces hallucination risk. Future work extends the corpus and adds human validation of the automatic scores.

See the [baseline implementation](https://example.com/baselines/2024).

See the [corpus release](https://example.com/convertbench/corpus).
