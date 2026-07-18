/**
 * HYBRID-route pseudonymization — the mechanism that makes "sensitive parts stay
 * local" literal. Every regex-detected PII value is replaced ON DEVICE with an
 * opaque token before the text is sent anywhere; the cloud model sees and must
 * preserve the tokens, and the response is re-identified locally. The token→value
 * map never leaves the browser.
 *
 * Token shape [[PII_CATEGORY_n]] is chosen to survive an LLM round-trip: bracketed
 * uppercase tokens are treated as immutable placeholders by instruction-following
 * models, and the executor's cloud instruction reinforces that.
 */
import { findSensitiveSpans } from "@/lib/privacy/sensitivity";

export interface MaskResult {
  masked: string;
  /** token → original value. Stays on-device. */
  map: Record<string, string>;
  /** Number of span replacements performed (repeated values share a token). */
  count: number;
}

export function maskSensitive(text: string): MaskResult {
  const spans = findSensitiveSpans(text);
  if (spans.length === 0) return { masked: text, map: {}, count: 0 };

  const map: Record<string, string> = {};
  const tokenByValue = new Map<string, string>();
  let out = "";
  let cursor = 0;
  let n = 0;

  for (const s of spans) {
    out += text.slice(cursor, s.start);
    let token = tokenByValue.get(s.text);
    if (!token) {
      token = `[[PII_${s.category.toUpperCase()}_${++n}]]`;
      tokenByValue.set(s.text, token);
      map[token] = s.text;
    }
    out += token;
    cursor = s.end;
  }
  out += text.slice(cursor);

  return { masked: out, map, count: spans.length };
}

/**
 * Extend an existing mask with literal values found AFTER the regex pass — the
 * HYBRID leak-check re-masks NER-detected residual names with this. Values are
 * replaced case-sensitively, longest first (so "Nimal Perera" wins over "Nimal").
 */
export function maskExtra(
  masked: string,
  map: Record<string, string>,
  values: string[],
  category: string,
): MaskResult {
  const unique = [...new Set(values.map((v) => v.trim()).filter((v) => v.length >= 2))]
    .sort((a, b) => b.length - a.length);
  let out = masked;
  let n = Object.keys(map).length;
  let count = 0;
  const nextMap = { ...map };

  for (const value of unique) {
    if (!out.includes(value)) continue;
    const token = `[[PII_${category.toUpperCase()}_${++n}]]`;
    const parts = out.split(value);
    count += parts.length - 1;
    out = parts.join(token);
    nextMap[token] = value;
  }
  return { masked: out, map: nextMap, count };
}

/** Restore original values in a (cloud-processed) text. Unknown text is untouched. */
export function unmask(text: string, map: Record<string, string>): string {
  let out = text;
  for (const [token, original] of Object.entries(map)) {
    out = out.split(token).join(original);
  }
  return out;
}

/** Tokens the model failed to preserve (lost content the user should know about). */
export function droppedTokens(text: string, map: Record<string, string>): string[] {
  return Object.keys(map).filter((token) => !text.includes(token));
}
