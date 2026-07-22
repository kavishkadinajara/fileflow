# On semantic drift in derived corpora: Evidence from the held-out evaluation split

Prior work on layout-aware information extraction has largely reported aggregate scores, which obscure where degradation occurs. This paper contributes the public benchmark release, an automated scoring pipeline, and an analysis of failure modes. We argue that structure loss compounds silently across conversion hops, and we design the evaluation to test exactly this.

## Introduction

This paper contributes the pilot collection, an automated scoring pipeline, and an analysis of failure modes. The practical motivation is direct: users convert documents through several formats and have no visibility into accumulated loss. We argue that deterministic parsing outperforms learned baselines on ruled tables, and we design the evaluation to test exactly this. Details are recorded in the [annotation guidelines](https://example.com/guidelines/v2).

The practical motivation is direct: users convert documents through several formats and have no visibility into accumulated loss. This paper contributes the pilot collection, an automated scoring pipeline, and an analysis of failure modes. We argue that extractive grounding reduces hallucination risk, and we design the evaluation to test exactly this. Reference data lives in the [annotation guidelines](https://example.com/guidelines/v2).

We report the following measures:

- macro-averaged F1 per chain
- Run time per conversion
- Feature survival ratios for headings, tables, lists, and links

## Results

Domain effects are secondary to feature effects: table-heavy documents degrade fastest regardless of domain. macro-averaged F1 averaged 0.70 on faithful chains and fell sharply on chains that pass through plain text. The largest single-hop drop occurs when structure must be reconstructed from an unstructured artifact.

Domain effects are secondary to feature effects: table-heavy documents degrade fastest regardless of domain. These results support the claim that structure loss compounds silently across conversion hops.

## Limitations

The corpus is English-only; extension to Sinhala and Tamil is left to future work. Semantic scoring depends on a sentence-embedding model and inherits its biases. We evaluate five formats; spreadsheet and presentation formats are out of scope.
