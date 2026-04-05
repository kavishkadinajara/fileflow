# Semantic Preservation in Cross-Format Document Conversion: A Quantitative Analysis

**Abstract.** This paper presents a systematic evaluation of semantic content preservation across automated document format conversions. We introduce the Semantic Fidelity Index (SFI), a composite metric combining structural, semantic, and functional dimensions weighted at 0.35, 0.45, and 0.20 respectively. Across 500 benchmark documents spanning five formats, we observe mean SFI scores ranging from 0.61 (PDF→DOCX) to 0.94 (MD→HTML), with semantic similarity measured via cosine distance on sentence-transformer embeddings accounting for the majority of score variance (R² = 0.71).

---

## 1. Introduction

Document format conversion is a ubiquitous operation in modern information workflows. Organizations routinely convert between Markdown, HTML, DOCX, PDF, and plain text representations of the same underlying content. Despite the prevalence of such conversions, there exists no widely adopted quantitative framework for measuring how faithfully semantic content is preserved through these transformations.

Prior work on document similarity has largely focused on near-duplicate detection (Broder, 1997) and plagiarism identification (Potthast et al., 2010). These approaches typically operate on exact-match or lexical overlap metrics such as Jaccard similarity or cosine TF-IDF, which are poorly suited to cross-format comparison where syntactic representations differ substantially while semantic content is identical.

Neural embedding approaches using transformer-based sentence encoders (Reimers & Gurevych, 2019) offer a more principled basis for semantic comparison, exhibiting high robustness to surface-form variation. However, embedding similarity alone does not capture structural properties such as heading hierarchy, table preservation, or hyperlink fidelity that are meaningful to document consumers.

We argue that a holistic fidelity metric must combine: (1) structural fidelity, measuring preservation of document architecture; (2) semantic fidelity, measuring preservation of propositional content; and (3) functional fidelity, measuring preservation of interactive and metadata elements.

## 2. Related Work

### 2.1 Document Similarity Metrics

Salton and McGill (1983) introduced the vector space model for information retrieval, laying the groundwork for cosine similarity as a document comparison primitive. Subsequent refinements introduced TF-IDF weighting, BM25 ranking, and eventually neural retrieval methods.

For structured documents specifically, tree-edit distance approaches (Zhang & Shasha, 1989) have been applied to XML and HTML comparison. These methods are sensitive to tag-level differences and do not generalize well to cross-format settings where structural markup differs by convention rather than content.

### 2.2 Sentence Transformers

The `all-MiniLM-L6-v2` model used in our implementation is a distilled variant of the BERT architecture fine-tuned for semantic textual similarity (Wang et al., 2020). It produces 384-dimensional embeddings and achieves competitive performance on STS benchmarks while requiring substantially fewer computational resources than larger models.

Our chunk-level scoring strategy — computing pairwise cosine similarities between source and target text chunks of approximately 300 words, then taking the maximum match per source chunk — is motivated by the observation that conversion processes may reorder content (particularly in PDF extraction) while preserving local semantic units.

## 3. Methodology

### 3.1 Dataset Construction

The ConvertBench dataset comprises 500 documents across five content archetypes:

1. **Technical documentation** (n = 100): API references, software manuals, README files
2. **Academic writing** (n = 100): Research abstracts, literature reviews, methodology sections
3. **Business documents** (n = 100): Reports, proposals, meeting minutes
4. **Code-heavy content** (n = 100): Tutorials with embedded code listings
5. **Data-centric content** (n = 100): Documents containing primarily tables and structured data

Source documents are provided in Markdown format. Corresponding HTML, DOCX, PDF, and TXT versions are generated using the FileFlowOne conversion pipeline to establish the test corpus.

### 3.2 SFI Formula

The Semantic Fidelity Index is defined as:

$$\text{SFI} = 0.35 \cdot S_{\text{structural}} + 0.45 \cdot S_{\text{semantic}} + 0.20 \cdot S_{\text{functional}}$$

where each component is normalized to [0, 1].

**Structural score** $S_{\text{structural}}$ is computed as a weighted average of heading, table, and list preservation ratios:

$$S_{\text{structural}} = 0.4 \cdot r_{\text{headings}} + 0.4 \cdot r_{\text{tables}} + 0.2 \cdot r_{\text{lists}}$$

where $r_x = \min(n_x^{\text{target}} / n_x^{\text{source}}, 1.0)$.

**Semantic score** $S_{\text{semantic}}$ is the mean maximum cosine similarity across source text chunks:

$$S_{\text{semantic}} = \frac{1}{|C_s|} \sum_{c \in C_s} \max_{c' \in C_t} \cos(\mathbf{e}(c), \mathbf{e}(c'))$$

**Functional score** $S_{\text{functional}}$ combines link preservation, title/metadata retention, and formula preservation.

### 3.3 Evaluation Protocol

For each source document $d_i$, we generate converted versions $d_i^{(f)}$ for all supported target formats $f$. SFI scores are computed for each (source, target) pair. We report mean SFI, per-dimension means, and grade distributions.

## 4. Results

### 4.1 Overall Score Distribution

Table 1 presents mean SFI scores across conversion pairs.

| Source | Target | N   | Mean SFI | Std  | Grade Modal |
|--------|--------|-----|----------|------|-------------|
| MD     | HTML   | 500 | 0.941    | 0.04 | A           |
| MD     | DOCX   | 500 | 0.883    | 0.06 | A           |
| MD     | TXT    | 500 | 0.912    | 0.05 | A           |
| HTML   | MD     | 500 | 0.876    | 0.07 | A           |
| HTML   | DOCX   | 500 | 0.854    | 0.08 | A           |
| DOCX   | MD     | 500 | 0.821    | 0.09 | B           |
| DOCX   | HTML   | 500 | 0.837    | 0.08 | B           |
| PDF    | MD     | 500 | 0.712    | 0.14 | B           |
| PDF    | HTML   | 500 | 0.698    | 0.15 | B           |
| PDF    | TXT    | 500 | 0.748    | 0.11 | B           |

### 4.2 Semantic Score Dominance

The semantic component explains 71% of total SFI variance (R² = 0.71, p < 0.001), confirming that propositional content preservation is the primary driver of overall fidelity. Structural score variance is largely explained by table count differences, particularly in PDF extraction where table detection relies on heuristic whitespace analysis.

### 4.3 Format-Specific Findings

PDF-source conversions exhibit the highest variance (σ = 0.14) due to inconsistent text layer quality across PDF generators. PDFs produced by browser print-to-PDF retain substantially more extractable text than scanned documents or those produced by legacy typesetting systems.

## 5. Discussion

The SFI framework provides a principled, reproducible method for quantifying conversion quality. Practitioners can use SFI thresholds to gate automated conversion pipelines: for instance, flagging conversions with SFI < 0.55 (grade C or below) for human review.

Future work should address: (1) extension to image-bearing documents where visual content carries semantic weight not captured by text extraction; (2) language-agnostic evaluation beyond English; (3) incorporating reader perception studies to validate that SFI scores correlate with human judgments of fidelity.

## 6. Conclusion

We have introduced the Semantic Fidelity Index, a composite metric for cross-format document conversion quality. Experimental results on the ConvertBench dataset of 500 documents demonstrate that the metric reliably distinguishes high-fidelity conversions (MD→HTML, SFI = 0.94) from lossy ones (PDF→HTML, SFI = 0.70), with semantic similarity accounting for the majority of score variance.

## References

- Broder, A. Z. (1997). On the resemblance and containment of documents. *Compression and Complexity of Sequences*, 21–29.
- Reimers, N., & Gurevych, I. (2019). Sentence-BERT: Sentence embeddings using Siamese BERT-networks. *EMNLP 2019*.
- Salton, G., & McGill, M. J. (1983). *Introduction to Modern Information Retrieval*. McGraw-Hill.
- Wang, W. et al. (2020). MiniLM: Deep self-attention distillation for task-agnostic compression of pre-trained transformers. *NeurIPS 2020*.
- Zhang, K., & Shasha, D. (1989). Simple fast algorithms for the editing distance between trees. *SIAM Journal on Computing*, 18(6), 1245–1262.
