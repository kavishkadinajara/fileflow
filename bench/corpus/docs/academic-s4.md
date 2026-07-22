# An Empirical Study of semantic drift in derived corpora

We repeat the scoring pass to confirm determinism; identical inputs produce identical scores. Baselines receive the same inputs and the same extraction budget. The corpus comprises 455 documents spanning five domains with controlled feature profiles.

## Experimental Setup

Baselines receive the same inputs and the same extraction budget. The corpus comprises 30 documents spanning five domains with controlled feature profiles. We repeat the scoring pass to confirm determinism; identical inputs produce identical scores. Supporting material is available in the [preregistration](https://example.com/prereg/2024).

## Discussion

The gap between local and cumulative scores is the clearest signal of silent compounding loss. A practical implication is path planning: choosing the conversion order can preserve several points of fidelity. See the [annotation guidelines](https://example.com/guidelines/v2).

The evaluation protocol proceeds in four steps:

1. Aggregate by chain, domain, and tier
2. Execute each conversion chain end to end
3. Generate the corpus with fixed seeds
4. Score every hop against predecessor and original
