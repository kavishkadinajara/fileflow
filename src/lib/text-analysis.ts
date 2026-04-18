/**
 * Client-side statistical text analysis for AI content detection.
 * Provides a "Layer 1" heuristic score independent of any LLM call.
 */

// ─── Common AI transition phrases ─────────────────────────────────────────────
const AI_TRANSITIONS = [
  "moreover", "furthermore", "in conclusion", "it is worth noting",
  "it's worth noting", "in today's", "in this article", "dive into",
  "let's dive", "delve into", "it is important to note",
  "it should be noted", "as mentioned earlier", "having said that",
  "that being said", "to sum up", "in summary", "to summarize",
  "in essence", "ultimately", "at the end of the day", "without a doubt",
  "it goes without saying", "needless to say", "as we have seen",
  "in light of", "on the other hand", "by the same token",
  "in the same vein", "as a result", "consequently",
];

const AI_HEDGING = [
  "it's important to", "it is important to", "it is essential",
  "it is crucial", "it is worth mentioning", "one could argue",
  "it can be argued", "various factors", "a wide range of",
  "a variety of", "plays a crucial role", "a key aspect",
  "significant impact", "in the realm of", "in the context of",
  "serves as a", "aimed at", "geared towards",
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TextStats {
  /** Number of sentences */
  sentenceCount: number;
  /** Average sentence length in words */
  avgSentenceLength: number;
  /** Standard deviation of sentence lengths */
  sentenceLengthStdDev: number;
  /** Burstiness: coefficient of variation of sentence lengths (higher = more human) */
  burstiness: number;
  /** Type-Token Ratio: unique words / total words (higher = richer vocabulary) */
  ttr: number;
  /** Transition phrase density: count / sentenceCount */
  transitionDensity: number;
  /** Hedging phrase density */
  hedgingDensity: number;
  /** Paragraph length standard deviation (high uniformity → AI) */
  paragraphUniformity: number;
  /** Flesch-Kincaid readability score */
  fleschKincaid: number;
  /** Contraction usage rate (contractions found / possible contraction sites) */
  contractionRate: number;
  /** First-person pronoun density */
  firstPersonDensity: number;
  /** Exclamation / question mark density (personality markers) */
  personalityMarkerDensity: number;
}

export interface StatisticalResult {
  /** 0-100 score where 0=human, 100=AI */
  score: number;
  label: string;
  confidence: "Low" | "Medium" | "High";
  indicators: string[];
  stats: TextStats;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace or end
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

function getWords(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z'\s-]/g, "").split(/\s+/).filter(Boolean);
}

function getParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 10);
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  let count = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "")
    .match(/[aeiouy]{1,2}/g);
  return count ? count.length : 1;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

// ─── Main Analysis ────────────────────────────────────────────────────────────

export function analyzeText(text: string): TextStats {
  const sentences = getSentences(text);
  const words = getWords(text);
  const paragraphs = getParagraphs(text);
  const lower = text.toLowerCase();

  // Sentence metrics
  const sentenceLengths = sentences.map((s) => getWords(s).length);
  const avgSentenceLength = sentenceLengths.length
    ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
    : 0;
  const sentenceLengthSD = stdDev(sentenceLengths);
  const burstiness = avgSentenceLength > 0 ? sentenceLengthSD / avgSentenceLength : 0;

  // Type-Token Ratio
  const uniqueWords = new Set(words);
  const ttr = words.length > 0 ? uniqueWords.size / Math.min(words.length, 200) : 0;

  // Transition + hedging phrase counts
  let transitionCount = 0;
  for (const phrase of AI_TRANSITIONS) {
    const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const matches = lower.match(regex);
    if (matches) transitionCount += matches.length;
  }
  const transitionDensity = sentences.length > 0 ? transitionCount / sentences.length : 0;

  let hedgingCount = 0;
  for (const phrase of AI_HEDGING) {
    const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const matches = lower.match(regex);
    if (matches) hedgingCount += matches.length;
  }
  const hedgingDensity = sentences.length > 0 ? hedgingCount / sentences.length : 0;

  // Paragraph uniformity (lower std dev of paragraph word counts → more AI-like)
  const paraWordCounts = paragraphs.map((p) => getWords(p).length);
  const paraSD = stdDev(paraWordCounts);
  const paraMean = paraWordCounts.length
    ? paraWordCounts.reduce((a, b) => a + b, 0) / paraWordCounts.length
    : 0;
  const paragraphUniformity = paraMean > 0 ? paraSD / paraMean : 0;

  // Flesch-Kincaid readability
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const fleschKincaid = sentences.length > 0 && words.length > 0
    ? 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (totalSyllables / words.length)
    : 50;

  // Contraction rate
  const contractionPatterns = /\b(i'm|i've|i'll|i'd|he's|she's|it's|we're|they're|you're|can't|won't|don't|didn't|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|couldn't|wouldn't|shouldn't|doesn't|let's|that's|there's|here's|who's|what's|how's)\b/gi;
  const contractionMatches = lower.match(contractionPatterns);
  const contractionCount = contractionMatches ? contractionMatches.length : 0;
  const contractionRate = sentences.length > 0 ? contractionCount / sentences.length : 0;

  // First-person pronouns
  const firstPersonMatches = lower.match(/\b(i|me|my|mine|myself|we|us|our|ours|ourselves)\b/g);
  const firstPersonCount = firstPersonMatches ? firstPersonMatches.length : 0;
  const firstPersonDensity = words.length > 0 ? firstPersonCount / words.length : 0;

  // Personality markers (!, ?)
  const exclamations = (text.match(/!/g) || []).length;
  const questions = (text.match(/\?/g) || []).length;
  const personalityMarkerDensity = sentences.length > 0 ? (exclamations + questions) / sentences.length : 0;

  return {
    sentenceCount: sentences.length,
    avgSentenceLength,
    sentenceLengthStdDev: sentenceLengthSD,
    burstiness,
    ttr,
    transitionDensity,
    hedgingDensity,
    paragraphUniformity,
    fleschKincaid,
    contractionRate,
    firstPersonDensity,
    personalityMarkerDensity,
  };
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export function computeStatisticalScore(stats: TextStats): StatisticalResult {
  const indicators: string[] = [];
  let aiScore = 50; // Start neutral

  // 1. Burstiness: AI text has low burstiness (uniform sentence lengths)
  //    Human: burstiness > 0.5, AI: < 0.3
  if (stats.burstiness < 0.25) {
    aiScore += 12;
    indicators.push("Very uniform sentence lengths (low burstiness)");
  } else if (stats.burstiness < 0.35) {
    aiScore += 6;
  } else if (stats.burstiness > 0.55) {
    aiScore -= 10;
    indicators.push("Varied sentence lengths (high burstiness)");
  } else if (stats.burstiness > 0.45) {
    aiScore -= 5;
  }

  // 2. Transition phrase density
  if (stats.transitionDensity > 0.25) {
    aiScore += 12;
    indicators.push("Heavy use of AI-typical transition phrases");
  } else if (stats.transitionDensity > 0.15) {
    aiScore += 6;
  } else if (stats.transitionDensity < 0.05) {
    aiScore -= 5;
  }

  // 3. Hedging density
  if (stats.hedgingDensity > 0.15) {
    aiScore += 10;
    indicators.push("Frequent hedging language patterns");
  } else if (stats.hedgingDensity > 0.08) {
    aiScore += 4;
  }

  // 4. Paragraph uniformity (low CoV → AI)
  if (stats.paragraphUniformity < 0.2 && stats.sentenceCount > 5) {
    aiScore += 8;
    indicators.push("Uniform paragraph sizes");
  } else if (stats.paragraphUniformity > 0.5) {
    aiScore -= 6;
    indicators.push("Varied paragraph structure");
  }

  // 5. Contraction rate (AI tends to avoid contractions)
  if (stats.contractionRate < 0.02 && stats.sentenceCount > 5) {
    aiScore += 8;
    indicators.push("Almost no contractions used");
  } else if (stats.contractionRate > 0.15) {
    aiScore -= 8;
    indicators.push("Natural contraction usage");
  }

  // 6. First-person pronouns (humans use more)
  if (stats.firstPersonDensity < 0.005 && stats.sentenceCount > 5) {
    aiScore += 5;
    indicators.push("No first-person voice");
  } else if (stats.firstPersonDensity > 0.03) {
    aiScore -= 6;
    indicators.push("Strong personal voice");
  }

  // 7. Personality markers (! and ?)
  if (stats.personalityMarkerDensity < 0.02 && stats.sentenceCount > 5) {
    aiScore += 4;
  } else if (stats.personalityMarkerDensity > 0.15) {
    aiScore -= 5;
    indicators.push("Expressive punctuation style");
  }

  // 8. TTR — AI tends to have moderate, consistent TTR
  if (stats.ttr > 0.85) {
    aiScore -= 4; // Very rich vocabulary = more human
  } else if (stats.ttr < 0.55 && stats.sentenceCount > 5) {
    aiScore += 4;
    indicators.push("Repetitive vocabulary patterns");
  }

  // Clamp
  const score = Math.max(0, Math.min(100, Math.round(aiScore)));

  // Determine label and confidence
  let label: string;
  if (score <= 20) label = "Human";
  else if (score <= 40) label = "Likely Human";
  else if (score <= 59) label = "Mixed";
  else if (score <= 79) label = "Likely AI";
  else label = "AI Generated";

  const confidence: "Low" | "Medium" | "High" =
    stats.sentenceCount < 5 ? "Low" :
    stats.sentenceCount < 15 ? "Medium" : "High";

  return { score, label, confidence, indicators: indicators.slice(0, 5), stats };
}
