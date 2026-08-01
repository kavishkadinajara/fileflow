                                                                                           # FileFlowOne — Business Proposal

**A privacy-first document intelligence platform that does, for free, the document work people currently pay AI services to do.**

| | |
|---|---|
| **Submitted by** | Kavishka Dinajara |
| **Project type** | Final-Year Project (Business Proposal) |
| **Platform** | Web application — Next.js 14 (App Router) + Python FastAPI |
| **Repository** | github.com/kavishkadinajara/fileflow |
| **Status** | Working prototype, ~30 conversion paths and 4 document-intelligence tools live |
| **Date** | June 2026 |

---

## 1. The one-paragraph version

People hand their documents to cloud tools every day — résumé scanners, PDF editors, summarisers, table extractors — and most of those tools cost money, upload your file to someone else's server, or both. FileFlowOne does the same jobs in the browser and on a local server, charges nothing, and never ships the file to a third party. Underneath the convenience sits the actual contribution: a set of explainable algorithms (not a black-box prompt) that hit the accuracy people expect from paid AI, while staying auditable enough to defend in a dissertation. The business case and the research case point the same direction — there is a real gap in the market *and* a real gap in the literature, and one product fills both.

---

## 2. Problem statement

Three things are wrong with how document tasks get done today.

**It costs money for work that is mostly deterministic.** Jobscan charges around $50 a month to tell you which keywords your CV is missing against a job description. That is a keyword-matching and TF-IDF problem with a scoring rubric on top — it does not need a subscription. The same is true for "PDF to Excel" SaaS, online summarisers behind a ChatGPT Plus paywall, and most "edit your PDF" sites that gate downloads.

**The file leaves your machine.** Almost every popular converter (CloudConvert, Zamzar, Smallpdf, iLovePDF) uploads the document to a remote server. For a CV that is mildly annoying. For a medical record, a legal contract, or a salary slip it is a genuine privacy problem, and it is exactly the kind of processing that GDPR Article 5(1)(c) — data minimisation — was written to discourage.

**The pipeline is "dumb."** A literature survey I conducted across 60+ papers (arXiv, ACM, IEEE, EMNLP, ICLR, 2022–2025) and 20+ commercial tools found something striking: **there is no published metric for measuring how much meaning is lost when a document is converted from one format to another**, no general benchmark for conversion quality, and no tool that combines in-browser AI with format conversion. NLP has BLEU and ROUGE. Information retrieval has NDCG. Document conversion — done billions of times a day — has nothing. (Full analysis: `docs/FileFlowOne_Research_Gap_Report.md`.)

So the user pays, the file leaks, and nobody can even tell them whether the conversion damaged the document. That is the problem FileFlowOne attacks.

---

## 3. The idea

A single web platform with one guiding principle I have started calling **"deterministic core + AI layer."**

Every feature is built around an algorithm I can explain on a whiteboard — a column-projection table reconstructor, a TextRank sentence graph, a skills-taxonomy matcher, a font-matching PDF overlay engine. That core runs with **no API key and no internet call**, so it works offline and cannot hallucinate. On top of it sits an *optional* AI layer that only ever rewrites or polishes what the deterministic core already produced. The LLM is never the source of truth; it is grounded by the algorithm beneath it. This is the difference between "an AI wrapper" and a system, and it is what makes the project defensible as research rather than as a thin front-end over someone's API.

The second principle is **the file does not leave the user.** Conversions run server-side on the user's own deployment (or client-side via WebAssembly for media), and the AI layer is opt-in. Privacy is an architectural property, not a promise on a marketing page.

---

## 4. What already works (prototype status)

This is not a slide deck — most of it is built and verified. The platform currently runs ~30 conversion paths across documents, images, data formats, SQL dialects, and media, plus four document-intelligence tools that are the heart of the value proposition:

### 4.1 PDF Editor — edit a PDF without wrecking it

The thing that breaks every free PDF editor is that editing one word reflows the whole page or changes the font. FileFlowOne ships **five distinct edit modes** so the user picks the right trade-off:

- **Patch original (surgical).** Edit the extracted text; only the words you actually changed get redrawn — in the *original* font, size and colour — and every other pixel stays identical. It works by diffing the edited text against a deterministically reproduced baseline, so an untouched document produces exactly zero changes (an early bug produced 69 spurious table edits; that is fixed and regression-tested).
- **Visual fill-in (WYSIWYG).** The real page is rendered as an image and transparent edit hotspots sit on top, claude.ai-style — you type directly onto form fields and dotted lines, and the download patches the original.
- **Smart Reflow.** A middle ground: every line is loaded as a positioned block keeping its original coordinates, font and colour; edit any block and rebuild with the layout intact.
- **Rebuild.** Reflow the whole document into a clean, freshly styled PDF (with optional auto-generated table of contents, cover page, headers, footers, page numbers).
- **Decorate.** Stamp headers/footers/page numbers onto the original without touching its content.

The overlay engine reads each text span's font family, weight, slant and colour and maps it to a matching base-14 font, so replacements blend in instead of looking pasted on. It even preserves images and table rules during redaction (a naive approach erases them).

### 4.2 Résumé ATS Optimizer — the hero feature

Upload a CV (PDF or DOCX), paste a job description, and get an **explainable** match score in ~23 milliseconds — not a black-box number:

- A curated skills taxonomy (~200 skills + alias resolution: `js → javascript`, `k8s → kubernetes`) matched with boundary-safe rules so `r` inside `react` never falsely matches.
- RAKE keyphrase extraction with a boilerplate filter, so "missing keywords" are real requirements, not hiring-ad fluff.
- TF-IDF cosine similarity between the CV and the job description for topical relevance.
- **ATS parse-ability checks** — the genuinely hard part. A direct central-gutter scan flags multi-column layouts that wreck résumé parsers, plus tables, image-only pages, and contact details hidden in page margins. Each issue comes with a severity and a concrete fix.
- A transparent composite score: `0.38·keywords + 0.27·skills + 0.15·similarity + 0.20·format`, every sub-score visible.

The optional AI layer rewrites the user's *real* bullet points to weave in missing keywords — and is explicitly instructed never to invent experience. This replaces a ~$50/month subscription with an auditable algorithm.

### 4.3 PDF Tables → Excel/CSV

Ruled tables are extracted exactly; borderless tables go through a char-level column-projection reconstructor that rebuilds cells from glyph geometry (cluster rows by baseline, find column gutters where a vertical band is clear in ≥60% of rows, then assign whole words — not characters — to columns so a boundary never splits a token). Columns are type-inferred (int/float/currency/percent/date) and exported as real typed Excel cells so the spreadsheet sums and sorts correctly. A confidence score flags tables that need a human check — tight right-aligned number columns are honestly hard, and the tool says so rather than pretending.

### 4.4 Hybrid Summarizer

An extractive engine runs entirely client-side: it splits sentences (Unicode-aware, abbreviation-protected, and — importantly — handling Sinhala and Tamil combining marks so non-Latin scripts don't shred mid-character), builds a TF-IDF sentence graph, and runs weighted TextRank (PageRank power iteration) to pick the most central sentences. Because it works with no API key, it grounds the optional AI polish — the LLM may only rephrase sentences the algorithm already selected, so it cannot drift into invented facts.

> Each of these four tools is the same pattern: an algorithm with real depth, an honest confidence signal, and an AI layer that is optional and grounded. That repetition is the thesis, demonstrated four times.

---

## 5. What I plan to build next

The research survey laid out twelve open gaps. A solo FYP cannot close twelve, so the roadmap targets the four that are highest-novelty, feasible in the timeline, and that turn the existing prototype into a genuine research contribution.

| Phase | Feature | What it adds | Gap it closes |
|---|---|---|---|
| **A** | **Semantic Fidelity Index (SFI)** | A score that measures how much meaning survives a conversion: structural preservation + embedding similarity of content blocks + functional integrity (links, formulae, metadata). Computed locally with a 22 MB sentence-transformer on CPU. | Gap 1 — *no metric for cross-format semantic preservation exists* |
| **B** | **Privacy-aware adaptive router** | Decides per document whether to process **locally, hybrid, or cloud** using a three-factor signal: a PII/sensitivity score (runs in-browser, zero upload), document complexity, and predicted local-model quality. Sensitive files never leave the machine; the user sees the routing decision and *why*. | Gap 3 — *privacy-aware local↔cloud routing is unstudied* |
| **C** | **In-browser SLM conversion** | A quantised small language model (e.g. Phi-3.5-mini / ReaderLM-v2, INT4) running via WebGPU/WebLLM for the AI layer, so even the optional intelligence stays on-device. ReaderLM-v2 at 1.5B already beats GPT-4o on HTML extraction — capability is no longer the blocker. | Gap 5 — *no tool combines browser AI with format conversion* |
| **D** | **Privacy transparency dashboard** | A live panel showing zero outbound network requests during local processing, model provenance, processing location, and a data-retention confirmation — an exportable audit log a data-protection officer could actually read. | Gaps 7 & 9 — *no formal privacy model / audit framework for document AI* |

Alongside the research track, a **user data layer** gives signed-in users persistence: saved conversion presets, conversion history, and — most useful — a record of past résumé scans so they can watch their ATS score climb over time as they fix the gaps. This is built on a privacy-by-design database that stores metadata and scores but never the documents themselves (detailed in §10). Two further additions are already scoped: a **Document Redline / Compare** tool (reuses the existing diff engine to highlight changes between two versions of a document) and a **round-trip fidelity tracker** built on the SFI to show cumulative loss across A→B→C→A conversions.

---

## 6. Why it is different (competitive positioning)

| Capability | CloudConvert | iLovePDF | Smallpdf | Jobscan | **FileFlowOne** |
|---|:---:|:---:|:---:|:---:|:---:|
| File stays on your machine | ✗ | ✗ | ✗ | ✗ | **✓** |
| Free (no paywalled downloads) | partial | partial | partial | ✗ | **✓** |
| Layout-preserving PDF edit | ✗ | partial | ✗ | — | **✓ (5 modes)** |
| Explainable résumé ATS score | — | — | — | ✓ (paid) | **✓ (free)** |
| Borderless table → typed Excel | partial | ✗ | ✗ | — | **✓** |
| Grounded (non-hallucinating) AI | ✗ | ✗ | ✗ | partial | **✓** |
| Conversion-quality score | ✗ | ✗ | ✗ | — | **✓ (planned, SFI)** |
| Open source (MIT) | ✗ | ✗ | ✗ | ✗ | **✓** |

No competitor combines local processing, an explainable deterministic core, *and* a quality metric. The closest single-purpose tools either charge for it or upload your file to get it.

---

## 7. Who it is for

- **Job seekers** who can't justify a Jobscan subscription but are getting filtered out by ATS software before a human ever reads their CV.
- **Students and researchers** converting between PDF, DOCX, Markdown and LaTeX, who need the structure to survive the trip.
- **Privacy-sensitive professionals** — legal, medical, finance, HR — handling documents that simply should not be uploaded to a random web service.
- **Developers** who want an open-source, self-hostable document toolkit instead of a metered API.

The common thread: people doing real document work who are currently choosing between paying, leaking, or settling for a worse result.

---

## 8. How it makes sense as a sustainable project (the "business" part)

The platform is free to the user and MIT-licensed by design — charging for it would undercut the entire privacy-and-access argument. Viability comes from a different model:

- **Open-source + self-host.** The whole stack runs on a small VPS. Organisations that need an internal, never-leaves-the-building document toolkit can deploy it themselves at zero licensing cost — that is the value, and it is real to a hospital or a law firm.
- **Optional managed/cloud tier.** For users who *want* the cloud AND don't have sensitivity concerns, a hosted version with the heavier cloud models is a natural paid add-on — but always opt-in, never the default, and never required for the core deterministic features.
- **Research and reputation capital.** The novel contributions (SFI, the privacy router) are publishable — the gap report maps each to a target venue (ACM DocEng, EMNLP, ICLR, PoPETs). For a final-year project, that publishability *is* the return: it converts a coursework deliverable into a portfolio piece and a citable contribution.

The honest framing: this is not a product chasing immediate revenue. It is a research-grade open platform whose "business model" is access, privacy, and credibility — with a clearly-defined optional paid lane that never compromises the free core.

---

## 9. Technical foundation (why it is buildable)

| Layer | Technology | Role |
|---|---|---|
| Front-end | Next.js 14 (App Router), TypeScript (strict), Tailwind | UI, client-side conversion, WebAssembly media |
| Document engine | Python FastAPI + PyMuPDF, pdfminer, python-docx, openpyxl | PDF structure, overlay editing, table extraction |
| Deterministic algorithms | TextRank, TF-IDF cosine, RAKE, recursive XY-cut, column projection | The explainable core |
| AI layer (optional) | Multi-provider — Groq / Gemini / OpenAI / DeepSeek, swappable; SLM via WebLLM (planned) | Grounded rewriting and polish |
| Privacy | COOP/COEP headers, local processing, CSP (planned audit dashboard) | File never leaves the user |

The technology timing is good: WebGPU now reaches ~77% of browsers, WebLLM hits ~80% of native inference speed, and sub-2B models already outperform GPT-4o on specific document tasks. The pieces the roadmap depends on are mature enough to ship within an FYP window — which is precisely why this is the moment to build it.

---

## 10. Data layer — a privacy-by-design database

A privacy-first product and a database sound like opposites. They are not — the trick is to be disciplined about *what* the database is allowed to hold. FileFlowOne uses PostgreSQL (via Supabase) to give signed-in users persistence and personalisation, under one strict design rule: **the schema physically cannot store document content.** The privacy guarantee is enforced by the table design, not by a promise.

Five user-facing features sit on this layer, each backed by a properly normalised (3NF) table set with Row-Level Security so a user can only ever touch their own rows:

| Feature | What it stores | What it deliberately does **not** store |
|---|---|---|
| **Saved presets** | A named conversion setting (from → to + options) | — |
| **Conversion history** | Filename, format pair, byte size, timestamp | The file, or any of its text |
| **ATS scoring history** | The four sub-scores + overall + a one-way SHA-256 hash of the job description | The CV, the job-description text |
| **Skill-gap tracking** | Per-scan matched / missing skills (a junction table) | — |
| **Shareable result links** | The output — *only here*, opt-in, with a mandatory expiry | Anything past its TTL (auto-purged) |

The design carries genuine database depth rather than flat CRUD: a normalised junction table (`ats_scan_skills`) turns "which skills has this user kept missing?" into a clean indexed join; an atomic stored procedure writes a scan and its 20–40 skill rows in a single transaction (header-without-details is impossible); cascade deletes keep referential integrity when an account or scan is removed; and a scheduled TTL job purges expired shares so the one place real content lives self-destructs. The full entity-relationship diagram, normalization analysis, and SQL live in `docs/FileFlowOne_Data_Model.md`.

Framed for assessment: this is a *data-minimisation-compliant* schema (GDPR Art. 5(1)(c)) — the database does not weaken the privacy thesis, it demonstrates it at the persistence layer.

---

## 11. Scope and risks (kept honest)

**In scope:** the four document-intelligence tools (done), the SFI metric, the privacy router, browser-SLM inference, and the privacy dashboard.

**Out of scope:** audio/video/image conversion remains as a utility but is excluded from the research evaluation; no SLM fine-tuning (prompt engineering only); no mobile/embedded deployment.

**Known risks, stated plainly:**
- *Borderless table extraction* on tight numeric columns still merges sometimes — Camelot and Tabula struggle here too. Mitigated by the confidence flag telling the user to check.
- *Large documents* exceed cloud-model token limits for the AI layer. Mitigated by chunking and by the SLM roadmap moving that work on-device.
- *In-browser SLM* is constrained by the WebAssembly ~2 GB memory ceiling, which forces INT4 quantisation. The quantisation study in the gap report is exactly about characterising that trade-off, so the risk doubles as a research question.

---

## 12. Summary

FileFlowOne starts from a simple, almost stubborn idea: the everyday document work people pay AI services for is mostly solvable with good algorithms, and it should run on the user's own machine. The prototype already proves the pattern four times over — surgical PDF editing, an explainable résumé scanner, a typed-Excel table extractor, and a grounded summariser — each one a deterministic core with an optional, non-hallucinating AI layer. The roadmap takes that working product and points it at four genuine holes in the research literature, turning a final-year project into something with a publishable contribution and a defensible privacy story.

It is free, it is open, it keeps the file where it belongs, and it can tell you whether the conversion actually worked. As far as the survey could find, nothing else does all four.

---

*Prototype repository and full research gap analysis available on request. Survey scope: 60+ papers and 20+ commercial tools, 2022–2025.*
