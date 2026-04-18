# FileFlowOne — Research Gap Analysis Report
## Unsolved Problems at the Intersection of Browser AI, Document Conversion & Privacy

**Prepared for:** Kavishka Dinajara  
**Research Platform:** FileFlowOne (Next.js 14 + Python FastAPI)  
**Survey Scope:** 60+ papers (arXiv, ACM, IEEE, ICLR, NeurIPS, EMNLP 2022–2025) · 20+ industry tools  
**Date:** March 2026

---

## Executive Summary

No published metric exists for measuring semantic loss during document format conversion, no tool combines client-side AI with format conversion, and no privacy audit framework addresses document processing AI. These are the three most striking findings from a comprehensive literature survey. The document conversion pipeline has remained "dumb" — mechanical, unscored, and cloud-dependent — while AI has transformed nearly every adjacent field. For FileFlowOne, this represents an unusually fertile space where **12 genuinely novel contributions** are achievable within a single FYP timeline.

---

## Research Context

### Why This Space Is Fertile

| Dimension | Status |
|---|---|
| Cross-format semantic preservation metrics | **Does not exist** |
| General document conversion quality benchmark | **Does not exist** |
| Browser-based AI + format conversion combined | **Does not exist** |
| Privacy audit framework for document AI | **Does not exist** |
| Quantization impact on structured output | **Unstudied** |
| Privacy-aware edge/cloud routing | **Unstudied** |

### Technology Readiness (2025–2026)

- **WebGPU browser coverage:** ~77% globally (Chrome, Edge, Firefox)
- **WebLLM performance:** ~80% of native inference speed (arXiv:2412.15803)
- **ReaderLM-v2 (1.5B):** Beats GPT-4o by 15–20% on HTML extraction (arXiv:2503.01151)
- **WASM 2GB memory limit:** Hard constraint for in-browser model size
- **llama.cpp Q4_K_M:** 3B models fit in ~2GB VRAM

---

## Gap 1: No Metric for Cross-Format Semantic Preservation

**Novelty: HIGH | FYP Feasibility: YES | Publication: ACM DocEng / EMNLP**

### Evidence of Gap

Searches across arXiv, ACM DL, IEEE Xplore for "cross-format semantic preservation," "semantic loss format conversion," and "semantic fidelity document conversion" returned **zero results** addressing document-to-document conversion. The closest work — *End-to-End Semantic Preservation in Text-Aware Image Compression Systems* (arXiv:2503.19495, 2025) — measures OCR readability after image compression, not document conversion.

A Dagstuhl Seminar in 2010 noted "very few tools available for measuring specific properties" of document conversion. **Fifteen years later, this gap persists unchanged.**

READoc benchmark (ACL Findings 2025) explicitly states "the absence of unified evaluation in real-world scenarios" but proposes no semantic fidelity metric.

### Why It Matters

Converting DOCX→PDF→Markdown can silently destroy:
- Heading hierarchies and logical structure
- Table relationships and cell semantics
- Hyperlink meaning and functional completeness
- Formula notation and mathematical content
- Metadata (author, date, document properties)

Legal, medical, and financial organizations convert documents between formats with **zero mechanism to verify that meaning survived.**

### Proposed Contribution: Semantic Fidelity Index (SFI)

A multi-dimensional score computed as:

```
SFI = w₁·S_structural + w₂·S_semantic + w₃·S_functional

where:
  S_structural = preservation of headings, tables, lists, nesting
  S_semantic   = embedding similarity of content blocks (source vs target)
  S_functional = link integrity, formula correctness, metadata retention
  w₁=0.35, w₂=0.45, w₃=0.20 (tunable weights)
```

**Implementation in FileFlowOne:**
- Python FastAPI endpoint: `POST /api/slm-score` receives original + converted pair
- Structural extraction via BeautifulSoup (HTML), python-docx (DOCX), pdfminer (PDF)
- Semantic embeddings via `sentence-transformers` (all-MiniLM-L6-v2, 22MB, runs on CPU)
- Next.js `QualityScoreCard.tsx` renders per-dimension radar chart + composite score

**Publication Target:** ACM DocEng (Document Engineering), EMNLP Systems track, or NeurIPS Datasets & Benchmarks

---

## Gap 2: No Benchmark for Document Format Conversion Quality

**Novelty: HIGH | FYP Feasibility: YES | Publication: NeurIPS D&B / ACM DocEng**

### Evidence of Gap

- **OmniDocBench** (CVPR 2025): Benchmarks PDF *parsing* only (981 pages, 9 doc types)
- **READoc** (ACL Findings 2025): Evaluates structured extraction only
- **French PDF-to-Markdown benchmark** (arXiv:2602.11960): One language, one direction
- **Pandoc documentation:** Explicitly warns "one should not expect perfect conversions" but provides no measurement mechanism

**Industry survey result:** CloudConvert, Zamzar, Adobe Acrobat, iLovePDF, Aspose, Convertio, SmallPDF — **zero tools provide any conversion quality score.**

**Only exception:** IBM Docling (v2.34.0) provides confidence scores but only for PDF input parsing — not arbitrary format conversion.

### Proposed Contribution: ConvertBench

A benchmark dataset structured as:

| Dimension | Specification |
|---|---|
| Documents | 500+ across 10+ formats |
| Domains | Academic, legal, medical, financial, technical |
| Test types | Unidirectional, bidirectional, round-trip |
| Ground truth | Structural annotations + semantic content labels |
| Evaluation scripts | Open-source Python package |

**Round-trip degradation test:** DOCX→PDF→Markdown→HTML→DOCX — measures cumulative information loss at each step.

**Publication Target:** NeurIPS Datasets and Benchmarks track (strong fit), LREC-COLING, ACM DocEng

---

## Gap 3: Privacy-Aware Adaptive Routing Between Local SLM and Cloud LLM

**Novelty: HIGH | FYP Feasibility: YES | Publication: ICLR / WWW / ACM CCS**

### Evidence of Gap

Existing routing literature:
- **Hybrid LLM** (Ding et al., ICLR 2024) — routes by predicted query difficulty
- **RouteLLM** (Ong et al., ICLR 2025) — routes using preference data
- **FrugalGPT** (Chen, Zaharia, Zou, TMLR 2024) — cascades models by cost

A 2025 survey *"Collaborative Inference and Learning between Edge SLMs and Cloud LLMs"* (arXiv:2507.16731) explicitly identifies **"privacy-aware routing" as an open challenge.**

**Critical gap:** All existing routing papers assume server-side deployment. Routing between a **browser-based WebGPU SLM and a cloud API** — with privacy as a first-class routing signal — is entirely unstudied.

### Proposed Contribution: Three-Factor Privacy Router

```
Route(document) → {LOCAL | HYBRID | CLOUD}

Factor 1: Sensitivity Score (0–1)
  - PII detector via Transformers.js (runs in-browser, zero upload)
  - Flags: names, addresses, financial data, medical terms, legal content
  - If sensitivity > 0.7 → force LOCAL

Factor 2: Complexity Score (0–1)  
  - Document structure complexity: tables, columns, formulas, images
  - If complexity > 0.8 AND sensitivity < 0.5 → allow CLOUD

Factor 3: Quality Threshold
  - Predicted SLM output quality from complexity + quantization benchmarks
  - If predicted quality < 0.65 → escalate to CLOUD (with user consent)

Final routing decision matrix:
  HIGH sensitivity                → LOCAL always
  LOW sensitivity + HIGH complexity → CLOUD (opt-in)
  LOW sensitivity + LOW complexity  → LOCAL (fast path)
  MEDIUM sensitivity              → HYBRID (local extract + cloud verify)
```

**Implementation:** Next.js router component + Python sensitivity classifier. User sees real-time routing decision with explanation.

**Publication Target:** ICLR (routing systems), WWW (browser AI), ACM CCS (privacy contribution)

---

## Gap 4: Quantization Impact on Structured Output Generation Is Unstudied

**Novelty: HIGH | FYP Feasibility: YES | Publication: EMNLP / ACL / COLM**

### Evidence of Gap

Existing quantization research:
- *Low-Bit Quantization Favors Undertrained LLMs* (Ouyang et al., ACL 2025) — 1,500+ checkpoints, general tasks
- *Quantization Meets Reasoning* (arXiv:2505.11574) — INT4 degrades Qwen3-4B MMLU-Pro: 71.0→68.2
- Neveditsin et al. (arXiv:2507.01810) — SLMs show "syntactic fragility" in JSON/YAML generation
- JSONSchemaBench (arXiv:2501.10868) — constrained JSON generation evaluation

**Critical gap:** No paper studies how quantization levels (FP16→INT8→INT4) specifically affect **structured output generation quality** — schema compliance, JSON parseability, hallucination rates in SQL generation. This intersection is essential for browser deployment, which *requires* INT4 to fit within 2–4GB VRAM constraints.

### Proposed Experiment Design

| Model | FP16 | INT8 | INT4 |
|---|---|---|---|
| Phi-3.5-mini-Instruct | ✓ | ✓ | ✓ |
| Qwen2.5-3B-Instruct | ✓ | ✓ | ✓ |
| Llama-3.2-3B-Instruct | ✓ | ✓ | ✓ |
| ReaderLM-v2 (1.5B) | ✓ | ✓ | ✓ |

**Tasks:** JSON extraction from documents, Markdown generation from HTML, schema-guided data extraction, SQL INSERT generation

**Metrics per quantization level:**
- JSON parseability rate (%)
- Schema compliance rate (%)
- Content accuracy (ROUGE-L vs ground truth)
- Hallucination rate (manual annotation, n=50 per config)
- Inference latency (TTFT, ms)
- Peak RAM usage (MB)

**Browser overhead measurement:** Run each config natively (Python) AND in-browser (WebLLM/Transformers.js). Measure additional degradation from browser execution environment.

**Publication Target:** EMNLP, ACL, or COLM (Conference on Language Modeling)

---

## Gap 5: No Tool Combines Browser-Based AI with Document Format Conversion

**Novelty: HIGH | FYP Feasibility: YES | Publication: ACM DocEng / WWW**

### Industry Survey Result

| Tool | Browser-Based | AI-Enhanced | Format Conversion | Local Inference |
|---|---|---|---|---|
| Ai Multi Tools | ✓ | ✗ | ✓ (PDF ops) | N/A |
| Transformers.js | ✓ | ✓ | ✗ | ✓ |
| Pandoc WASM | ✓ | ✗ | ✓ (60+ formats) | N/A |
| Docling (IBM) | ✗ | ✓ | ✓ | ✗ |
| ChatPDF | ✗ | ✓ | ✗ | ✗ |
| **FileFlowOne** | **✓** | **✓** | **✓** | **✓** |

**No existing system combines all four.** The technology convergence point is 2025–2026: WebGPU at 77% browser coverage, WebLLM at 80% native performance, and 1.5B models outperforming GPT-4o on specific tasks.

### Architecture for FileFlowOne

```
Browser Layer (Zero Upload)
├── PDF.js + Pandoc WASM → format handling
├── Transformers.js (ONNX) → lightweight AI (PII detection, quality scoring)
└── WebLLM (MLC) → heavy SLM inference (Phi-3.5-mini INT4)

Server Layer (Optional, Privacy-Preserving)
├── Python FastAPI → SLM inference (llama.cpp, Q4_K_M/Q8_0)
├── POST /transform → semantic transformation
├── POST /score → quality evaluation
└── POST /benchmark → comparative analysis

Privacy Boundary
└── Content Security Policy: default-src 'self' → no external data transmission
```

**Publication Target:** ACM DocEng, WWW (The Web Conference), CHI (systems + UX framing)

---

## Gap 6: Structured Output Hallucination Lacks a Dedicated Benchmark

**Novelty: MEDIUM-HIGH | FYP Feasibility: YES | Publication: EMNLP / ACL**

### Evidence of Gap

General hallucination benchmarks:
- HaluEval (2023), TruthfulQA, FaithBench — natural language text only
- HalluLens (arXiv:2504.17550, 2025) — factual claims in text
- SQLHD (arXiv:2512.22250) — SQL hallucination, F1 69–83%, single format only

**No equivalent benchmark for general structured output** (JSON, XML, YAML, SQL combined). Structured output hallucination is qualitatively different:
- Schema violations (wrong field names, type mismatches)
- Referential hallucinations (fields that don't exist in the schema)
- Logical inconsistencies (valid JSON but nonsensical values)
- Structural corruption (valid syntax but wrong nesting)

### Proposed Contribution: StructHalluBench

- 1,000+ structured output generation tasks
- Formats: JSON, Markdown with schema, YAML, SQL
- Ground truth: human-verified schema-compliant outputs
- Evaluation metrics: parseability, schema compliance, semantic accuracy, hallucination rate

**Integration:** FileFlowOne flags suspicious structured outputs during conversion with a "confidence indicator" badge.

**Publication Target:** EMNLP, ACL, NAACL, or NeurIPS Datasets track

---

## Gap 7: Formal Privacy Model for Browser-Based Local Inference Is Undefined

**Novelty: MEDIUM-HIGH | FYP Feasibility: YES | Publication: USENIX / PoPETs**

### Evidence of Gap

- **PAPILLON** (arXiv:2410.17127, 2024): Explicitly lists "formal theoretical guarantees for local execution" as **future work**
- **No Free Lunch Theorem** (Artificial Intelligence, 2025): Proves privacy-utility tradeoff for remote inference — theorem is irrelevant for purely local inference, but no paper analyzes the local case formally
- **Split-and-Denoise** (ICML 2024): (ε,δ)-DP for split inference — assumes client-server architecture

**Critical gap:** Local browser-based inference is universally *assumed* to be private but **never formally proven.** Remaining threats include:
- Model memorization (training data in weights)
- Browser side-channel attacks (timing, memory access patterns)
- Extension/malware document interception
- Browser history/cache leakage

### Proposed Contribution: Browser AI Threat Model + Privacy Dashboard

**Formal threat model defines:**

| Adversary | Protected? | Mechanism |
|---|---|---|
| Network eavesdropper | ✓ YES | No network transmission |
| Cloud provider | ✓ YES | No API calls in local mode |
| Browser extension | ⚠ PARTIAL | CSP headers, sandboxing |
| Local malware | ✗ NO | Outside browser security model |
| Model memorization | ⚠ PARTIAL | No fine-tuning on user data |

**Privacy Transparency Dashboard** (Next.js component):
- Real-time network request monitor (shows zero outbound during processing)
- Model provenance display (weight source, quantization method)
- Processing location indicator (browser / local server / cloud)
- Data retention confirmation (deleted after processing)

**Publication Target:** USENIX Security, IEEE S&P (Oakland), PoPETs

---

## Gap 8: SLMs for Multi-Format Document Conversion Are Untested

**Novelty: MEDIUM-HIGH | FYP Feasibility: YES | Publication: EMNLP / ACL Findings**

### Evidence of Gap

- **ReaderLM-v2** (arXiv:2503.01151, 2025): 1.5B model, HTML→Markdown/JSON only, outperforms GPT-4o by 15–20%
- **Extract-0** (arXiv:2509.22906): 7B model, schema-guided extraction, beats GPT-4.1 (mean reward 0.573 vs 0.457)
- **Docling** (IBM, arXiv:2408.09869): Pipeline approach (layout + OCR), server-side only

**Critical gap:** ReaderLM-v2 handles only HTML input. No SLM has been evaluated on the full **format conversion matrix** (PDF↔DOCX↔Markdown↔HTML↔LaTeX↔TXT). The question of which format transitions are tractable at 1–3B parameters, and which require 7B+, is entirely unanswered.

### Research Question

> At what format complexity and document domain does a browser-deployable quantized SLM need to defer to a larger model?

**Evaluation matrix:** 5 SLMs × 3 quantization levels × 12 format pairs × 5 document domains = systematic characterization

**Publication Target:** EMNLP Systems, ACL Findings, ACM DocEng

---

## Gap 9: No Privacy Audit Framework for Document Processing AI

**Novelty: MEDIUM-HIGH | FYP Feasibility: YES | Publication: PoPETs / ACM FAccT**

### Evidence of Gap

- **ISO/IEC 42001:2023** — AI management standard, privacy as one concern among many, no document-specific controls
- **NIST AI 600-1** (July 2024) — suggested actions only, not audit procedures
- **EU AI Act** (Regulation 2024/1689) — requires technical documentation but no audit methodology

**No standard exists** for auditing the specific privacy properties of an AI document processing pipeline: what data enters the model, what is retained, what leaves the system, whether processing complies with data minimization principles.

### Proposed Contribution: Document AI Privacy Audit Protocol (DAPAP)

An open-source framework monitoring:
1. All network requests during processing (target: zero for local mode)
2. Model input/output with opt-in consent logging
3. Data retention verification (confirm deletion post-processing)
4. Model provenance tracking (which model processed which document)

**Alignment:** NIST AI 600-1 risk categories, ISO/IEC 42001 controls

**Publication Target:** PoPETs, ACM FAccT, IEEE Security & Privacy

---

## Gap 10: Round-Trip Conversion Degradation Is Unmeasured

**Novelty: MEDIUM | FYP Feasibility: YES | Publication: ACM DocEng**

### Evidence of Gap

No benchmark, paper, or tool measures cumulative quality loss from round-trip conversions (e.g., DOCX→PDF→Markdown→HTML→DOCX). Pandoc acknowledges lossy conversion via its intermediate AST but provides no quantification.

**Real-world impact:** A legal contract drafted in Word, shared as PDF, annotated in Markdown, and reconverted to Word undergoes four format transitions. Cumulative semantic drift could introduce legally significant changes with zero detection.

### Proposed: Round-Trip Fidelity Tracker

Built on Gap 1's Semantic Fidelity Index:
- Chain-conversion testing: A→B→C→A
- Per-step SFI score + cumulative degradation curve
- "Safe format path" recommendation based on empirical degradation data

**Publication Target:** ACM DocEng, EMNLP/ACL workshop paper

---

## Gap 11: Browser-Based Document Layout Analysis Models Don't Exist

**Novelty: MEDIUM | FYP Feasibility: PARTIAL | Publication: ICDAR / ACM DocEng**

### Evidence of Gap

Document layout models (LayoutLMv3, DiT, DocLayNet-trained YOLO) have never been benchmarked in WebGPU/WASM environments. ONNX Runtime Web benchmarks exist for standard vision models (ResNet, SqueezeNet) but not document-specific architectures.

**Hard constraint:** Browser deployment requires model size < ~500MB (INT4 quantized) with < 500ms latency per page.

**Publication Target:** ICDAR (Document Analysis and Recognition), ACM DocEng

---

## Gap 12: GDPR "Compliance by Architecture" for Local AI Is Unformalized

**Novelty: MEDIUM | FYP Feasibility: YES | Publication: PoPETs / ACM FAccT**

### Evidence of Gap

- **EDPB Opinion 28/2024** — addresses GDPR for AI model development, assumes cloud deployment
- **Italian Garante fined OpenAI €15M** for GDPR violations including lack of data minimization
- *"GDPR and LLMs"* (MDPI Future Internet, Vol 17(4), 2025) — identifies Right to Erasure, data minimization as fundamental obstacles for cloud LLMs

**No published work formalizes** how local-only, browser-based AI processing maps to GDPR obligations — specifically whether a system that never transmits personal data to a server satisfies Articles 5(1)(c) (data minimization), 25 (data protection by design), and 32 (security of processing) **by architectural default.**

### Proposed Contribution: GDPR Architecture Compliance Mapping

Analysis of each relevant GDPR article against the browser-based architecture + technical controls:
- Content Security Policy blocking all outbound requests during processing
- Service Worker intercepting and blocking unintended network calls
- Exportable audit log for data protection officers

**Publication Target:** Computer Law & Security Review, PoPETs, ACM FAccT workshop

---

## How the Gaps Interconnect

```
Gap 1 (SFI Metric)
    ↓ validated by
Gap 2 (ConvertBench)
    ↓ benchmarks
Gap 5 (Unified Browser AI Tool)
    ├── requires Gap 8 (SLM for formats)
    ├── requires Gap 11 (browser layout models)
    └── requires Gap 4 (quantization analysis)

Gap 3 (Privacy Router)
    ↓ uses predictions from
Gap 4 (Quantization Study)
    ↓ structured output reliability measured by
Gap 6 (StructHalluBench)

Gap 7 (Privacy Threat Model)
    ↓ operationalized as
Gap 9 (Privacy Audit Framework)
    ↓ formalized legally as
Gap 12 (GDPR Compliance Mapping)
```

---

## Recommended FYP Scope (6 Months, Solo Developer)

### Minimum Viable Research Contribution

| Gap | Component | Month |
|---|---|---|
| Gap 1 | Semantic Fidelity Index (SFI) — core metric | 1–2 |
| Gap 4 | Quantization benchmarking study | 2–3 |
| Gap 5 | Unified browser AI conversion (prototype) | 3–5 |
| Gap 7 | Formal privacy threat model + dashboard | 4–5 |
| All | Dissertation writing + evaluation | 6 |

### Explicitly Out of Scope

- Audio, video, image conversion (existing FileFlowOne features — excluded from AI evaluation)
- SLM fine-tuning (prompt engineering only)
- Mobile/embedded deployment
- Real-time streaming inference

### Publication Pathway

1. **Conference (FYP year):** ACM DocEng or WWW — systems paper on the unified architecture
2. **Journal (post-FYP):** Transactions on Document Engineering — full SFI metric paper with ConvertBench
3. **Workshop (FYP year):** EMNLP Systems track — quantization study as shorter paper

---

## Key References

| Paper | Relevance |
|---|---|
| WebLLM (arXiv:2412.15803) | In-browser LLM, 80% native performance |
| ReaderLM-v2 (arXiv:2503.01151) | 1.5B SLM beats GPT-4o on HTML extraction |
| RouteLLM (arXiv:2406.18665) | LLM routing with preference data |
| Hybrid LLM (ICLR 2024) | Cost-efficient LLM routing |
| PAPILLON (arXiv:2410.17127) | Privacy-preserving local/cloud ensembles |
| Docling (arXiv:2408.09869) | IBM document parsing with confidence scores |
| READoc (ACL Findings 2025) | Unified document extraction benchmark |
| arXiv:2507.16731 | Edge SLM + Cloud LLM collaboration survey |
| arXiv:2507.01810 | SLM structured output fragility |
| arXiv:2501.10868 | JSONSchemaBench — structured output evaluation |
| arXiv:2512.22250 | SQL hallucination detection |
| arXiv:2411.17691 | Quantization scaling laws |

---

## Conclusion

The most striking finding across this survey is the **complete absence of measurement infrastructure for document conversion.** NLP has BLEU, ROUGE, and BERTScore. Information retrieval has MAP and NDCG. Document format conversion — performed billions of times daily — has no equivalent metrics, benchmarks, or quality assurance tools.

FileFlowOne is uniquely positioned to fill this vacuum because it sits at the intersection of three maturing technologies:
1. **Browser-based AI inference** — WebGPU + WebLLM achieving 80% native performance
2. **Small language models for document tasks** — ReaderLM-v2 beating GPT-4o at 1.5B parameters
3. **Privacy-first architecture** — eliminating the network vector entirely

The research gaps identified here are not incremental improvements. They represent **missing foundations** that the field needs regardless of which system fills them. Building these foundations as features of an open-source platform turns a FYP into a lasting contribution to the research community.

---

*Report prepared by Claude (Anthropic) for FileFlowOne research planning. Survey conducted March 2026.*
