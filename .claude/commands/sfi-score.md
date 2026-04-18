# SFI Score (Semantic Fidelity Index)

Implement or extend the Semantic Fidelity Index — the cross-format semantic preservation metric from the FileFlowOne research plan.

## Arguments
`$ARGUMENTS` — scope, e.g. "implement core metric" or "add functional score component for link integrity"

## Background

SFI is a three-dimensional score (from the research gap report):
```
SFI = w₁·S_structural + w₂·S_semantic + w₃·S_functional
  S_structural = preservation of headings, tables, lists, nesting  (w₁=0.35)
  S_semantic   = embedding similarity of content blocks            (w₂=0.45)
  S_functional = link integrity, formula correctness, metadata     (w₃=0.20)
```

## Implementation targets

**API:** `src/app/api/slm-score/route.ts`
- POST accepts `{ original: string, converted: string, fromFormat: FileFormat, toFormat: FileFormat }`
- Returns `{ sfi: number, structural: number, semantic: number, functional: number, details: object }`

**Structural scoring** — parse both documents and compare:
- Heading counts and hierarchy depth
- Table count and cell count
- List count and nesting levels
- Use cheerio/BeautifulSoup equivalent (jsdom or `@mozilla/readability`) on the client

**Semantic scoring** — compare content blocks using:
- Sentence-level ROUGE-L as a lightweight proxy (no embedding model needed for MVP)
- Later upgrade: call a server-side sentence-transformer via Python FastAPI (`POST /api/slm-score` forwarded to FastAPI)

**Functional scoring** — check:
- Hyperlink count preservation
- Code block presence
- Metadata fields (title, author if present)

**UI component:** `src/components/QualityScoreCard.tsx`
- Radar chart with three axes (use recharts, already available via shadcn)
- Composite SFI badge (color: green ≥0.85, yellow ≥0.65, red <0.65)
- Show after job completes if `resultBlob` is a text format

Wire `QualityScoreCard` into `src/components/JobList.tsx` — render below the download button when SFI data is available.
