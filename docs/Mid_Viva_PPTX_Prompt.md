# FileFlowOne Mid-Viva — PPTX Generation Prompt

Paste this entire prompt into claude.ai to generate the presentation.

---

## PROMPT (copy from here)

Create a professional PowerPoint presentation (.pptx) for a university mid-viva examination. The presentation is for a final-year Computer Science project called **FileFlowOne**. It must look polished, unique, and defensible in front of examiners and lecturers.

---

### DESIGN BRIEF

Do NOT use the default Claude template. Design a unique slide deck with this visual identity:

- **Theme name:** "Deterministic Dark" — a deep dark background (#0F1117) with a subtle grid or circuit-board texture overlay at 5% opacity
- **Accent colour 1:** Electric blue (#3B82F6) — for headings, icons, key numbers
- **Accent colour 2:** Cyan-green (#10B981) — for "achieved / live" badges, check marks, positive metrics
- **Warning accent:** Amber (#F59E0B) — for "planned / next phase" labels only
- **Body text:** #E2E8F0 on dark backgrounds; #1E293B on any light inset box
- **Heading font:** Inter or Poppins, Bold, 28–36pt
- **Body font:** Inter or Poppins, Regular, 16–18pt
- **Slide size:** 16:9 widescreen
- **Layout principle:** Every slide has a thin 3px electric-blue left-border accent bar. Important numbers/metrics are displayed in large (48–60pt) bold blue/cyan pull-quote style. Never put more than 5 bullet points on one slide — split if needed.
- **Slide numbering:** Bottom-right corner, small, grey
- **Logo placeholder:** Top-left corner on every slide: a small text badge "FileFlowOne" in Inter Bold, electric blue, with a tiny blue lightning bolt icon to the left

---

### SLIDE CONTENT (generate exactly these slides in this order)

---

#### SLIDE 1 — Title Slide

**Layout:** Full-bleed dark background, centered content, no left border bar on this slide only.

- Giant heading (56pt, white): **FileFlowOne**
- Subheading (24pt, electric blue): *A Privacy-First Document Intelligence Platform*
- Tagline (18pt, #94A3B8): "Convert. Edit. Analyse. Never leave your machine."
- Bottom strip (small, grey):
  - Presented by: **Kavishka Dinajara**
  - Mid-Viva Examination · June 2026
  - Final Year Project — BSc Computer Science

---

#### SLIDE 2 — The Problem (Why This Exists)

**Layout:** Left-border bar. Two-column layout: left = headline + three numbered problem cards; right = visual quote block.

**Slide title:** The Problem

**Three problem cards (each a dark inset box with a numbered icon):**

1. **You Pay for Maths**
   "Jobscan charges ~$50/month for keyword matching and TF-IDF scoring. That is not AI — it is an algorithm with a subscription on top."

2. **Your File Leaves Your Machine**
   "CloudConvert, Zamzar, iLovePDF — every popular converter uploads your document to a remote server. For a CV, that is annoying. For a medical record or legal contract, it is a privacy violation."

3. **Nobody Measures Conversion Quality**
   "A survey of 60+ papers (arXiv, ACM, IEEE, 2022–2025) and 20+ tools found zero published metric for how much meaning is lost when a document is converted. Billions of conversions per day — zero quality benchmarks."

**Right column quote block (large, electric blue border, cyan text):**
> "The user pays. The file leaks. And nobody can even tell them whether the conversion damaged their document."

---

#### SLIDE 3 — The Core Idea

**Layout:** Left-border bar. Full-width slide with a single bold central concept + three supporting pillars below.

**Slide title:** One Guiding Principle

**Central pull-quote (48pt, electric blue, centered):**
**"Deterministic Core + AI Layer"**

**Three pillars (horizontal cards below the quote):**

| Pillar | Description |
|---|---|
| **Explainable Algorithm First** | Every feature is built around an algorithm you can draw on a whiteboard — TextRank, TF-IDF, column-projection, font-matching overlay. No API key needed. |
| **AI as Polish, Not Source of Truth** | The LLM only rewrites or polishes what the algorithm already produced. It is grounded — it cannot hallucinate because it has nothing to invent. |
| **File Stays On Your Machine** | All conversions run server-side on the user's own deployment, or client-side via WebAssembly for media. Privacy is an architectural property. |

---

#### SLIDE 4 — What's Built (Status Overview)

**Layout:** Left-border bar. Dashboard-style with a large metric strip at top and feature grid below.

**Slide title:** Current Status — Working Prototype

**Top metric strip (4 numbers in large bold blue/cyan pull-quote boxes):**
- **30+** Conversion Paths Live
- **4** Document-Intelligence Tools Live
- **~23ms** ATS Score Computation
- **5** PDF Edit Modes

**Feature grid (2×2 boxes, each with a cyan "LIVE" badge):**

1. **PDF Editor** — 5 distinct edit modes: Visual fill-in, Surgical patch, Smart Reflow, Rebuild, Decorate. Pixel-identical results.
2. **ATS Resume Optimizer** — Explainable score replacing $50/mo Jobscan. Skills taxonomy, RAKE keyphrases, TF-IDF similarity, parse-ability checks.
3. **PDF Tables → Excel** — Borderless table reconstructor using glyph-geometry column projection. Typed Excel cells (sums, sorts correctly).
4. **Hybrid Summarizer** — Extractive TextRank runs client-side with zero API key. AI polish is grounded by the extractive output.

---

#### SLIDE 5 — Feature Deep-Dive: PDF Editor

**Layout:** Left-border bar. Left side = 5-mode table; Right side = "How it's different" callout box.

**Slide title:** PDF Editor — 5 Edit Modes, No Layout Damage

**Left: Modes table (each row with a mode badge):**

| Mode | What it does |
|---|---|
| Visual Fill-in | Real page rendered as image, transparent edit hotspots on top — fill forms like the actual document |
| Surgical Patch | Diff edited text vs original; only changed words redrawn in original font/size/colour. Zero spurious changes. |
| Smart Reflow | Every line loaded as an absolute-positioned block keeping original coordinates. Edit any block, rebuild with layout intact. |
| Rebuild | Reflow full document into a freshly styled PDF with auto TOC, cover page, headers, footers |
| Decorate | Stamp headers/footer/page numbers on original without touching its content |

**Right callout box (cyan border, dark background):**
"The overlay engine reads each text span's font family, weight, slant, and colour — maps it to a matching base-14 font — so replacements blend in rather than look pasted on. Even images and table borders survive redaction."

---

#### SLIDE 6 — Feature Deep-Dive: ATS Resume Optimizer

**Layout:** Left-border bar. Score breakdown on left, "What it replaces" comparison on right.

**Slide title:** ATS Resume Optimizer — Explainable, Free, ~23ms

**Left: Score formula (display as a visual formula card):**

Overall Score = **0.38** × Keyword Match
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ **0.27** × Skills Match
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ **0.15** × TF-IDF Similarity
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ **0.20** × Format Score

*Every sub-score is visible. No black box.*

**Below formula — 4 algorithm badges:**
- Skills Taxonomy: ~200 curated skills + alias resolution (js→javascript, k8s→kubernetes)
- RAKE Keyphrases: boilerplate-filtered (drops "strong communication skills" fluff)
- TF-IDF Cosine: topical relevance, CV vs job description
- Parse-ability: direct central-gutter scan for multi-column layouts that wreck ATS parsers

**Right comparison card:**

| | Jobscan | FileFlowOne |
|---|---|---|
| Cost | ~$50/month | Free |
| Explainable? | No | Yes |
| File uploaded? | Yes | No |
| Open source? | No | MIT |

---

#### SLIDE 7 — Feature Deep-Dive: PDF Tables + Summarizer

**Layout:** Left-border bar. Two halves side by side.

**Slide title:** PDF Tables → Excel · Hybrid Summarizer

**Left half — PDF Tables:**
Title badge: "PDF Tables → Excel"
- Ruled tables extracted exactly via line detection
- Borderless tables: **character-level column-projection reconstructor** — clusters rows by baseline, finds column gutters where a vertical band is clear in ≥60% of rows, assigns whole words (not characters) to columns so a boundary never splits a token
- Type inference: int / float / currency / percent / date — real typed Excel cells
- Confidence score: flags tables that need a human check (honest about hard cases)

**Right half — Hybrid Summarizer:**
Title badge: "Hybrid Summarizer"
- Extractive engine (TextRank over TF-IDF sentence graph) runs **client-side, zero API key**
- Unicode-aware sentence splitter: handles Sinhala and Tamil combining marks
- AI polish is **grounded**: LLM can only rephrase sentences the algorithm already selected — cannot drift into invented facts
- Supports English, Sinhala, Tamil detection

---

#### SLIDE 8 — Why This Is Different (Competition)

**Layout:** Left-border bar. Comparison table as centrepiece, with a "unique intersection" callout below.

**Slide title:** No Competitor Does All Four

**Full-width comparison table:**

| Capability | CloudConvert | iLovePDF | Smallpdf | Jobscan | **FileFlowOne** |
|---|:---:|:---:|:---:|:---:|:---:|
| File stays on machine | ✗ | ✗ | ✗ | ✗ | ✅ |
| Free, no paywalled downloads | partial | partial | partial | ✗ | ✅ |
| Layout-preserving PDF edit | ✗ | partial | ✗ | — | ✅ (5 modes) |
| Explainable ATS score | — | — | — | ✓ (paid) | ✅ (free) |
| Borderless table → typed Excel | partial | ✗ | ✗ | — | ✅ |
| Grounded (non-hallucinating) AI | ✗ | ✗ | ✗ | partial | ✅ |
| Conversion quality score | ✗ | ✗ | ✗ | — | ✅ (planned, SFI) |
| Open source (MIT) | ✗ | ✗ | ✗ | ✗ | ✅ |

**Below table callout (amber border):**
"No competitor combines local processing + explainable deterministic core + a conversion quality metric. FileFlowOne is the only tool in the intersection."

---

#### SLIDE 9 — The Research Gap

**Layout:** Left-border bar. Two-part layout: top = the gap statement; bottom = 4 gap cards.

**Slide title:** A Real Research Gap, Not Just a Product

**Top statement (large, electric blue):**
"A survey of 60+ papers (arXiv, ACM, IEEE, EMNLP, ICLR, 2022–2025) and 20+ commercial tools found **no published metric** for how much meaning survives a document format conversion."

**Sub-statement (white, smaller):**
"NLP has BLEU and ROUGE. Information retrieval has NDCG. Document conversion — done billions of times daily — has nothing."

**Four gap cards (in a horizontal row):**

1. **Gap 1** — No metric for cross-format semantic preservation → FileFlowOne proposes the **Semantic Fidelity Index (SFI)**
2. **Gap 3** — Privacy-aware local↔cloud routing is unstudied → **Adaptive Privacy Router**
3. **Gap 5** — No tool combines browser AI with format conversion → **In-browser SLM (WebLLM)**
4. **Gaps 7+9** — No privacy audit framework for document AI → **Privacy Transparency Dashboard**

---

#### SLIDE 10 — Roadmap (Next Phases)

**Layout:** Left-border bar. Four-phase timeline, horizontal, with status badges.

**Slide title:** What Comes Next — 4 Research Phases

**Four phase cards in horizontal timeline (arrow connecting them):**

**Phase A — Semantic Fidelity Index (SFI)**
Badge: [NEXT]
"A score measuring how much meaning survives a format conversion: structural preservation + embedding similarity + functional integrity (links, formulae, metadata). Runs locally with a 22 MB sentence-transformer."
Gap closed: Gap 1 — no cross-format quality metric

**Phase B — Privacy-Aware Adaptive Router**
Badge: [PLANNED]
"Decides per document whether to process locally, hybrid, or cloud using a PII sensitivity score (runs in-browser), document complexity, and predicted local-model quality. User sees the routing decision and why."
Gap closed: Gap 3 — local↔cloud routing

**Phase C — In-Browser SLM**
Badge: [PLANNED]
"Quantised small language model (Phi-3.5-mini / ReaderLM-v2, INT4) via WebGPU/WebLLM. ReaderLM-v2 at 1.5B already beats GPT-4o on HTML extraction. Even the AI layer stays on-device."
Gap closed: Gap 5 — browser AI + conversion

**Phase D — Privacy Dashboard**
Badge: [PLANNED]
"Live panel: zero outbound network requests, model provenance, processing location, data retention confirmation. Exportable audit log a data-protection officer can actually read."
Gap closed: Gaps 7+9 — no privacy audit framework

---

#### SLIDE 11 — Data Layer (Privacy-by-Design DB)

**Layout:** Left-border bar. Left = ER diagram (simplified); Right = design rule + table list.

**Slide title:** Database — Privacy Enforced at the Schema Level

**Left: Simplified ER diagram (text/ASCII-art style):**
```
auth.users (1)
   ├──(N) user_presets        → saved conversion settings
   ├──(N) conversion_history  → filename, format, size, timestamp (NO file content)
   ├──(N) ats_scans           → 4 sub-scores + SHA-256 hash of JD (NO CV, NO JD text)
   │        └──(N) ats_scan_skills  → per-skill matched/missing (junction, 3NF)
   └──(N) shared_results      → opt-in only, mandatory expiry, auto-purged
```

**Right: Design rule box (cyan border):**
"The schema physically cannot store document content. The privacy guarantee is enforced by table design — not by a policy we ask users to trust."

**Three depth signals (small cards):**
- **3NF normalisation** — skills in junction table, not comma-separated blobs
- **Row-Level Security** on every table — users see only their own rows
- **Atomic transactions** — ATS scan + its 20-40 skill rows inserted together or not at all
- **TTL auto-purge** — shared content self-destructs via pg_cron every 15 minutes
- **GDPR Art. 5(1)(c)** — data minimisation compliant by design

---

#### SLIDE 12 — Tech Stack

**Layout:** Left-border bar. Clean grid of technology cards.

**Slide title:** Technical Foundation

**Technology grid (3 columns × 3 rows):**

| Layer | Technology | Role |
|---|---|---|
| Front-end | Next.js 14 (App Router), TypeScript strict, Tailwind CSS | UI, client-side conversion, WebAssembly media |
| Document engine | Python FastAPI + PyMuPDF, pdfminer, python-docx, openpyxl | PDF structure, overlay editing, table extraction |
| Deterministic algorithms | TextRank, TF-IDF cosine, RAKE, recursive XY-cut, column-projection | The explainable core — no API key required |
| AI layer (optional) | Multi-provider: Groq / Gemini / OpenAI / DeepSeek, swappable | Grounded rewriting — never the source of truth |
| Database | PostgreSQL via Supabase, RLS, pg_cron | Privacy-by-design persistence |
| Privacy | COOP/COEP headers, local processing, CSP audit (planned) | File never leaves the user |

**Bottom note (amber, small):**
"WebGPU now reaches ~77% of browsers. WebLLM hits ~80% of native inference speed. The technology the roadmap depends on is mature enough to ship within the FYP window."

---

#### SLIDE 13 — Summary / Closing

**Layout:** Full-width, slightly lighter background panel, centered content.

**Slide title:** In One Paragraph

**Large quote (24pt, white, centered, italic):**
*"FileFlowOne starts from a simple idea: the everyday document work people pay AI services for is mostly solvable with good algorithms — and it should run on the user's own machine. Four tools prove the pattern. Four research phases point it at genuine holes in the literature. The file stays where it belongs, the algorithm is explainable, and the system can tell you whether the conversion actually worked."*

**Three closing badges (horizontal, large):**
- **Free** — no paywall, MIT open source
- **Private** — file never leaves your machine
- **Honest** — algorithm-first, grounded AI, confidence scores

**Bottom (small, grey):**
Questions welcome · github.com/kavishkadinajara/fileflow · June 2026

---

### GENERATION INSTRUCTIONS FOR CLAUDE.AI

- Generate a real downloadable `.pptx` file using python-pptx or equivalent
- Apply the "Deterministic Dark" colour scheme exactly as specified above
- Use the thin 3px electric-blue left-border accent bar on every slide except Slide 1
- Render comparison tables as actual table shapes (not text blocks)
- The metric numbers on Slide 4 (30+, 4, ~23ms, 5) must be visually large (48pt+) and in electric blue
- Phase badges on Slide 10: colour-code them — "LIVE" = cyan (#10B981), "NEXT" = electric blue (#3B82F6), "PLANNED" = amber (#F59E0B)
- Do not add any additional slides beyond the 13 specified
- File name: `FileFlowOne_MidViva_Presentation.pptx`

---

*End of prompt. Paste all content above (from "Create a professional PowerPoint…" to the end of the generation instructions) into claude.ai.*
