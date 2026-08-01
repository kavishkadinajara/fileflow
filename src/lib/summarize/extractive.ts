/**
 * Extractive summarisation — TextRank over a TF-IDF sentence-similarity graph.
 *
 * This is the deterministic core of the Hybrid Summariser. It picks the most
 * central sentences of a document by graph centrality (the same idea as PageRank
 * ranking web pages), with no AI and no API cost. Running fully client-side, it
 * works even with no API keys configured, and — crucially — it GROUNDS the optional
 * AI polish: the LLM rewrites only the sentences this stage selected, so the summary
 * can't drift from the source (far less hallucination than asking an LLM to
 * summarise a whole document blind).
 *
 * Pipeline
 * --------
 * 1. Segment   — split into sentences (Unicode-aware; English + Sinhala/Tamil).
 * 2. Tokenise  — lowercase word tokens, stop-words dropped.
 * 3. Weight    — TF-IDF vector per sentence (rare words count more).
 * 4. Graph     — edge weight = cosine similarity between sentence vectors.
 * 5. Rank      — weighted TextRank (PageRank power iteration) → centrality score.
 * 6. Select    — top-K by score, re-ordered to the original reading order.
 *
 * Language-agnostic: the maths works on any tokenisable script, so Sinhala and
 * Tamil documents rank correctly; stop-word lists only sharpen the result.
 */

export interface RankedSentence {
  text: string;
  score: number;   // TextRank centrality (higher = more central)
  index: number;   // position in the document (reading order)
}

export interface ExtractiveResult {
  summary: string;              // selected sentences, joined in reading order
  sentences: RankedSentence[];  // every sentence with its score (for highlighting)
  selected: number[];           // indices chosen for the summary
  keywords: string[];           // top content terms (TF-IDF)
  language: "en" | "si" | "ta" | "other";
  stats: {
    sentenceCount: number;
    wordCount: number;
    summaryWordCount: number;
    compression: number;        // 0..1 (summary words / source words)
  };
}

export interface ExtractiveOptions {
  /** Fraction of sentences to keep (0..1). Default 0.3. */
  ratio?: number;
  /** Hard cap on selected sentences. Default 8. */
  maxSentences?: number;
  /** Floor on selected sentences. Default 3. */
  minSentences?: number;
}

// The similarity matrix + TextRank are O(n²·iters); cap the sentence count fed to
// the graph so a very long document can't freeze the browser. Documents this long
// are rare for summarising; we rank the leading sentences (which front-load the
// thesis in most writing) and flag the truncation.
const MAX_RANK_SENTENCES = 800;

// Common English stop words (kept compact — high-frequency function words only).
const STOP_EN = new Set(
  ("a an the and or but if then else of to in on at by for with about as into like through after over between out against during without before under around among is am are was were be been being have has had do does did will would shall should can could may might must this that these those i you he she it we they me him her them my your his its our their what which who whom whose when where why how all any both each few more most other some such no nor not only own same so than too very just also").split(
    /\s+/,
  ),
);

// A handful of frequent Sinhala/Tamil function words, to denoise ranking. Not
// exhaustive — TextRank tolerates incomplete stop lists, this only sharpens it.
const STOP_SI = new Set("සහ හා ද ය යි ට එම මෙම ඒ මේ ඔහු ඇය ඔවුන් අප අපි ඔබ එය නම් වන විට සඳහා සිට දක්වා ගැන හෝ නමුත් එක එක් වැනි ලෙස කර කරන කරයි ඇත නැත".split(/\s+/));
const STOP_TA = new Set("மற்றும் அந்த இந்த ஒரு என்று என அது இது அவர் அவள் அவர்கள் நாம் நீங்கள் ஆக ஆனால் அல்லது போன்ற உள்ளது இல்லை க்கு இல் ஆல் உடன்".split(/\s+/));

/** Detect the dominant script so we can pick stop words + tell the AI layer. */
function detectLanguage(text: string): "en" | "si" | "ta" | "other" {
  let si = 0, ta = 0, latin = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if (c >= 0x0d80 && c <= 0x0dff) si++;
    else if (c >= 0x0b80 && c <= 0x0bff) ta++;
    else if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)) latin++;
  }
  const max = Math.max(si, ta, latin);
  if (max === 0) return "other";
  if (max === si) return "si";
  if (max === ta) return "ta";
  return "en";
}

function stopWordsFor(lang: string): Set<string> {
  if (lang === "si") return STOP_SI;
  if (lang === "ta") return STOP_TA;
  return STOP_EN;
}

// Abbreviations whose trailing dot must NOT end a sentence.
const ABBREV = ["mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "vs", "etc", "inc", "ltd", "co", "fig", "eq", "no", "vol", "e.g", "i.e", "a.m", "p.m", "u.s", "u.k", "ph.d"];

/** Split text into sentences. Unicode-aware; protects common abbreviations. */
export function splitSentences(text: string): string[] {
  let t = text.replace(/\s+/g, " ").trim();
  if (!t) return [];

  // Protect abbreviation dots (Dr. → Dr<DOT>) so they don't trigger a split.
  for (const ab of ABBREV) {
    const re = new RegExp(`\\b(${ab.replace(/\./g, "\\.")})\\.`, "gi");
    t = t.replace(re, (_m, g1) => `${g1}<DOT>`);
  }
  // Protect a dot between digits (3.14, 1.000) and after a single initial (A.).
  t = t.replace(/(\d)\.(\d)/g, "$1<DOT>$2").replace(/\b([A-Z])\.\s/g, "$1<DOT> ");

  // Split after sentence-final punctuation (incl. the Devanagari danda) when the
  // next non-space char looks like a sentence start.
  const parts = t.split(/(?<=[.!?।])\s+(?=[A-Z0-9"'඀-෿஀-௿(])/u);

  return parts
    .map((s) => s.replace(/<DOT>/g, ".").trim())
    .filter((s) => s.length > 0);
}

/**
 * Strip Markdown noise so the summary reads as prose, not markup. This app's editor
 * is Markdown-centric, so raw content often carries headings (#), list markers, code
 * fences, links and emphasis — none of which belong in a summary sentence. Fenced
 * code blocks are dropped entirely (code isn't prose to summarise). Plain text and
 * Sinhala/Tamil pass through unchanged.
 */
function precleanMarkdown(text: string): string {
  const lines = text.split(/\r?\n/);

  // Locate fence lines and pair them; only contents BETWEEN a matched pair are
  // dropped. An odd (unclosed) trailing fence drops just its own line — so a stray
  // ``` never swallows the rest of the document.
  const fences: number[] = [];
  lines.forEach((l, i) => { if (/^\s*(```|~~~)/.test(l)) fences.push(i); });
  const drop = new Set<number>();
  for (let k = 0; k + 1 < fences.length; k += 2) {
    for (let i = fences[k]; i <= fences[k + 1]; i++) drop.add(i);
  }
  if (fences.length % 2 === 1) drop.add(fences[fences.length - 1]);

  const out: string[] = [];
  lines.forEach((line, i) => {
    if (drop.has(i)) return;
    const t = line
      .replace(/^\s{0,3}#{1,6}\s+/, "")          // ATX headings
      .replace(/^\s*>+\s?/, "")                  // blockquotes
      .replace(/^\s*([-*+]|\d+[.)])\s+/, "")     // list markers
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")      // images → drop
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")   // links → link text
      .replace(/(\*\*|__|\*|_|`)/g, "")          // emphasis / inline code marks
      .replace(/^\s*[-*_]{3,}\s*$/, "")          // horizontal rules → blank
      .trim();
    if (t) out.push(t);
  });
  return out.join(" ");
}

// A word starts with a letter/number, then may carry more letters/numbers, Unicode
// combining MARKS (\p{M} — essential for Sinhala/Tamil/Indic vowel signs, which are
// marks not letters, so omitting them shreds those scripts mid-character), apostrophes
// and hyphens.
const WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}\p{M}'’-]*/gu;

/** Lowercased content tokens of a sentence, stop words removed. */
function tokenize(sentence: string, stop: Set<string>): string[] {
  const out: string[] = [];
  const matches = sentence.toLowerCase().match(WORD_RE);
  if (!matches) return out;
  for (const w of matches) {
    if (w.length < 2 && !/\p{N}/u.test(w)) continue; // drop single letters
    if (stop.has(w)) continue;
    out.push(w);
  }
  return out;
}

/** Cosine similarity between two sparse TF-IDF vectors (Map term→weight). */
function cosine(a: Map<string, number>, b: Map<string, number>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [term, wa] of small) {
    const wb = large.get(term);
    if (wb) dot += wa * wb;
  }
  if (dot === 0) return 0;
  let na = 0, nb = 0;
  for (const w of a.values()) na += w * w;
  for (const w of b.values()) nb += w * w;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Weighted TextRank over the similarity matrix. Standard PageRank power iteration
 * with damping 0.85; converges in a few dozen sweeps. Returns a centrality score
 * per sentence (normalised to sum ≈ N).
 */
function textRank(sim: number[][], iterations = 60, damping = 0.85): number[] {
  const n = sim.length;
  if (n === 0) return [];
  // Out-weight per node (row sums) for the transition normalisation.
  const rowSum = sim.map((row) => row.reduce((s, v) => s + v, 0));
  let score = new Array(n).fill(1);

  for (let it = 0; it < iterations; it++) {
    const next = new Array(n).fill(1 - damping);
    for (let i = 0; i < n; i++) {
      let acc = 0;
      for (let j = 0; j < n; j++) {
        if (j === i || sim[j][i] === 0 || rowSum[j] === 0) continue;
        acc += (sim[j][i] / rowSum[j]) * score[j];
      }
      next[i] += damping * acc;
    }
    // Check convergence (L1 delta).
    let delta = 0;
    for (let i = 0; i < n; i++) delta += Math.abs(next[i] - score[i]);
    score = next;
    if (delta < 1e-4) break;
  }
  return score;
}

/** Top content terms by total TF-IDF mass across the document. */
function topKeywords(sentenceTokens: string[][], df: Map<string, number>, n: number, k: number): string[] {
  const mass = new Map<string, number>();
  for (const toks of sentenceTokens) {
    const tf = new Map<string, number>();
    for (const w of toks) tf.set(w, (tf.get(w) ?? 0) + 1);
    for (const [w, c] of tf) {
      const idf = Math.log(1 + n / (df.get(w) ?? 1));
      mass.set(w, (mass.get(w) ?? 0) + c * idf);
    }
  }
  return [...mass.entries()]
    .filter(([w]) => w.length > 2)            // skip very short tokens as keywords
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([w]) => w);
}

/**
 * Summarise `text` extractively. Returns the chosen summary plus every sentence's
 * score (so the UI can highlight) and the document keywords.
 */
export function summarizeExtractive(text: string, opts: ExtractiveOptions = {}): ExtractiveResult {
  const ratio = opts.ratio ?? 0.3;
  const maxSentences = opts.maxSentences ?? 8;
  const minSentences = opts.minSentences ?? 3;

  const clean = precleanMarkdown(text);
  const language = detectLanguage(clean);
  const stop = stopWordsFor(language);
  const allSentences = splitSentences(clean);
  const wordCount = (clean.match(WORD_RE) ?? []).length;
  // Cap the graph size on very long inputs so ranking can't freeze the UI.
  const rawSentences = allSentences.slice(0, MAX_RANK_SENTENCES);

  // Trivial documents — nothing to rank.
  if (rawSentences.length <= 2) {
    return {
      summary: rawSentences.join(" "),
      sentences: rawSentences.map((s, i) => ({ text: s, score: 1, index: i })),
      selected: rawSentences.map((_, i) => i),
      keywords: [],
      language,
      stats: { sentenceCount: rawSentences.length, wordCount, summaryWordCount: wordCount, compression: 1 },
    };
  }

  // Tokenise + document frequency for IDF.
  const tokens = rawSentences.map((s) => tokenize(s, stop));
  const n = rawSentences.length;
  const df = new Map<string, number>();
  for (const toks of tokens) {
    for (const w of new Set(toks)) df.set(w, (df.get(w) ?? 0) + 1);
  }

  // TF-IDF vector per sentence.
  const vectors: Map<string, number>[] = tokens.map((toks) => {
    const tf = new Map<string, number>();
    for (const w of toks) tf.set(w, (tf.get(w) ?? 0) + 1);
    const vec = new Map<string, number>();
    for (const [w, c] of tf) {
      const idf = Math.log(1 + n / (df.get(w) ?? 1));
      vec.set(w, c * idf);
    }
    return vec;
  });

  // Similarity matrix (symmetric, zero diagonal).
  const sim: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const s = cosine(vectors[i], vectors[j]);
      sim[i][j] = s;
      sim[j][i] = s;
    }
  }

  const scores = textRank(sim);

  // How many sentences to keep.
  const want = Math.max(minSentences, Math.min(maxSentences, Math.round(n * ratio)));
  const selected = scores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(want, n))
    .map((x) => x.index)
    .sort((a, b) => a - b);            // restore reading order for a readable summary

  const summary = selected.map((i) => rawSentences[i]).join(" ");
  const summaryWordCount = (summary.match(WORD_RE) ?? []).length;

  return {
    summary,
    sentences: rawSentences.map((s, i) => ({ text: s, score: scores[i] ?? 0, index: i })),
    selected,
    keywords: topKeywords(tokens, df, n, 8),
    language,
    stats: {
      sentenceCount: n,
      wordCount,
      summaryWordCount,
      compression: wordCount ? +(summaryWordCount / wordCount).toFixed(2) : 1,
    },
  };
}
