# Measuring on-device inference for privacy: Methods and Results

Across 180 trials, macro-averaged F1 reached 0.85, exceeding the strongest baseline. We release the corpus and scoring harness to support replication. We study low-resource text summarisation using a controlled ablation over the public benchmark release. Our central finding is that extractive grounding reduces hallucination risk.

## Abstract

We release the corpus and scoring harness to support replication. We study cross-format document fidelity using a paired comparison over the public benchmark release. Our central finding is that privacy routing need not sacrifice output quality.

## Related Work

Benchmark efforts in adjacent areas rely on manual inspection, which does not scale past a few dozen documents. Earlier studies of low-resource text summarisation evaluated single conversions in isolation. D. Rajapakse and colleagues proposed a similarity-based measure, but it ignores functional elements such as links and formulas. Our protocol differs by scoring every intermediate artifact against both its predecessor and the original. Reference data lives in the [scoring harness](https://example.com/convertbench/harness).

Our protocol differs by scoring every intermediate artifact against both its predecessor and the original. H. Weerasinghe and colleagues proposed a similarity-based measure, but it ignores functional elements such as links and formulas. Benchmark efforts in adjacent areas rely on manual inspection, which does not scale past a few dozen documents. Reference data lives in the [fidelity index definition](https://example.com/sfi/spec).

> A benchmark that cannot be re-run is a press release, not an instrument.

**Ablation results**

| Variant | Metric | Δ vs full |
| --- | --- | --- |
| No functional term | 0.57 | 1.0% |
| Full model | 0.66 | -2.8% |
| No structural term | 0.69 | -5.5% |
| No semantic term | 0.75 | -0.7% |
| No semantic term | 0.57 | -1.8% |
| No structural term | 0.60 | -6.5% |

## Method

Each document is passed through a fixed conversion chain, and every hop is scored on structural, semantic, and functional dimensions. We use an expert annotation study with documents stratified by domain and complexity tier. Ground-truth feature counts are recorded at generation time, giving an exact reference for survival analysis. The scoring weights (0.35, 0.45, 0.20) follow the fidelity index definition and are held fixed across all runs. Reference data lives in the [corpus release](https://example.com/convertbench/corpus).

Each document is passed through a fixed conversion chain, and every hop is scored on structural, semantic, and functional dimensions. We use a stratified sample with documents stratified by domain and complexity tier. Ground-truth feature counts are recorded at generation time, giving an exact reference for survival analysis. The scoring weights (0.35, 0.45, 0.20) follow the fidelity index definition and are held fixed across all runs.

### Method — Breakdown

We use a stratified sample with documents stratified by domain and complexity tier. Ground-truth feature counts are recorded at generation time, giving an exact reference for survival analysis. The scoring weights (0.35, 0.45, 0.20) follow the fidelity index definition and are held fixed across all runs. Each document is passed through a fixed conversion chain, and every hop is scored on structural, semantic, and functional dimensions.

We report the following measures:

- Worst-hop location and magnitude
- retention at hop three per chain
- Run time per conversion
- Feature survival ratios for headings, tables, lists, and links

**Fidelity by conversion chain**

| Chain | Structural | Semantic | Functional | Overall |
| --- | --- | --- | --- | --- |
| md→html→docx→md | 0.73 | 0.74 | 0.94 | 0.66 |
| md→pdf→md | 0.42 | 0.94 | 0.55 | 0.57 |
| md→docx→md | 0.92 | 0.61 | 0.56 | 0.64 |
| md→txt→md | 0.59 | 0.97 | 0.86 | 0.82 |
| md→pdf→md | 0.61 | 0.69 | 0.46 | 0.78 |
| md→html→md | 0.95 | 0.83 | 0.47 | 0.53 |

## Discussion

The gap between local and cumulative scores is the clearest signal of silent compounding loss. A practical implication is path planning: choosing the conversion order can preserve several points of fidelity. Our synthetic corpus trades naturalism for exact ground truth; we view this as the right trade for measurement studies. The applicable formula is $r_k = \prod_{j=1}^{k} (1 - c_j)$.

## Conclusion

Future work extends the corpus and adds human validation of the automatic scores. We presented a reproducible protocol for layout-aware information extraction and evidence that deterministic parsing outperforms learned baselines on ruled tables. The harness runs unattended, making regression tracking across releases practical.

The evaluation protocol proceeds in four steps:

1. Execute each conversion chain end to end
2. Score every hop against predecessor and original
3. Aggregate by chain, domain, and tier
4. Generate the corpus with fixed seeds
