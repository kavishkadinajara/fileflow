# Research Gap

Plan or implement a feature tied to one of the 12 research gaps from the FileFlowOne research plan.

## Arguments
`$ARGUMENTS` — gap number or name, e.g. "Gap 1 SFI metric" or "Gap 3 privacy router" or "Gap 5 browser AI integration"

## Gap index (from `docs/FileFlowOne_Research_Gap_Report.md`)

| Gap | Title | Novelty | FYP Target |
|---|---|---|---|
| 1 | Semantic Fidelity Index (SFI) | HIGH | ACM DocEng / EMNLP |
| 2 | ConvertBench dataset | HIGH | NeurIPS D&B / ACM DocEng |
| 3 | Privacy-aware adaptive routing (local SLM ↔ cloud LLM) | HIGH | ICLR / WWW / ACM CCS |
| 4 | Quantization impact on structured output | HIGH | EMNLP / ACL / COLM |
| 5 | Unified browser AI + format conversion tool | HIGH | ACM DocEng / WWW |
| 6 | StructHalluBench (structured output hallucination) | MEDIUM-HIGH | EMNLP / ACL |
| 7 | Formal privacy threat model + browser privacy dashboard | MEDIUM-HIGH | USENIX / PoPETs |
| 8 | SLM evaluation across full format conversion matrix | MEDIUM-HIGH | EMNLP / ACL Findings |
| 9 | Document AI Privacy Audit Protocol (DAPAP) | MEDIUM-HIGH | PoPETs / ACM FAccT |
| 10 | Round-trip fidelity tracker | MEDIUM | ACM DocEng |
| 11 | Browser-based document layout analysis | MEDIUM | ICDAR |
| 12 | GDPR compliance-by-architecture formalization | MEDIUM | PoPETs / ACM FAccT |

## Recommended FYP scope (6 months, solo)

Priority order: **Gap 1 → Gap 4 → Gap 5 → Gap 7**

- Month 1–2: Gap 1 (SFI) — use `/sfi-score` command
- Month 2–3: Gap 4 (Quantization study) — experimental, runs outside the Next.js app
- Month 3–5: Gap 5 (Unified browser AI) — integrate WebLLM/Transformers.js
- Month 4–5: Gap 7 (Privacy model) — use `/privacy-audit` command
- Month 6: Dissertation + evaluation

## For each gap implementation

1. Read the full gap section in `docs/FileFlowOne_Research_Gap_Report.md`
2. Identify the proposed architecture/API endpoints
3. Use the relevant project commands (`/add-converter`, `/new-api-route`, `/new-component`, `/sfi-score`, `/privacy-audit`, `/benchmark-conversion`) to implement the required pieces
4. Document the novel contribution clearly in code comments and the dissertation

**Out of scope for research evaluation:** audio, video, image conversion (existing FileFlowOne features).
