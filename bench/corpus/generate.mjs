/**
 * ConvertBench-lite — corpus generator.
 *
 * Emits a fully deterministic markdown corpus: 65 documents across 5 domains
 * (business, academic, technical, legal, medical) × 3 complexity tiers
 * (simple ×4, moderate ×5, complex ×4 per domain). Every document is produced
 * from a seeded PRNG keyed on its id, so the corpus is byte-reproducible —
 * anyone can regenerate the exact dataset from this script alone.
 *
 * Alongside the docs it writes manifest.json with ground-truth feature counts
 * (headings, tables, lists, links, formulas, code blocks, blockquotes, words)
 * measured with the same regex family the SFI service uses, so bench numbers
 * and manifest numbers describe the same quantities.
 *
 * Usage: node bench/corpus/generate.mjs
 */

import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = join(ROOT, "docs");

// ── Seeded PRNG ────────────────────────────────────────────────────────────────

function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const shuffled = (rng, arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Fill {slot} placeholders from pools; each slot picks independently. */
function fill(rng, template, pools) {
  return template
    .replace(/\{(\w+)\}/g, (_, key) => {
      const pool = pools[key];
      if (!pool) return key;
      return typeof pool === "function" ? pool(rng) : pick(rng, pool);
    })
    .replace(/\b(the|a|an) the\b/g, "the");   // "Retender the {region}" where region = "the …"
}

// ── Shared pools ───────────────────────────────────────────────────────────────

const NAMES = ["N. Perera", "S. Fernando", "A. Jayasuriya", "M. Silva", "R. Wickramasinghe", "K. Bandara", "T. Gunawardena", "D. Rajapakse", "H. Weerasinghe", "P. Dissanayake"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const YEARS = ["2023", "2024", "2025"];

const num = (lo, hi, dp = 0) => (rng) => (lo + rng() * (hi - lo)).toFixed(dp);
const pct = (lo, hi) => (rng) => `${(lo + rng() * (hi - lo)).toFixed(1)}%`;

// ── Domain definitions ─────────────────────────────────────────────────────────

const BUSINESS = {
  key: "business",
  pools: {
    company: ["Cendric Holdings", "Almara Logistics", "Weystone Retail", "Bluefern Analytics", "Corvid Manufacturing", "Halden Foods"],
    unit: ["the retail division", "the logistics arm", "the analytics practice", "regional operations", "the export unit", "corporate services"],
    metric: ["gross margin", "operating cash flow", "customer retention", "order fulfilment time", "revenue per employee", "net promoter score"],
    quarter: ["Q1", "Q2", "Q3", "Q4"],
    year: YEARS,
    month: MONTHS,
    person: NAMES,
    pctv: pct(2, 24),
    amount: num(120, 4800),
    region: ["the Western province", "the Southern corridor", "the Colombo metro area", "the export markets", "the online channel"],
    initiative: ["the warehouse consolidation", "the pricing review", "the supplier renegotiation", "the loyalty programme relaunch", "the fleet telematics rollout"],
  },
  titles: ["{quarter} {year} Performance Review — {company}", "{company} Operations Report, {month} {year}", "Annual Planning Brief: {company}"],
  sections: [
    { h: "Executive Summary", s: [
      "{company} closed {quarter} with {metric} up {pctv} against the prior period, driven mainly by {initiative}.",
      "The quarter was uneven: {unit} outperformed its plan while {region} lagged behind expectations set in {month}.",
      "Management attention this period centred on {initiative}, which {person} has led since {month}.",
      "Cash discipline remained the board's stated priority, and {metric} reflects that emphasis.",
    ]},
    { h: "Financial Performance", s: [
      "Revenue for the period reached LKR {amount} million, a change of {pctv} year on year.",
      "Cost pressure in {unit} was partially offset by savings from {initiative}.",
      "{metric} moved to {pctv}, which sits within the guidance range issued in {month}.",
      "Working capital tightened as receivables from {region} stretched beyond standard terms.",
      "The finance team flagged currency exposure on imported inputs as the main sensitivity for next quarter.",
    ]},
    { h: "Operations", s: [
      "Throughput at the main facility improved after {initiative} removed a persistent bottleneck.",
      "{unit} reported {pctv} utilisation, the highest reading since {month} {year}.",
      "Two supplier contracts were retendered; {person} expects the new terms to hold {metric} steady.",
      "Order fulfilment time in {region} fell to {amount} minutes on average.",
    ]},
    { h: "Market and Competition", s: [
      "Competitor pricing in {region} compressed margins across the category.",
      "Share gains came primarily from {unit}, where service levels differentiate the offer.",
      "Demand in {region} is seasonal, and the {quarter} pattern matched the five-year average.",
      "A new entrant began discounting aggressively in {month}; the effect on {metric} is not yet material.",
    ]},
    { h: "Risks and Mitigations", s: [
      "The principal operational risk remains single-source dependency in {unit}.",
      "{person} maintains the risk register; the top item since {month} has been energy cost volatility.",
      "Insurance cover was reviewed and extended to include disruption arising from {initiative}.",
      "Scenario planning assumes {metric} deteriorates by up to {pctv} in a downside case.",
    ]},
    { h: "Outlook", s: [
      "Guidance for the next quarter assumes {metric} holds near {pctv}.",
      "Capital allocation favours {initiative} over new market entry for the remainder of {year}.",
      "The board will revisit the dividend policy once {unit} completes its restructuring.",
      "Hiring plans in {region} stay frozen pending the {quarter} demand reading.",
    ]},
    { h: "Divisional Notes", s: [
      "{unit} completed its systems migration with two days of planned downtime.",
      "Staff turnover in {unit} eased to {pctv} after the compensation review led by {person}.",
      "A pilot with a third-party courier in {region} cut delivery cost per parcel to LKR {amount}.",
      "Inventory accuracy after cycle counting reached {pctv} in {month}.",
    ]},
  ],
  tables: [
    { caption: "Quarterly results by division", headers: ["Division", "Revenue (LKR m)", "Margin", "YoY"],
      row: (rng) => [pick(rng, ["Retail", "Logistics", "Analytics", "Exports", "Services", "Manufacturing"]), num(80, 900)(rng), pct(4, 22)(rng), pct(-6, 14)(rng)] },
    { caption: "Key performance indicators", headers: ["Indicator", "Target", "Actual", "Status"],
      row: (rng) => [pick(rng, ["Fulfilment time", "Retention", "Utilisation", "NPS", "Stock accuracy", "Cost per order"]), num(40, 95)(rng), num(35, 99)(rng), pick(rng, ["On track", "Watch", "Behind"])] },
    { caption: "Initiative portfolio", headers: ["Initiative", "Owner", "Stage", "Spend (LKR m)"],
      row: (rng) => [pick(rng, ["Warehouse consolidation", "Pricing review", "Loyalty relaunch", "Telematics rollout", "Supplier renegotiation"]), pick(rng, NAMES), pick(rng, ["Scoping", "In flight", "Closing", "Done"]), num(4, 120)(rng)] },
  ],
  lists: [
    { intro: "Priorities agreed for the coming quarter:", items: ["Close the {initiative} workstream", "Stabilise {metric} in {unit}", "Retender the {region} distribution contract", "Complete the audit actions from {month}", "Refresh the demand model with {quarter} actuals"] },
    { intro: "Decisions taken by the steering committee:", items: ["Approve additional spend on {initiative}", "Hold pricing in {region} until {month}", "Assign {person} to the vendor review", "Defer the fleet replacement to {year}", "Escalate the customs delay to the country manager"] },
  ],
  quotes: [
    "We do not chase volume at the expense of margin; {metric} is the number this business manages to. — {person}, briefing note, {month} {year}",
    "Every rupee of working capital tied up in {unit} is a rupee not funding {initiative}. — internal memo",
  ],
  links: [
    ["quarterly filing", "https://example.com/investors/filings/{year}-{quarter}"],
    ["KPI methodology", "https://example.com/methodology/kpi"],
    ["prior period review", "https://example.com/reports/{year}/prior"],
    ["market data source", "https://example.com/data/market-monitor"],
    ["risk register extract", "https://example.com/governance/risk"],
  ],
  formulas: ["$M = \\frac{R - C}{R}$", "$CCC = DIO + DSO - DPO$", "$g = (1 + r)^{4} - 1$", "$ROI = \\frac{G - I}{I}$"],
  code: null,
};

const ACADEMIC = {
  key: "academic",
  pools: {
    topic: ["cross-format document fidelity", "low-resource text summarisation", "on-device inference for privacy", "semantic drift in derived corpora", "layout-aware information extraction"],
    method: ["a controlled ablation", "a paired comparison", "a stratified sample", "an expert annotation study", "a replication of the base protocol"],
    dataset: ["the held-out evaluation split", "a 65-document synthetic corpus", "the annotated subset", "the public benchmark release", "the pilot collection"],
    metricName: ["macro-averaged F1", "mean cosine similarity", "cell-level accuracy", "inter-annotator agreement", "retention at hop three"],
    value: num(0.52, 0.97, 2),
    n: num(24, 480),
    person: NAMES,
    year: YEARS,
    claim: ["structure loss compounds silently across conversion hops", "extractive grounding reduces hallucination risk", "deterministic parsing outperforms learned baselines on ruled tables", "privacy routing need not sacrifice output quality", "feature-level scoring localises degradation better than aggregate metrics"],
  },
  titles: ["Measuring {topic}: Methods and Results", "An Empirical Study of {topic}", "On {topic}: Evidence from {dataset}"],
  sections: [
    { h: "Abstract", s: [
      "We study {topic} using {method} over {dataset}.",
      "Our central finding is that {claim}.",
      "Across {n} trials, {metricName} reached {value}, exceeding the strongest baseline.",
      "We release the corpus and scoring harness to support replication.",
    ]},
    { h: "Introduction", s: [
      "Prior work on {topic} has largely reported aggregate scores, which obscure where degradation occurs.",
      "The practical motivation is direct: users convert documents through several formats and have no visibility into accumulated loss.",
      "We argue that {claim}, and we design the evaluation to test exactly this.",
      "This paper contributes {dataset}, an automated scoring pipeline, and an analysis of failure modes.",
    ]},
    { h: "Related Work", s: [
      "Earlier studies of {topic} evaluated single conversions in isolation.",
      "Benchmark efforts in adjacent areas rely on manual inspection, which does not scale past a few dozen documents.",
      "{person} and colleagues proposed a similarity-based measure, but it ignores functional elements such as links and formulas.",
      "Our protocol differs by scoring every intermediate artifact against both its predecessor and the original.",
    ]},
    { h: "Method", s: [
      "Each document is passed through a fixed conversion chain, and every hop is scored on structural, semantic, and functional dimensions.",
      "We use {method} with documents stratified by domain and complexity tier.",
      "Ground-truth feature counts are recorded at generation time, giving an exact reference for survival analysis.",
      "The scoring weights (0.35, 0.45, 0.20) follow the fidelity index definition and are held fixed across all runs.",
    ]},
    { h: "Experimental Setup", s: [
      "The corpus comprises {n} documents spanning five domains with controlled feature profiles.",
      "All conversions run on a single machine to remove infrastructure variance.",
      "We repeat the scoring pass to confirm determinism; identical inputs produce identical scores.",
      "Baselines receive the same inputs and the same extraction budget.",
    ]},
    { h: "Results", s: [
      "{metricName} averaged {value} on faithful chains and fell sharply on chains that pass through plain text.",
      "The largest single-hop drop occurs when structure must be reconstructed from an unstructured artifact.",
      "Domain effects are secondary to feature effects: table-heavy documents degrade fastest regardless of domain.",
      "These results support the claim that {claim}.",
    ]},
    { h: "Discussion", s: [
      "The gap between local and cumulative scores is the clearest signal of silent compounding loss.",
      "A practical implication is path planning: choosing the conversion order can preserve several points of fidelity.",
      "Our synthetic corpus trades naturalism for exact ground truth; we view this as the right trade for measurement studies.",
      "Failure analysis shows most semantic loss is concentrated in captions and inline emphasis rather than body prose.",
    ]},
    { h: "Limitations", s: [
      "The corpus is English-only; extension to Sinhala and Tamil is left to future work.",
      "We evaluate five formats; spreadsheet and presentation formats are out of scope.",
      "Semantic scoring depends on a sentence-embedding model and inherits its biases.",
    ]},
    { h: "Conclusion", s: [
      "We presented a reproducible protocol for {topic} and evidence that {claim}.",
      "The harness runs unattended, making regression tracking across releases practical.",
      "Future work extends the corpus and adds human validation of the automatic scores.",
    ]},
  ],
  tables: [
    { caption: "Fidelity by conversion chain", headers: ["Chain", "Structural", "Semantic", "Functional", "Overall"],
      row: (rng) => [pick(rng, ["md→html→md", "md→docx→md", "md→pdf→md", "md→txt→md", "md→html→docx→md"]), num(0.4, 1, 2)(rng), num(0.6, 1, 2)(rng), num(0.3, 1, 2)(rng), num(0.5, 1, 2)(rng)] },
    { caption: "Corpus composition", headers: ["Domain", "Docs", "Mean words", "Tables", "Links"],
      row: (rng) => [pick(rng, ["Business", "Academic", "Technical", "Legal", "Medical"]), num(10, 16)(rng), num(400, 2200)(rng), num(8, 40)(rng), num(20, 90)(rng)] },
    { caption: "Ablation results", headers: ["Variant", "Metric", "Δ vs full"],
      row: (rng) => [pick(rng, ["No structural term", "No semantic term", "No functional term", "Equal weights", "Full model"]), num(0.5, 0.95, 2)(rng), pct(-12, 3)(rng)] },
  ],
  lists: [
    { intro: "The evaluation protocol proceeds in four steps:", ordered: true, items: ["Generate the corpus with fixed seeds", "Execute each conversion chain end to end", "Score every hop against predecessor and original", "Aggregate by chain, domain, and tier"] },
    { intro: "We report the following measures:", items: ["{metricName} per chain", "Feature survival ratios for headings, tables, lists, and links", "Worst-hop location and magnitude", "Run time per conversion"] },
  ],
  quotes: [
    "Measurement without ground truth is opinion with decimal places.",
    "A benchmark that cannot be re-run is a press release, not an instrument.",
  ],
  links: [
    ["corpus release", "https://example.com/convertbench/corpus"],
    ["scoring harness", "https://example.com/convertbench/harness"],
    ["fidelity index definition", "https://example.com/sfi/spec"],
    ["baseline implementation", "https://example.com/baselines/{year}"],
    ["annotation guidelines", "https://example.com/guidelines/v2"],
    ["preregistration", "https://example.com/prereg/{year}"],
  ],
  formulas: ["$SFI = 0.35 S_s + 0.45 S_m + 0.20 S_f$", "$F_1 = \\frac{2PR}{P + R}$", "$\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i$", "$\\sigma^2 = \\frac{1}{n}\\sum (x_i - \\bar{x})^2$", "$r_k = \\prod_{j=1}^{k} (1 - c_j)$"],
  code: [
    ["python", "def retention(hops):\n    r = 1.0\n    for h in hops:\n        r *= h.local_score\n    return r"],
    ["python", "scores = [score(doc, chain) for doc in corpus]\nby_tier = groupby(scores, key=lambda s: s.tier)\nfor tier, group in by_tier:\n    print(tier, mean(g.overall for g in group))"],
  ],
};

const TECHNICAL = {
  key: "technical",
  pools: {
    service: ["the ingestion service", "the conversion worker", "the scoring API", "the queue consumer", "the render pool", "the audit logger"],
    component: ["the rate limiter", "the retry policy", "the schema validator", "the cache layer", "the health probe", "the job scheduler"],
    lang: ["TypeScript", "Python", "Go", "Rust"],
    proto: ["HTTP/2", "gRPC", "WebSocket", "REST"],
    n: num(2, 64),
    ms: num(8, 900),
    version: (rng) => `${int(rng, 1, 4)}.${int(rng, 0, 12)}.${int(rng, 0, 9)}`,
    env: ["staging", "production", "the canary ring", "the load-test rig"],
    person: NAMES,
  },
  titles: ["Runbook: {service}", "Design Note — {component}", "Migration Guide: {service} v{version}"],
  sections: [
    { h: "Overview", s: [
      "This document describes {service}, its dependencies, and the operational procedures for {env}.",
      "{service} exposes a {proto} interface and delegates heavy work to a pool of {n} workers.",
      "The design goal is predictable latency: p99 under {ms} ms with graceful degradation under load.",
      "Ownership sits with the platform team; {person} is the current on-call escalation point.",
    ]},
    { h: "Architecture", s: [
      "Requests enter through {component}, are validated against a versioned schema, and are enqueued with an idempotency key.",
      "{service} is stateless; all durable state lives in the backing store, which simplifies horizontal scaling.",
      "Failure isolation follows the bulkhead pattern: a slow dependency degrades one lane, not the whole service.",
      "The render pool is capped at {n} concurrent jobs because each job holds a headless browser instance.",
    ]},
    { h: "Configuration", s: [
      "All tunables ship with safe defaults and are overridden per environment through typed configuration.",
      "The two settings operators actually change are the worker count and the queue depth alarm threshold.",
      "Secrets are injected at runtime; nothing sensitive is present in the repository or the image.",
      "Configuration changes roll out through {env} first and bake for one release cycle.",
    ]},
    { h: "Deployment", s: [
      "Deploys are immutable: a new image is built, verified, and swapped behind the load balancer.",
      "Rollback is a pointer flip to the previous image and completes in under {ms} seconds.",
      "Database migrations run separately from code deploys and must be backward compatible for one version.",
      "The canary receives {n}% of traffic for thirty minutes before full rollout.",
    ]},
    { h: "Observability", s: [
      "Every request carries a correlation id from ingress to the final artifact.",
      "The dashboards track queue depth, conversion duration by format pair, and error rate by class.",
      "Alerts page on symptoms (latency, error budget burn) rather than causes.",
      "Structured logs are sampled at {n}% in {env} to control volume.",
    ]},
    { h: "Failure Modes", s: [
      "A wedged browser instance is detected by the watchdog and recycled within {ms} ms.",
      "If the backing store is unavailable, {service} sheds load by rejecting new work while draining in-flight jobs.",
      "Poison messages are parked on a dead-letter queue after {n} attempts with exponential backoff.",
      "Partial outages in {env} have historically traced to DNS caching in {component}.",
    ]},
    { h: "Performance", s: [
      "The steady-state benchmark sustains {n} conversions per second with p95 at {ms} ms.",
      "Memory per worker peaks during PDF rendering; the pool sizer accounts for this headroom.",
      "Batching writes to the store reduced tail latency by {ms} ms in the last release.",
      "Profiling showed serialization, not I/O, as the dominant cost in {service}.",
    ]},
    { h: "Security Notes", s: [
      "Input files are treated as hostile: parsing happens in a sandboxed process with no network egress.",
      "The service enforces a strict size cap and rejects archives that expand beyond it.",
      "Dependency updates are automated; the build fails on known-vulnerable versions.",
    ]},
  ],
  tables: [
    { caption: "Service level objectives", headers: ["Metric", "Objective", "Current", "Budget left"],
      row: (rng) => [pick(rng, ["Availability", "p99 latency", "Error rate", "Queue age", "Cold start"]), pick(rng, ["99.9%", "300 ms", "0.1%", "60 s", "2 s"]), num(0.05, 99.99, 2)(rng), pct(1, 96)(rng)] },
    { caption: "Environment matrix", headers: ["Environment", "Replicas", "Version", "Traffic"],
      row: (rng) => [pick(rng, ["dev", "staging", "canary", "prod-a", "prod-b"]), String(int(rng, 1, 12)), `${int(rng, 1, 4)}.${int(rng, 0, 12)}.${int(rng, 0, 9)}`, pct(0, 60)(rng)] },
    { caption: "Dependency inventory", headers: ["Dependency", "Purpose", "Criticality", "Fallback"],
      row: (rng) => [pick(rng, ["Object store", "Message queue", "Embedding model", "Headless browser", "Metrics sink"]), pick(rng, ["artifacts", "job dispatch", "scoring", "rendering", "telemetry"]), pick(rng, ["hard", "soft"]), pick(rng, ["retry", "degrade", "queue locally", "none"])] },
  ],
  lists: [
    { intro: "Standard incident response steps:", ordered: true, items: ["Acknowledge the page and open an incident channel", "Check {component} saturation on the primary dashboard", "Fail over {service} to the standby pool if error rate exceeds budget", "Capture a heap snapshot before recycling workers", "Write the timeline while memory is fresh"] },
    { intro: "Pre-deploy checklist:", items: ["Schema changes reviewed for backward compatibility", "Load test against {env} within {n}% of production traffic", "Rollback image verified and warm", "Feature flags default to off", "On-call briefed on the change"] },
  ],
  quotes: [
    "Hope is not a strategy; a warm rollback image is.",
    "If it is not on the dashboard, it did not happen.",
  ],
  links: [
    ["API reference", "https://example.com/docs/api/{version}"],
    ["dashboard", "https://example.com/grafana/{service}"],
    ["incident template", "https://example.com/runbooks/incident"],
    ["schema registry", "https://example.com/schemas"],
    ["load test results", "https://example.com/perf/latest"],
    ["dependency policy", "https://example.com/security/deps"],
  ],
  formulas: ["$L = \\lambda W$", "$A = \\frac{MTBF}{MTBF + MTTR}$", "$p_{99} \\leq c \\cdot \\bar{t} + k\\sigma$"],
  code: [
    ["typescript", "export async function withRetry<T>(fn: () => Promise<T>, max = 3): Promise<T> {\n  let last: unknown;\n  for (let i = 0; i < max; i++) {\n    try { return await fn(); } catch (e) { last = e; await sleep(2 ** i * 100); }\n  }\n  throw last;\n}"],
    ["python", "@app.post(\"/convert\")\nasync def convert(job: Job):\n    key = idempotency_key(job)\n    if cached := store.get(key):\n        return cached\n    result = await pool.run(job)\n    store.put(key, result, ttl=3600)\n    return result"],
    ["yaml", "resources:\n  requests:\n    memory: \"512Mi\"\n    cpu: \"250m\"\n  limits:\n    memory: \"2Gi\"\n    cpu: \"1\""],
  ],
};

const LEGAL = {
  key: "legal",
  pools: {
    partyA: ["Cendric Holdings (Private) Limited", "Bluefern Analytics Ltd", "Halden Foods PLC", "Weystone Retail (Pvt) Ltd"],
    partyB: ["Almara Logistics Ltd", "Corvid Manufacturing (Private) Limited", "Marlow Software Services Ltd", "Kestrel Facilities Group"],
    agreement: ["Master Services Agreement", "Software Licence Agreement", "Supply and Distribution Agreement", "Data Processing Agreement"],
    term: ["twenty-four (24) months", "thirty-six (36) months", "twelve (12) months"],
    days: ["fourteen (14)", "thirty (30)", "sixty (60)", "ninety (90)"],
    law: ["the laws of Sri Lanka", "the laws of England and Wales", "the laws of Singapore"],
    amount: num(250, 9500),
    year: YEARS,
    month: MONTHS,
    person: NAMES,
  },
  titles: ["{agreement} — Key Terms Summary", "Contract Review Memorandum: {agreement}", "{agreement} between {partyA} and {partyB}"],
  sections: [
    { h: "Parties and Recitals", s: [
      "This memorandum summarises the {agreement} entered into between {partyA} (the \"Provider\") and {partyB} (the \"Client\").",
      "The agreement was executed in {month} {year} and supersedes all prior arrangements between the parties on the same subject matter.",
      "Each party warrants that it has full corporate power and authority to enter into and perform the agreement.",
      "Capitalised terms used but not defined here carry the meanings given in the executed agreement.",
    ]},
    { h: "Term and Renewal", s: [
      "The initial term is {term} from the effective date, renewing automatically for successive one-year periods unless notice is given.",
      "Either party may elect not to renew by written notice at least {days} days before the end of the then-current term.",
      "Early termination for convenience requires {days} days' notice and payment of the wind-down costs set out in Schedule 3.",
    ]},
    { h: "Fees and Payment", s: [
      "The Client shall pay fees of LKR {amount} thousand per month, invoiced in arrears.",
      "Invoices are payable within {days} days of receipt; disputed amounts must be notified within {days} days or are deemed accepted.",
      "Late payment accrues interest at the statutory rate; the Provider may suspend services after two consecutive missed invoices.",
      "Fees are reviewed annually and any increase is capped at the published inflation index plus two percentage points.",
    ]},
    { h: "Service Levels", s: [
      "The Provider commits to the availability and response targets in Schedule 2, measured monthly.",
      "Service credits are the Client's sole remedy for missed targets, save where a persistent failure triggers termination rights.",
      "A persistent failure means three consecutive months below target, entitling the Client to terminate on {days} days' notice.",
    ]},
    { h: "Confidentiality", s: [
      "Each party shall keep the other's confidential information secret and use it solely to perform the agreement.",
      "The obligation survives termination for a period of {term}.",
      "Disclosure is permitted where required by law, provided the disclosing party gives prompt notice where lawful to do so.",
      "On termination each party shall return or destroy confidential materials within {days} days upon written request.",
    ]},
    { h: "Data Protection", s: [
      "The Provider processes personal data only on documented instructions from the Client.",
      "Sub-processors may be engaged with prior written notice; the Client may object on reasonable grounds within {days} days.",
      "The Provider shall notify the Client of a personal data breach without undue delay and in any event within seventy-two hours.",
      "International transfers require safeguards recognised under applicable data protection law.",
    ]},
    { h: "Liability", s: [
      "Neither party excludes liability for death, personal injury, or fraud.",
      "Subject to the foregoing, each party's aggregate liability is capped at the fees paid in the twelve months preceding the claim.",
      "Neither party is liable for indirect or consequential loss, including loss of profit or anticipated savings.",
      "The cap does not apply to breaches of the confidentiality or data protection clauses.",
    ]},
    { h: "Termination and Consequences", s: [
      "Either party may terminate for material breach not remedied within {days} days of written notice.",
      "Insolvency events give the solvent party an immediate termination right.",
      "On termination, accrued rights survive, and the exit assistance obligations in Schedule 4 apply for {days} days.",
    ]},
    { h: "Governing Law and Disputes", s: [
      "The agreement is governed by {law}.",
      "Disputes escalate first to senior representatives, then to mediation, before either party may commence proceedings.",
      "The escalation timetable allows {days} days at each stage unless the parties agree otherwise in writing.",
    ]},
  ],
  tables: [
    { caption: "Schedule summary", headers: ["Schedule", "Subject", "Status"],
      row: (rng) => [`Schedule ${int(rng, 1, 6)}`, pick(rng, ["Services description", "Service levels", "Charges", "Exit assistance", "Security measures", "Sub-processors"]), pick(rng, ["Agreed", "Under review", "To be drafted"])] },
    { caption: "Notice periods", headers: ["Event", "Notice required", "Clause"],
      row: (rng) => [pick(rng, ["Non-renewal", "Termination for convenience", "Material breach cure", "Sub-processor objection", "Fee dispute"]), pick(rng, ["14 days", "30 days", "60 days", "90 days"]), `${int(rng, 3, 14)}.${int(rng, 1, 6)}`] },
    { caption: "Risk allocation", headers: ["Risk", "Borne by", "Cap applies"],
      row: (rng) => [pick(rng, ["Data breach", "Service failure", "IP infringement", "Regulatory fine", "Third-party claim"]), pick(rng, ["Provider", "Client", "Shared"]), pick(rng, ["Yes", "No"])] },
  ],
  lists: [
    { intro: "Conditions precedent to go-live:", ordered: true, items: ["Execution of the {agreement} by both parties", "Delivery of the security questionnaire responses", "Approval of the sub-processor list", "Completion of the data protection impact assessment", "Receipt of the first invoice deposit"] },
    { intro: "Open points for negotiation:", items: ["The liability cap multiplier proposed by {partyB}", "Audit rights frequency (currently annual)", "The definition of \"material breach\" in clause 12", "Exit assistance charges basis", "Jurisdiction carve-out for injunctive relief"] },
  ],
  quotes: [
    "Nothing in this agreement creates a partnership, joint venture, or agency relationship between the parties.",
    "Time is of the essence only where expressly stated.",
  ],
  links: [
    ["executed agreement (repository)", "https://example.com/contracts/{year}/master"],
    ["schedule 2 — service levels", "https://example.com/contracts/schedules/2"],
    ["data processing terms", "https://example.com/legal/dpa"],
    ["escalation contacts", "https://example.com/legal/contacts"],
    ["precedent clause bank", "https://example.com/legal/clauses"],
  ],
  formulas: ["$C = \\min(F_{12}, L)$", "$SC = R \\times \\frac{D}{M}$"],
  code: null,
};

const MEDICAL = {
  key: "medical",
  pools: {
    unitName: ["the outpatient clinic", "the surgical ward", "the emergency department", "the cardiology unit", "the community health programme"],
    condition: ["type 2 diabetes", "hypertension", "chronic kidney disease", "asthma", "ischaemic heart disease"],
    measureName: ["HbA1c", "systolic blood pressure", "eGFR", "peak expiratory flow", "LDL cholesterol"],
    n: num(40, 900),
    pctv: pct(3, 38),
    months: ["three", "six", "twelve"],
    person: NAMES,
    year: YEARS,
    month: MONTHS,
    intervention: ["a nurse-led follow-up protocol", "a medication reconciliation round", "an SMS appointment reminder system", "a structured discharge checklist", "a dietician referral pathway"],
  },
  titles: ["Quality Improvement Report: {unitName}", "Clinical Audit — {condition} Management, {year}", "Service Evaluation: {intervention}"],
  sections: [
    { h: "Background", s: [
      "This audit examines the management of {condition} in {unitName} against the agreed care standard.",
      "Baseline review in {month} {year} suggested variation in follow-up intervals and documentation quality.",
      "The service introduced {intervention} to address gaps identified in the previous cycle.",
      "The audit standard requires {measureName} to be recorded at every scheduled review.",
    ]},
    { h: "Objectives", s: [
      "To measure documentation completeness for patients with {condition} over a {months}-month window.",
      "To compare {measureName} recording rates before and after {intervention}.",
      "To identify process factors associated with missed reviews in {unitName}.",
    ]},
    { h: "Methods", s: [
      "Records of {n} consecutive patients were reviewed using a structured extraction form.",
      "Two reviewers extracted data independently; disagreements were resolved by discussion.",
      "The primary outcome was the proportion of reviews where {measureName} was recorded.",
      "No patient-identifiable information leaves the clinical system; results are reported in aggregate only.",
    ]},
    { h: "Results", s: [
      "Documentation completeness improved by {pctv} after {intervention} was introduced.",
      "{measureName} was recorded in {pctv} of reviews in the post-intervention period.",
      "Missed reviews clustered in patients booked through {unitName} on Fridays.",
      "Median time to follow-up fell from {n} days to a level within the standard.",
    ]},
    { h: "Discussion", s: [
      "The improvement is consistent with published experience of {intervention} in comparable settings.",
      "Sustainability depends on the reminder step remaining part of routine workflow rather than individual effort.",
      "The audit cannot attribute causation; concurrent staffing changes in {unitName} may contribute.",
      "Data quality remains the main constraint on measuring {condition} outcomes at scale.",
    ]},
    { h: "Recommendations", s: [
      "Embed {intervention} in the standard operating procedure for {unitName}.",
      "Re-audit in {months} months using the same extraction form to confirm the gain holds.",
      "Nominate {person} as the named lead for the next cycle.",
      "Add {measureName} to the mandatory field set in the clinic template.",
    ]},
    { h: "Governance", s: [
      "The audit was registered with the clinical governance office in {month} {year}.",
      "As a service evaluation using aggregate data, individual consent was not required under the local policy.",
      "Results were presented at the quality meeting and accepted by the divisional lead.",
    ]},
  ],
  tables: [
    { caption: "Audit results by cycle", headers: ["Cycle", "Records", "Complete (%)", "Standard met"],
      row: (rng) => [pick(rng, ["Baseline", "Cycle 1", "Cycle 2", "Re-audit"]), String(int(rng, 40, 400)), num(48, 99, 1)(rng), pick(rng, ["Yes", "No", "Partial"])] },
    { caption: "Outcome measures", headers: ["Measure", "Before", "After", "Change"],
      row: (rng) => [pick(rng, ["HbA1c recorded", "BP recorded", "Follow-up ≤ 90 days", "Medication reviewed", "Smoking status noted"]), pct(35, 75)(rng), pct(60, 98)(rng), pct(2, 40)(rng)] },
    { caption: "Action plan", headers: ["Action", "Owner", "Due", "Status"],
      row: (rng) => [pick(rng, ["Update clinic template", "Brief reception team", "Amend booking rules", "Schedule re-audit", "Report to governance"]), pick(rng, NAMES), `${pick(rng, MONTHS)} ${pick(rng, YEARS)}`, pick(rng, ["Open", "In progress", "Done"])] },
  ],
  lists: [
    { intro: "Inclusion criteria for record review:", items: ["Adults with a coded diagnosis of {condition}", "At least one scheduled review in the audit window", "Registered with {unitName} for the full period", "Complete demographic record"] },
    { intro: "Audit cycle steps:", ordered: true, items: ["Agree the standard and criteria", "Collect baseline data", "Implement {intervention}", "Re-measure against the standard", "Report and embed the change"] },
  ],
  quotes: [
    "Audit measures whether we do what we already agree we should do; research asks what we should do.",
    "No data leaves the clinical system: the unit of reporting is the service, never the patient.",
  ],
  links: [
    ["care standard reference", "https://example.com/standards/{year}"],
    ["extraction form", "https://example.com/audit/forms/extraction"],
    ["governance registration", "https://example.com/governance/audit-register"],
    ["previous cycle report", "https://example.com/audit/{year}/previous"],
    ["quality dashboard", "https://example.com/quality/dashboard"],
  ],
  formulas: ["$p = \\frac{n_{complete}}{n_{total}}$", "$\\Delta = p_{after} - p_{before}$"],
  code: null,
};

const DOMAINS = [BUSINESS, ACADEMIC, TECHNICAL, LEGAL, MEDICAL];

// ── Tier profiles ──────────────────────────────────────────────────────────────

const TIERS = {
  simple:   { count: 4, sections: [2, 3], sentPerPara: [2, 3], parasPerSection: [1, 2], lists: [1, 1], tables: [0, 1], links: [1, 2], formulas: [0, 0], code: [0, 0], quotes: [0, 0], h3: false, tableRows: [3, 4] },
  moderate: { count: 5, sections: [4, 5], sentPerPara: [3, 4], parasPerSection: [1, 2], lists: [2, 2], tables: [1, 2], links: [3, 5], formulas: [1, 2], code: [0, 1], quotes: [1, 1], h3: true,  tableRows: [4, 6] },
  complex:  { count: 4, sections: [6, 8], sentPerPara: [3, 5], parasPerSection: [2, 3], lists: [3, 4], tables: [3, 4], links: [6, 9], formulas: [2, 4], code: [1, 2], quotes: [1, 2], h3: true,  tableRows: [5, 8] },
};

// ── Document assembly ──────────────────────────────────────────────────────────

function buildTable(rng, spec, rows) {
  const lines = [];
  lines.push(`| ${spec.headers.join(" | ")} |`);
  lines.push(`| ${spec.headers.map(() => "---").join(" | ")} |`);
  for (let i = 0; i < rows; i++) lines.push(`| ${spec.row(rng).join(" | ")} |`);
  return `**${spec.caption}**\n\n${lines.join("\n")}`;
}

function buildList(rng, domain, spec) {
  const items = shuffled(rng, spec.items).slice(0, int(rng, 3, Math.min(5, spec.items.length)));
  const lines = items.map((it, i) => (spec.ordered ? `${i + 1}. ${fill(rng, it, domain.pools)}` : `- ${fill(rng, it, domain.pools)}`));
  return `${fill(rng, spec.intro, domain.pools)}\n\n${lines.join("\n")}`;
}

function buildParagraph(rng, domain, section, nSents, usedSentences) {
  const pool = shuffled(rng, section.s.map((_, i) => i)).filter((i) => !usedSentences.has(`${section.h}:${i}`));
  const chosen = pool.length >= nSents ? pool.slice(0, nSents) : shuffled(rng, section.s.map((_, i) => i)).slice(0, nSents);
  chosen.forEach((i) => usedSentences.add(`${section.h}:${i}`));
  return chosen.map((i) => fill(rng, section.s[i], domain.pools)).join(" ");
}

/** Weave a markdown link into a sentence appended to a paragraph. */
function linkSentence(rng, domain) {
  const [text, url] = pick(rng, domain.links);
  const filled = fill(rng, url, domain.pools);
  const leads = ["Details are recorded in the", "See the", "Supporting material is available in the", "The full context is in the", "Reference data lives in the"];
  return `${pick(rng, leads)} [${fill(rng, text, domain.pools)}](${filled}).`;
}

function formulaSentence(rng, domain) {
  const f = pick(rng, domain.formulas);
  const leads = [
    `The governing relation is ${f}.`,
    `We compute this as ${f}.`,
    `Formally, ${f}, with terms as defined above.`,
    `The applicable formula is ${f}.`,
  ];
  return pick(rng, leads);
}

function generateDoc(domain, tier, tierName, docId) {
  const rng = mulberry32(hashSeed(docId));
  const p = domain.pools;

  const title = fill(rng, pick(rng, domain.titles), p);
  const nSections = int(rng, ...tier.sections);
  const sections = shuffled(rng, domain.sections).slice(0, nSections);
  // Preserve the domain's natural section order (Abstract before Conclusion etc.).
  sections.sort((a, b) => domain.sections.indexOf(a) - domain.sections.indexOf(b));

  const nLists = int(rng, ...tier.lists);
  const nTables = Math.min(int(rng, ...tier.tables), domain.tables.length * 2);
  const nLinks = int(rng, ...tier.links);
  const nFormulas = domain.formulas ? int(rng, ...tier.formulas) : 0;
  const nCode = domain.code ? int(rng, ...tier.code) : 0;
  const nQuotes = int(rng, ...tier.quotes);

  // Distribute features across sections deterministically.
  const slots = { list: nLists, table: nTables, link: nLinks, formula: nFormulas, code: nCode, quote: nQuotes };
  const usedSentences = new Set();
  const usedTables = [];

  const parts = [`# ${title}`];
  parts.push(buildParagraph(rng, domain, sections[0], int(rng, ...tier.sentPerPara), usedSentences));

  sections.forEach((section, si) => {
    parts.push(`## ${section.h}`);
    const nParas = int(rng, ...tier.parasPerSection);
    for (let pi = 0; pi < nParas; pi++) {
      let para = buildParagraph(rng, domain, section, int(rng, ...tier.sentPerPara), usedSentences);
      // Attach links/formulas as extra sentences inside paragraphs.
      if (slots.link > 0 && rng() < 0.65) { para += " " + linkSentence(rng, domain); slots.link--; }
      if (slots.formula > 0 && rng() < 0.45) { para += " " + formulaSentence(rng, domain); slots.formula--; }
      parts.push(para);
    }
    // Subsection with H3 for richer docs.
    if (tier.h3 && rng() < 0.4 && si < sections.length - 1) {
      const sub = pick(rng, ["Detail", "Notes", "Breakdown", "Supporting Evidence", "Timeline"]);
      parts.push(`### ${section.h} — ${sub}`);
      parts.push(buildParagraph(rng, domain, section, int(rng, ...tier.sentPerPara), usedSentences));
    }
    if (slots.quote > 0 && rng() < 0.5) {
      parts.push(`> ${fill(rng, pick(rng, domain.quotes), p)}`);
      slots.quote--;
    }
    if (slots.list > 0 && rng() < 0.7) {
      parts.push(buildList(rng, domain, pick(rng, domain.lists)));
      slots.list--;
    }
    if (slots.table > 0 && rng() < 0.7) {
      const available = domain.tables.filter((t) => usedTables.filter((u) => u === t).length < 2);
      const spec = pick(rng, available.length ? available : domain.tables);
      usedTables.push(spec);
      parts.push(buildTable(rng, spec, int(rng, ...tier.tableRows)));
      slots.table--;
    }
    if (slots.code > 0 && domain.code && rng() < 0.6) {
      const [lang, src] = pick(rng, domain.code);
      parts.push(`\`\`\`${lang}\n${src}\n\`\`\``);
      slots.code--;
    }
  });

  // Flush any unplaced feature slots at the end so counts hit their targets.
  while (slots.link > 0) { parts.push(linkSentence(rng, domain)); slots.link--; }
  while (slots.formula > 0) { parts.push(formulaSentence(rng, domain)); slots.formula--; }
  while (slots.list > 0) { parts.push(buildList(rng, domain, pick(rng, domain.lists))); slots.list--; }
  while (slots.table > 0) { parts.push(buildTable(rng, pick(rng, domain.tables), int(rng, ...tier.tableRows))); slots.table--; }
  while (slots.quote > 0) { parts.push(`> ${fill(rng, pick(rng, domain.quotes), p)}`); slots.quote--; }
  while (slots.code > 0 && domain.code) { const [lang, src] = pick(rng, domain.code); parts.push(`\`\`\`${lang}\n${src}\n\`\`\``); slots.code--; }

  return { id: docId, title, markdown: parts.join("\n\n") + "\n" };
}

// ── Ground-truth feature counter (mirrors SFI md extractor regexes) ────────────

export function countFeatures(md) {
  const noCode = md.replace(/```[\s\S]*?```/g, "");
  const headings = (noCode.match(/^#{1,6}\s/gm) ?? []).length;
  const separators = (noCode.match(/^\|[\s\-:|]+\|$/gm) ?? []).length; // one per table
  const pipeRows = (noCode.match(/^\|.+\|$/gm) ?? []).length;
  const tables = Math.min(pipeRows, separators);
  const listItems = (noCode.match(/^\s*(?:[-*+]\s|\d+\.\s)/gm) ?? []).length;
  const links = (noCode.match(/\[.+?\]\(.+?\)/g) ?? []).length;
  const formulas = (noCode.match(/\$[^$\n]+\$/g) ?? []).length;
  const codeBlocks = (md.match(/^```/gm) ?? []).length / 2;
  const blockquotes = (noCode.match(/^>\s/gm) ?? []).length;
  const words = (noCode.replace(/[#>*`|\-]/g, " ").match(/\S+/g) ?? []).length;
  return { headings, tables, tableRows: pipeRows - 2 * tables, listItems, links, formulas, codeBlocks, blockquotes, words };
}

// ── Main ───────────────────────────────────────────────────────────────────────

function main() {
  rmSync(DOCS_DIR, { recursive: true, force: true });
  mkdirSync(DOCS_DIR, { recursive: true });

  const manifest = [];
  for (const domain of DOMAINS) {
    for (const [tierName, tier] of Object.entries(TIERS)) {
      for (let i = 1; i <= tier.count; i++) {
        const docId = `${domain.key}-${tierName[0]}${i}`;
        const doc = generateDoc(domain, tier, tierName, docId);
        writeFileSync(join(DOCS_DIR, `${docId}.md`), doc.markdown, "utf8");
        manifest.push({
          id: docId,
          domain: domain.key,
          tier: tierName,
          title: doc.title,
          bytes: Buffer.byteLength(doc.markdown, "utf8"),
          features: countFeatures(doc.markdown),
        });
      }
    }
  }

  writeFileSync(join(ROOT, "manifest.json"), JSON.stringify({
    name: "ConvertBench-lite corpus",
    version: "1.0",
    generated: "deterministic (seeded per doc id; regenerate with bench/corpus/generate.mjs)",
    domains: DOMAINS.map((d) => d.key),
    tiers: Object.fromEntries(Object.entries(TIERS).map(([k, v]) => [k, v.count])),
    docCount: manifest.length,
    docs: manifest,
  }, null, 2), "utf8");

  const byTier = {};
  for (const m of manifest) byTier[m.tier] = (byTier[m.tier] ?? 0) + 1;
  const totals = manifest.reduce((acc, m) => {
    for (const [k, v] of Object.entries(m.features)) acc[k] = (acc[k] ?? 0) + v;
    return acc;
  }, {});
  console.log(`Generated ${manifest.length} docs →`, byTier);
  console.log("Corpus totals:", totals);
}

main();
