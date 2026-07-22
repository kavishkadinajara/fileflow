/**
 * Deterministic sensitivity / PII classifier — Factor 1 of the privacy-aware
 * router (research gap 3).
 *
 * This runs ENTIRELY CLIENT-SIDE, on the document text, with no network call and
 * no API key. That is the whole point: to decide whether a document is too
 * sensitive to send anywhere, we must be able to judge it WITHOUT sending it. The
 * classifier is explainable by construction — every point in the score traces to a
 * named detector (an email regex, a medical-term hit, a national-ID pattern) with a
 * category, a weight, and the evidence that fired it.
 *
 * Design
 * ------
 *  • Regex detectors for structured PII (emails, phones, cards, IBANs, SSNs, NICs).
 *    Card numbers are Luhn-validated to cut false positives.
 *  • Keyword/lexicon detectors for unstructured sensitivity (medical, legal,
 *    financial, credentials) with word-boundary matching.
 *  • Each detector contributes to its CATEGORY; category scores saturate (many
 *    emails ≠ unbounded score) and combine into an overall 0..1 sensitivity via a
 *    "max plus damped rest" rule, so one strongly-sensitive category dominates
 *    while corroborating categories still nudge it up.
 */

export type SensitivityCategory =
  | "identity"     // names-with-context, national IDs, passports
  | "contact"      // emails, phones, addresses
  | "financial"    // card numbers, IBANs, account terms, salary
  | "medical"      // diagnoses, conditions, health terms
  | "legal"        // contracts, litigation, confidentiality
  | "credentials"; // passwords, API keys, secrets

export interface DetectorHit {
  detector: string;
  category: SensitivityCategory;
  count: number;
  weight: number;              // per-hit contribution before saturation
  samples: string[];           // up to 3 redacted examples for the UI
}

export interface SensitivityResult {
  score: number;                                   // 0..1 overall
  level: "low" | "moderate" | "high";
  categoryScores: Record<SensitivityCategory, number>;
  hits: DetectorHit[];
  topReason: string;
}

// ── helpers ─────────────────────────────────────────────────────────────────────

/** Redact the middle of a matched string for safe display in the UI. */
function redact(s: string): string {
  const t = s.trim();
  if (t.length <= 4) return "•".repeat(t.length);
  return `${t.slice(0, 2)}${"•".repeat(Math.min(6, t.length - 4))}${t.slice(-2)}`;
}

/** Luhn check so 16-digit strings that aren't real card numbers don't fire. */
function luhnValid(num: string): boolean {
  const digits = num.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

// ── regex detectors ───────────────────────────────────────────────────────────────

interface RegexDetector {
  name: string;
  category: SensitivityCategory;
  re: RegExp;
  weight: number;
  validate?: (m: string) => boolean;
}

const REGEX_DETECTORS: RegexDetector[] = [
  { name: "Email address", category: "contact", weight: 0.18,
    re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { name: "Phone number", category: "contact", weight: 0.14,
    re: /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3}[\s-]?\d{4}\b/g,
    // Require at least 9 digits total to avoid matching short number runs.
    validate: (m) => (m.replace(/\D/g, "").length >= 9) },
  { name: "Credit-card number", category: "financial", weight: 0.5,
    re: /\b(?:\d[ -]?){13,19}\b/g, validate: luhnValid },
  { name: "IBAN", category: "financial", weight: 0.4,
    // Accept the canonical spaced grouping ("GB82 WEST 1234 …") as well as the
    // compact form; validate overall length after stripping spaces.
    re: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{2,4}){3,8}\b/g,
    validate: (m) => { const s = m.replace(/\s/g, ""); return s.length >= 15 && s.length <= 34; } },
  { name: "US SSN", category: "identity", weight: 0.5,
    re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { name: "Sri Lanka NIC", category: "identity", weight: 0.5,
    re: /\b(?:\d{9}[vVxX]|\d{12})\b/g },
  { name: "Passport number", category: "identity", weight: 0.4,
    re: /\bpassport\s*(?:no\.?|number|#)?\s*[:\-]?\s*[A-Z0-9]{6,9}\b/gi },
  { name: "API key / secret", category: "credentials", weight: 0.55,
    // Vendor token shapes (AWS AKIA…, GitHub gh?_…, sk-/pk- prefixed with
    // internal hyphens) plus the generic long-suffix form.
    re: /\b(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|(?:sk|pk)[-_][A-Za-z0-9][A-Za-z0-9_-]{10,}|(?:api[_-]?key|secret|token|bearer)[_-]?[A-Za-z0-9]{16,})\b/gi },
  { name: "Private key block", category: "credentials", weight: 0.6,
    re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: "IP address", category: "contact", weight: 0.06,
    re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
];

// ── lexicon detectors ──────────────────────────────────────────────────────────────

interface LexiconDetector {
  name: string;
  category: SensitivityCategory;
  terms: string[];
  weight: number;
}

const LEXICONS: LexiconDetector[] = [
  { name: "Medical terms", category: "medical", weight: 0.14, terms: [
    "diagnosis", "diagnosed", "prognosis", "patient", "symptom", "treatment",
    "prescription", "medication", "dosage", "disease", "disorder", "chronic",
    "cancer", "tumor", "hiv", "diabetes", "hypertension", "depression", "anxiety",
    "mental health", "blood pressure", "medical record", "clinical", "pathology",
    "surgery", "biopsy", "immunization", "allergy", "pneumonia", "radiotherapy",
    "chemotherapy", "oncology", "carcinoma", "insulin", "asthma", "inhaler",
    "metformin", "prednisolone", "sertraline", "coeliac", "proteinuria", "x-ray",
    "vaccination", "discharge summary",
  ]},
  { name: "Legal terms", category: "legal", weight: 0.12, terms: [
    "confidential", "non-disclosure", "nda", "hereby agree", "governing law",
    "liability", "indemnify", "litigation", "plaintiff", "defendant", "settlement",
    "breach of contract", "terms and conditions", "power of attorney", "affidavit",
    "jurisdiction", "arbitration", "intellectual property", "proprietary",
    "confidentiality", "privileged", "counsel", "clause", "indemnity", "tribunal",
    "claimant", "respondent", "attorney", "trademark", "negligence", "consent order",
    "dilapidations", "term sheet",
  ]},
  { name: "Financial terms", category: "financial", weight: 0.12, terms: [
    "salary", "bank account", "account number", "routing number", "sort code",
    "net worth", "annual income", "credit score", "loan", "mortgage", "invoice total",
    "tax id", "vat number", "compensation", "payroll", "wire transfer", "swift code",
    "dividend", "portfolio", "installment", "instalment", "tranche", "co-payment",
    "account balance", "interest rate", "remittance", "settlement account",
    "earn-out", "premium",
  ]},
  { name: "Identity context", category: "identity", weight: 0.1, terms: [
    "date of birth", "d.o.b", "dob", "place of birth", "nationality", "marital status",
    "maiden name", "mother's name", "next of kin", "driver's license", "national id",
    "nic", "policyholder",
  ]},
  { name: "Credential terms", category: "credentials", weight: 0.2, terms: [
    "password", "passphrase", "pin number", "security question", "access token",
    "client secret", "credentials", "login details", "otp",
  ]},
];

const CATEGORIES: SensitivityCategory[] = [
  "identity", "contact", "financial", "medical", "legal", "credentials",
];

/** Saturating map: raw category weight → 0..1 (diminishing returns). */
export function saturate(x: number): number {
  return 1 - Math.exp(-1.3 * x);
}

/** Inverse of saturate — recover the raw weight so ensembles can add to it. */
export function desaturate(y: number): number {
  return -Math.log(1 - Math.min(y, 0.999)) / 1.3;
}

/**
 * Classify document text. Pure and deterministic — same text → same result.
 */
export function classifySensitivity(text: string): SensitivityResult {
  const sample = text.slice(0, 200_000); // bound work on huge docs
  const lower = sample.toLowerCase();
  const hits: DetectorHit[] = [];
  const raw: Record<SensitivityCategory, number> = {
    identity: 0, contact: 0, financial: 0, medical: 0, legal: 0, credentials: 0,
  };

  // Regex detectors.
  for (const d of REGEX_DETECTORS) {
    const matches = sample.match(d.re) ?? [];
    const valid = d.validate ? matches.filter(d.validate) : matches;
    if (!valid.length) continue;
    raw[d.category] += d.weight * valid.length;
    hits.push({
      detector: d.name, category: d.category, count: valid.length, weight: d.weight,
      samples: [...new Set(valid)].slice(0, 3).map(redact),
    });
  }

  // Lexicon detectors (word-boundary, case-insensitive).
  for (const lex of LEXICONS) {
    let total = 0;
    const found: string[] = [];
    for (const term of lex.terms) {
      // Optional plural "s" — the strict boundary otherwise rejects "loans",
      // "symptoms", "tranches" while matching their singulars.
      const re = new RegExp(`(?<![a-z0-9])${escapeRe(term)}s?(?![a-z0-9])`, "g");
      const n = (lower.match(re) ?? []).length;
      if (n) { total += n; if (found.length < 3) found.push(term); }
    }
    if (!total) continue;
    raw[lex.category] += lex.weight * total;
    hits.push({
      detector: lex.name, category: lex.category, count: total, weight: lex.weight,
      samples: found,
    });
  }

  const categoryScores = {} as Record<SensitivityCategory, number>;
  for (const c of CATEGORIES) categoryScores[c] = round(saturate(raw[c]));

  return composeSensitivity(categoryScores, hits);
}

/**
 * Overall = dominant category + damped contribution of the rest. One highly
 * sensitive category should push the document to "high" on its own, while
 * several moderate signals still accumulate. Exported so ensembles (the NER
 * deep-scan) can rebuild a result after boosting category scores.
 */
export function composeSensitivity(
  categoryScores: Record<SensitivityCategory, number>,
  hits: DetectorHit[],
): SensitivityResult {
  const sorted = CATEGORIES.map((c) => categoryScores[c]).sort((a, b) => b - a);
  const top = sorted[0] ?? 0;
  const rest = sorted.slice(1).reduce((acc, v) => acc + v, 0);
  const score = round(Math.min(1, top + 0.15 * rest));

  const level: SensitivityResult["level"] = score >= 0.6 ? "high" : score >= 0.3 ? "moderate" : "low";

  // Top reason = highest-scoring category that actually has hits.
  const topCat = CATEGORIES
    .filter((c) => categoryScores[c] > 0)
    .sort((a, b) => categoryScores[b] - categoryScores[a])[0];
  const topReason = topCat
    ? `${labelFor(topCat)} content detected (${hits.filter((h) => h.category === topCat).map((h) => h.detector.toLowerCase()).join(", ")})`
    : "No sensitive content detected";

  return { score, level, categoryScores, hits, topReason };
}

/** Redact helper, exported for ensemble detectors that surface samples in the UI. */
export function redactSample(s: string): string {
  return redact(s);
}

/**
 * A located PII match — the positional form of the regex detectors, used by the
 * HYBRID route to pseudonymize sensitive values before anything leaves the
 * device. Lexicon hits are deliberately excluded: they mark topical sensitivity
 * (a document *about* medicine), not extractable values that can be masked.
 */
export interface SensitiveSpan {
  start: number;
  end: number;
  text: string;
  category: SensitivityCategory;
  detector: string;
}

/** Locate every validated regex-detector match, overlap-free, in text order. */
export function findSensitiveSpans(text: string): SensitiveSpan[] {
  const sample = text.slice(0, 200_000);
  const spans: SensitiveSpan[] = [];
  for (const d of REGEX_DETECTORS) {
    for (const m of sample.matchAll(d.re)) {
      const value = m[0];
      if (m.index === undefined) continue;
      if (d.validate && !d.validate(value)) continue;
      spans.push({
        start: m.index, end: m.index + value.length,
        text: value, category: d.category, detector: d.name,
      });
    }
  }
  // Overlaps (e.g. a card number also matching the phone regex): keep the span
  // that starts first; on ties keep the longer one.
  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  const out: SensitiveSpan[] = [];
  let lastEnd = -1;
  for (const s of spans) {
    if (s.start < lastEnd) continue;
    out.push(s);
    lastEnd = s.end;
  }
  return out;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function round(n: number): number {
  return Math.round(n * 100) / 100;
}
export function labelFor(c: SensitivityCategory): string {
  return {
    identity: "Personal identity", contact: "Contact", financial: "Financial",
    medical: "Medical", legal: "Legal", credentials: "Credentials",
  }[c];
}
