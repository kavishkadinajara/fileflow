# FileFlowOne Mid-Viva — Presenter Script + Q&A

---

## HOW TO USE THIS FILE

- The **script** is what you say slide-by-slide. Keep it natural — don't read word-for-word.
- Each slide has a **TIME TARGET** — aim for those to finish in ~15 minutes total.
- The **Q&A** section covers every angle examiners realistically ask at mid-viva.

---

## PRESENTATION SCRIPT

---

### Slide 1 — Title (30 seconds)

"Good morning / afternoon. My project is called FileFlowOne — a privacy-first document intelligence platform. The one-line pitch is: it does, for free and locally, the document work that people currently pay AI services for. I'll show you what that means in practice, where it sits in the research landscape, what's already working, and where I'm going next."

---

### Slide 2 — The Problem (1 minute 30 seconds)

"Let me start with the three problems this project attacks.

First — people pay subscriptions for work that is fundamentally algorithmic. Jobscan charges about fifty dollars a month to tell you which keywords are missing from your CV compared to a job description. That's keyword matching and TF-IDF scoring with a scoring rubric on top. It doesn't need a subscription — it needs a good implementation.

Second — the file leaves your machine. Almost every popular converter — CloudConvert, Zamzar, iLovePDF — uploads your document to a remote server. For a CV, that's mildly annoying. For a medical record, a legal contract, or a salary slip, it's a genuine privacy problem. GDPR Article 5(1)(c) — data minimisation — exists precisely because of this pattern.

Third — and this is the research contribution — nobody measures conversion quality. I ran a survey across sixty-plus papers from arXiv, ACM, IEEE, EMNLP, and ICLR, spanning 2022 to 2025, plus twenty-plus commercial tools. There is no published metric for how much meaning survives when a document moves from one format to another. NLP has BLEU and ROUGE. Information retrieval has NDCG. Document conversion — done billions of times every day — has nothing. That gap is what the research side of this project targets."

---

### Slide 3 — The Core Idea (1 minute)

"The answer to all three problems is one design principle I've been calling 'deterministic core plus AI layer.'

Every feature in FileFlowOne is built around an algorithm I can explain on a whiteboard — a column-projection table reconstructor, a TextRank sentence graph, a skills-taxonomy matcher, a font-matching PDF overlay engine. That core runs with no API key and no internet call. It works offline. It cannot hallucinate.

On top of it sits an optional AI layer — but the LLM is only ever allowed to rewrite or polish what the algorithm already produced. It's grounded. It can't invent facts because the algorithm has already established them.

And the file never leaves the user's machine. Conversions run server-side on the user's own deployment, or client-side via WebAssembly for media. Privacy is an architectural property — not a checkbox in a terms-of-service page."

---

### Slide 4 — What's Built (1 minute)

"So what's actually working today? The platform runs thirty-plus conversion paths across documents, images, data formats, SQL dialects, and media. On top of that sit four document-intelligence tools that are the real contribution.

I'll highlight the numbers: four tools live, five PDF edit modes, ATS scoring in about twenty-three milliseconds. These aren't planned — they're running.

Let me walk through each tool briefly, then go deeper on the two most interesting ones."

---

### Slide 5 — PDF Editor Deep Dive (2 minutes)

"The PDF editor is the thing that breaks most free tools. If you edit one word in a typical PDF editor, the whole page reflows or the font changes. FileFlowOne ships five distinct edit modes so the user picks the right trade-off.

Visual fill-in is the headline UX — the real page renders as an image, and transparent edit hotspots sit on top. You type directly onto form fields and dotted lines, exactly like the actual document. Download patches the original — the background is pixel-identical.

Surgical patch is the most technically interesting: the user edits the extracted text, I diff the edited version against the original using difflib's SequenceMatcher, and then only the words that actually changed get redrawn — in the original font, size and colour. An untouched document produces exactly zero changes. I had a bug early on where a table-heavy PDF produced sixty-nine spurious changes. That's fixed and regression-tested.

Smart Reflow is the middle ground: every line loads as an absolute-positioned block keeping its original coordinates and font. Edit any block, rebuild with the layout intact.

The overlay engine itself reads each text span's font family, weight, slant, and colour — maps it to a matching base-14 PDF font — so replacements blend in rather than look pasted on. Images and table borders survive redaction because I pass explicit flags to PyMuPDF to preserve graphics."

---

### Slide 6 — ATS Optimizer Deep Dive (2 minutes)

"The ATS Resume Optimizer is the hero feature — and the most commercially interesting, because it directly replaces a fifty-dollar monthly subscription.

Upload a CV — PDF or DOCX — paste a job description, and get an explainable match score in about twenty-three milliseconds. The score has four components, each visible: thirty-eight percent from keyword match, twenty-seven from skills match, fifteen from TF-IDF cosine similarity, and twenty from format score.

The skills component uses a curated taxonomy of about two hundred skills with alias resolution — so 'js' resolves to 'javascript', 'k8s' to 'kubernetes' — and boundary-safe matching so the letter 'r' inside the word 'react' doesn't falsely trigger.

The most technically interesting part is the parse-ability check — which is genuinely novel. I do a direct central-gutter scan: merge all text span intervals horizontally, look for a wide gap in the central twenty to eighty percent band, check that at least four lines exist on both sides with sufficient vertical overlap. That flags multi-column layouts that wreck ATS parsers — which is the actual reason candidates with good CVs get filtered out before a human ever reads them.

The optional AI layer rewrites the user's real bullet points to weave in missing keywords — and is explicitly instructed never to invent experience. That instruction is in the system prompt, not just the documentation."

---

### Slide 7 — Tables + Summarizer (1 minute 30 seconds)

"The PDF Tables extractor handles both ruled and borderless tables. Ruled tables are exact via PyMuPDF's line detection. The hard case is borderless — think academic papers or financial statements with no visible grid lines.

My approach is a character-level column-projection reconstructor: I get per-character bounding boxes from PyMuPDF's raw dict, cluster rows by baseline, then scan vertical bands to find gutters — positions where at least sixty percent of rows have a clear gap. I then assign words — not individual characters — to columns by their centre point. The word-level assignment means a column boundary never splits a token, which is the failure mode that makes other tools merge tight numeric columns.

The Hybrid Summarizer runs entirely client-side with no API key — TextRank over a TF-IDF sentence graph, with a Unicode-aware sentence splitter that correctly handles Sinhala and Tamil combining marks. The AI polish step is grounded: the LLM may only rephrase sentences the algorithm already selected, so it cannot drift into invented facts."

---

### Slide 8 — Competition (45 seconds)

"Here's where FileFlowOne sits relative to the main tools in this space. The key insight from this table is the intersection: no single competitor combines local processing, an explainable deterministic core, and a conversion quality metric. The closest single-purpose tools either charge for the feature or upload your file to get it. FileFlowOne is the only tool in that intersection — and the Semantic Fidelity Index I'm building next will be the first published metric for that intersection."

---

### Slide 9 — Research Gap (1 minute)

"Let me be specific about the research contribution, because that's what makes this defensible as an FYP rather than just a product.

The survey I ran across sixty-plus papers found twelve open gaps. I've mapped four of them to planned features. Gap one — no metric for cross-format semantic preservation — becomes the Semantic Fidelity Index. Gap three — privacy-aware local-cloud routing is unstudied — becomes the adaptive privacy router. Gap five — no tool combines browser AI with format conversion — becomes the in-browser SLM via WebLLM. Gaps seven and nine — no formal privacy model or audit framework for document AI — become the privacy transparency dashboard.

Each of these is a novel contribution in a specific, citable venue. The gap report maps each one to a target — ACM DocEng, EMNLP, PoPETs."

---

### Slide 10 — Roadmap (1 minute)

"The roadmap has four phases.

Phase A — the Semantic Fidelity Index — is the highest priority and the most novel. It measures structural preservation, embedding similarity of content blocks, and functional integrity — links, formulae, metadata — using a twenty-two megabyte sentence-transformer running locally on CPU. No cloud call needed.

Phase B — the privacy-aware adaptive router — decides per-document whether to process locally, hybrid, or cloud, using a PII sensitivity score that runs in-browser before anything is sent anywhere.

Phase C — in-browser SLM — puts a quantised small language model via WebLLM on the device. ReaderLM-v2 at one-point-five billion parameters already beats GPT-4o on HTML extraction, which shows that capability is no longer the blocker.

Phase D — the privacy dashboard — gives users and data protection officers an exportable audit log of exactly what happened to their document and where."

---

### Slide 11 — Data Layer (1 minute)

"The database is worth a dedicated slide because adding persistence to a privacy-first product is a genuine design challenge — and I think my solution is interesting.

The design rule is: the schema physically cannot store document content. Conversion history stores a filename, format pair, size, and timestamp — never the file bytes or its text. ATS scan history stores the four sub-scores and a one-way SHA-256 hash of the job description — never the CV, never the JD text. Shared results are the one exception — they hold actual output — but only when the user opts in, with a mandatory expiry, and they're auto-purged by pg_cron every fifteen minutes.

The database also demonstrates genuine depth: Third Normal Form normalisation with the ATS skill rows in a junction table so per-skill gap tracking is a clean indexed join. Row-Level Security on every table. Atomic stored procedures so a scan and its twenty-to-forty skill rows are always inserted together or not at all. GDPR Article 5(1)(c) — data minimisation — compliant by design."

---

### Slide 12 — Tech Stack (30 seconds)

"The stack is Next.js 14 on the front-end with strict TypeScript and Tailwind, a Python FastAPI backend using PyMuPDF and openpyxl for document processing, and PostgreSQL via Supabase for the data layer. The AI layer is multi-provider — Groq, Gemini, OpenAI, DeepSeek — and swappable via an environment variable. The timing is good: WebGPU now reaches about seventy-seven percent of browsers, which means the in-browser SLM in Phase C is buildable today."

---

### Slide 13 — Closing (30 seconds)

"To close: FileFlowOne proves the 'deterministic core plus AI layer' pattern four times over — PDF editing, ATS scanning, table extraction, and summarisation. The roadmap takes that working prototype and points it at four genuine holes in the research literature. The file stays where it belongs, the algorithm is explainable, and the system can actually tell you whether the conversion worked. I'm happy to take questions."

---

---

## VIVA Q&A — Expected Questions + Strong Answers

---

### CATEGORY 1: Project Motivation & Problem

**Q: Why is privacy a research problem and not just a product feature?**

A: Because the literature doesn't have a privacy model for this domain. Existing tools treat privacy as a policy statement — 'we delete your file after 24 hours.' FileFlowOne treats it as an architectural property enforced at three levels: the network level (COOP/COEP headers, no outbound call during local processing), the processing level (conversions run on the user's own deployment), and the database level (the schema is physically unable to store document content). Gap 7 and Gap 9 in my survey confirm this gap — there is no formal privacy model or audit framework for document AI tools. The privacy transparency dashboard in Phase D is intended to fill that gap with a citable contribution.

---

**Q: Couldn't users just use ChatGPT or Copilot for all of these tasks?**

A: Three reasons they can't. First, every file you send to ChatGPT or Copilot leaves your machine — that disqualifies it for legal, medical, and HR use cases immediately. Second, LLMs hallucinate. My extractive summariser returns only sentences that actually appear in the document. My ATS score is computed from a deterministic algorithm with an auditable formula — there's no hallucination risk. Third, quality is unmeasured. Neither tool tells you whether the conversion preserved the meaning. The Semantic Fidelity Index I'm building in Phase A is literally the first published metric for that question.

---

### CATEGORY 2: Technical Depth

**Q: Your ATS scoring formula has specific weights — 0.38, 0.27, 0.15, 0.20. How did you arrive at those?**

A: I reviewed how commercial ATS systems prioritise signals in the literature — keyword density is consistently the strongest predictor of whether a CV passes automated filtering, which justifies the highest weight. Skills taxonomy matching is the next strongest single signal. TF-IDF cosine similarity catches topical alignment that isn't captured by exact-match keywords. Format score is real but less decisive — a badly formatted CV can still pass if the keywords are right. The weights sum to one, every sub-score is visible to the user, and the system is designed to be recalibrated if empirical testing shows different weights perform better. That calibration study is actually a planned extension to Phase A.

---

**Q: What's the difference between your PDF editor and just using iLovePDF or Adobe Acrobat?**

A: Three specific differences. First, layout preservation: Acrobat's text edit tool reflows the paragraph when you change a word. My surgical patch mode only redraws the exact changed characters, in the original font, size and colour — the rest of the page is pixel-identical. Second, form fill accuracy: iLovePDF's visual editor overlays opaque white boxes over the original — you're editing a copy of the text, not the document. My visual fill-in mode renders the real page as a PNG image and places transparent hotspots on top — you're always reading the actual document. Third, it runs on your own deployment. No file upload.

---

**Q: How does the column-projection table reconstructor handle merged header cells?**

A: This is actually a genuine hard case. The algorithm scans for column gutters — vertical bands that are clear in at least sixty percent of rows. A spanning header cell occupies multiple columns, so it appears across multiple gutter positions. Because the threshold is sixty percent (not one hundred), a header that spans two columns still allows the gutter between those columns to be detected from the body rows below, where the cells are separate. I assign words to columns by their centre point, so a header word that spans columns just lands in whichever column its centre falls in — which is usually the leftmost, which is a known limitation I flag in the confidence score.

---

**Q: Your TextRank summariser — is there anything novel about it compared to the published TextRank algorithm?**

A: Three things. First, the Unicode-aware sentence splitter that correctly handles Sinhala and Tamil combining marks — this is necessary because `\b` word boundaries in Python regex don't recognise Unicode combining characters, so a naive splitter shreds mid-character on non-Latin scripts. Second, the markdown pre-cleaning step strips GFM syntax before ranking — without this, heading markers and table separators contaminate the TF-IDF vectors and inflate the importance of structural tokens. Third, the grounding constraint: the AI polish step is explicitly constrained to the extractive summary, so the LLM cannot introduce facts from its training data. That's architecturally different from summarisers that just call an LLM on the full text.

---

**Q: Why use PyMuPDF over PDFMiner or pdfplumber for the PDF processing?**

A: For different subtasks I actually use both. PDFMiner is kept as a fallback for text extraction on documents where PyMuPDF's structure engine struggles. But PyMuPDF (fitz) is the primary engine for three reasons: first, it gives per-character bounding boxes via get_text('rawdict'), which is what the column-projection reconstructor and the font-matching overlay engine both need — PDFMiner doesn't expose that level of geometry. Second, PyMuPDF supports redaction with explicit graphics preservation flags (PDF_REDACT_IMAGE_NONE, PDF_REDACT_LINE_ART_NONE), which is what lets the overlay editor preserve logos and table borders during edits. Third, page rendering to PNG for the visual editor — PyMuPDF's get_pixmap is significantly faster than Poppler-based alternatives.

---

### CATEGORY 3: Research Contribution

**Q: What makes the Semantic Fidelity Index a novel contribution? Couldn't you just compare the text before and after conversion?**

A: Text comparison alone misses two critical failure modes. First, structural information: a document with three H1 headings converted to a flat paragraph preserves the text but loses the structure — a reader can no longer navigate it. Second, functional elements: hyperlinks, formula values, and embedded metadata are semantically meaningful but invisible to a diff. The SFI combines three components — structural preservation (heading hierarchy, list structure), embedding similarity of content blocks (to catch semantic drift even when the words are the same), and functional integrity (links, formulae, metadata survive). No existing metric combines all three for cross-format conversion. That combination is the novelty, and it's what makes it publishable at a venue like ACM DocEng.

---

**Q: Your survey identified twelve gaps. Why did you pick these four for the roadmap and not others?**

A: Three selection criteria. First, novelty: these four had no direct published treatment in the sixty-plus papers I reviewed — others had partial coverage. Second, feasibility within a final-year project window: the SFI uses a twenty-two megabyte sentence-transformer that runs on CPU, so there's no GPU requirement. The in-browser SLM depends on WebLLM, which is production-ready as of 2024. Third, internal coherence: all four connect directly to the existing prototype. The SFI plugs into the conversion pipeline I've already built. The privacy router and dashboard extend the privacy architecture that's already in the data layer. Building orthogonal features would dilute the thesis.

---

**Q: How is this different from existing document format conversion research like Apache Tika or Pandoc?**

A: Tika and Pandoc are conversion engines — they transform documents between formats. Neither one measures the quality of the conversion, neither one combines conversion with AI-assisted editing, and neither one has a privacy model. The research contribution of FileFlowOne isn't the conversion itself — those conversion paths use well-established libraries. The contribution is the SFI (measuring conversion quality for the first time), the privacy router (deciding where to process based on document sensitivity), and the grounded AI pattern (an LLM that cannot hallucinate because the deterministic algorithm establishes the facts). These are orthogonal to what Tika and Pandoc do.

---

### CATEGORY 4: Database / Data Layer

**Q: If you're storing ATS scan results, can't someone reconstruct the CV from the stored data?**

A: No, by design. The schema stores only four numeric scores (each between 0 and 100), a one-way SHA-256 hash of the job description, and two lists of skill names from a fixed taxonomy of about two hundred items. You cannot reconstruct a CV from an overall score of 73 and a list of matched skills that says 'Python, SQL, Docker.' The junction table stores skill names like 'python' and 'kubernetes' — those come from my fixed taxonomy, not extracted from the CV text. The CV itself is processed in memory and discarded.

---

**Q: Why use a junction table for ATS skill rows instead of a JSON column?**

A: Three reasons. First, query efficiency: the query 'which skills has this user been missing across their last five scans' is a single indexed join and aggregate on the junction table — it's a table scan plus JSON parsing on a JSON column, and it doesn't benefit from indexing on individual skill values. Second, constraint enforcement: I can put a foreign key and a check constraint on the junction table rows — I can't meaningfully constrain the contents of a JSON blob. Third, it demonstrates genuine normalisation for assessment: the junction table is the canonical third-normal-form pattern for a many-to-many relationship, and it shows I understand why normalisation exists rather than just reaching for JSONB by default.

---

**Q: Why Supabase specifically instead of a raw PostgreSQL instance?**

A: Two reasons. First, Row-Level Security: Supabase exposes RLS as a first-class feature with the `auth.uid()` function built into policy definitions — this lets me write a policy like `user_id = auth.uid()` directly on the table, and it's enforced at the database level, not the application level. That means a bug in the API layer cannot accidentally expose another user's data. Second, pg_cron is available as an extension in Supabase, which is what I use for the fifteen-minute TTL purge of expired shared results. A raw Postgres instance would need a separate cron job and a connection credential, which adds operational complexity for what is still a solo project.

---

### CATEGORY 5: Business Case

**Q: If it's MIT licensed and free, what is the business model? How is this sustainable?**

A: The honest answer is that sustainability comes from three directions that don't require charging users. First, self-hosted deployment: a hospital or law firm that needs a never-leaves-the-building document toolkit can deploy FileFlowOne on their own VPS at zero licensing cost — the value is the privacy guarantee, not the software itself. Second, an optional managed cloud tier: users who want the cloud and don't have sensitivity concerns can pay for a hosted version with heavier models, but this is always opt-in and never required for the deterministic features. Third, research and reputation capital: the SFI and privacy router are publishable — a citable FYP is worth more than a free product to an academic career. I've been explicit in the proposal that this isn't a product chasing immediate revenue — it's a research-grade open platform.

---

**Q: The free tier competes with paid services. Won't they just add these features and undercut you?**

A: On the conversion features, yes — any well-funded team can replicate format conversion. But the research contribution is harder to replicate quickly: the SFI requires empirical validation across conversion pairs to be publishable. The privacy router requires a PII detection model that runs in-browser, which is a non-trivial engineering problem. And the open-source MIT licence is itself a moat — a commercial competitor can't charge for FileFlowOne without forking it, at which point the community has the original. The more honest answer is that for a final-year project, commercial defensibility isn't the primary goal — demonstrating a novel research contribution is. The business model section of the proposal exists to show I understand commercial context, not to make a startup pitch.

---

### CATEGORY 6: Project Management / FYP Process

**Q: What's the current biggest risk to completing the roadmap on time?**

A: The in-browser SLM in Phase C has the most external dependency risk. WebLLM is production-ready, but a quantised model running in the browser is constrained by the WebAssembly two-gigabyte memory ceiling, which forces INT4 quantisation. If the accuracy at INT4 is insufficient for the use cases I'm targeting, Phase C becomes a characterisation study — demonstrating the trade-off empirically — rather than a shipped feature. That outcome is actually fine academically because the quantisation trade-off is itself a research question. The SFI in Phase A has no external dependency risk because it runs a local sentence-transformer with no API call.

---

**Q: How did you validate the algorithms you've built?**

A: Each algorithm has a specific regression test suite. For the PDF editor: I have five fixture PDFs covering different layouts (business report, academic paper, table-heavy, minimal, form) and I verify that an untouched document produces zero patches. For the ATS scorer: I verified that a multi-column CV is correctly flagged for parse-ability issues and a single-column CV is not, and I verified that alias resolution works correctly for a set of known aliases. For the summariser: I tested against documents in English, Sinhala, and Tamil, and edge cases (empty document, one sentence, two sentences, document with an unclosed markdown code fence). For the table extractor: I have seven fixture PDFs covering ruled tables, borderless tables, zero-table documents, and the specific tight-numeric-column case that's the known hard failure mode.

---

**Q: What would you do differently if you were starting the project again?**

A: Two things. First, I would build the Semantic Fidelity Index earlier — ideally as part of the initial conversion pipeline — so that every subsequent conversion path could be validated against it from day one. Building it late means I can't retroactively measure whether my earlier conversions were semantically correct. Second, I would write the gap report before building the prototype rather than after. The research direction would have shaped the feature prioritisation — I would have built fewer conversion paths and invested that time in the SFI and the privacy router, which are the genuinely novel contributions.

---

*End of script and Q&A.*
