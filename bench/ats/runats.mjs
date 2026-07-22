/**
 * ConvertBench-lite — ATS scorer consistency / invariance bench.
 *
 * The ATS scorer's selling point over black-box LLM scorers is determinism and
 * explainability. This bench measures exactly that, on 3 synthetic CV/JD pairs:
 *
 *   1. DETERMINISM     — the same CV+JD scored 5× must produce byte-identical
 *                        reports (any variance is a defect).
 *   2. COSMETIC        — bullet-glyph swaps (- vs *) and extra blank lines must
 *      INVARIANCE        not move the overall score.
 *   3. SECTION-ORDER   — swapping Experience/Education order must not change
 *      INVARIANCE        skills/keyword scores (format score may legitimately
 *                        move if section detection depends on position).
 *   4. ALIAS           — writing "JS, postgres, k8s" instead of "JavaScript,
 *      CONSISTENCY       PostgreSQL, Kubernetes" must match the same skills.
 *   5. MONOTONICITY    — adding a JD-required skill the CV lacks must not
 *                        DECREASE the overall score.
 *
 * CVs are authored in markdown and converted to DOCX through the production
 * /api/convert pipeline; scoring calls the production /api/ats-analyze.
 *
 * Usage: node bench/ats/runats.mjs   (needs :3000 and :8000)
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BENCH = dirname(dirname(fileURLToPath(import.meta.url)));
const RESULTS = join(BENCH, "results");
const SERVER = process.env.BENCH_SERVER ?? "http://localhost:3000";
const PYTHON = process.env.PYTHON_BACKEND_URL ?? "http://localhost:8000";

// ── Fixtures ───────────────────────────────────────────────────────────────────

const CV_DEV = `# Kasun Weerasinghe

Colombo, Sri Lanka · kasun.w@example.com · +94 71 555 0101

## Summary

Full-stack developer with four years building web applications for retail and logistics clients. Comfortable owning features end to end, from schema design to deployment.

## Experience

### Software Engineer — Bluefern Analytics (2022–present)

- Built dashboard features in React and TypeScript used by 40 enterprise clients
- Designed REST APIs in Node.js backed by PostgreSQL and Redis
- Moved CI to GitHub Actions with Docker-based builds, halving release time
- Mentored two interns through their first production features

### Junior Developer — Weystone Retail (2020–2022)

- Maintained the order-management system in Python and Django
- Wrote ETL jobs loading nightly sales data into the reporting warehouse
- Added integration tests that caught three regressions before release

## Education

BSc in Computer Science, University of Colombo, 2020

## Skills

JavaScript, TypeScript, React, Node.js, Python, Django, PostgreSQL, Redis, Docker, Git, GitHub Actions, REST APIs, agile
`;

const JD_DEV = `Senior Software Engineer — product team.
We need a developer strong in React, TypeScript and Node.js to own customer-facing features.
You will design PostgreSQL schemas, build REST APIs, containerise services with Docker, and ship through CI/CD pipelines.
Experience with Kubernetes, AWS, and GraphQL is a plus. Agile team, code review culture, mentoring expected.`;

const CV_ANALYST = `# Dilini Herath

Kandy, Sri Lanka · dilini.h@example.com · 077 555 0202

## Summary

Data analyst turning messy operational data into decisions. Three years across manufacturing and telecom reporting.

## Experience

### Data Analyst — Corvid Manufacturing (2023–present)

- Built production-quality dashboards in Power BI tracking yield and downtime
- Automated weekly reporting with Python and pandas, saving a day per week
- Modelled defect drivers with scikit-learn; findings cut rework by 9%

### Reporting Executive — LankaTel (2021–2023)

- Maintained SQL Server reporting marts and wrote complex T-SQL
- Migrated legacy Excel reports into a governed semantic model

## Education

BSc in Statistics, University of Peradeniya, 2021

## Skills

SQL, Python, pandas, Power BI, Excel, statistics, data visualization, scikit-learn, ETL
`;

const JD_ANALYST = `Data Analyst — operations intelligence.
Must have strong SQL and Python (pandas), dashboarding in Power BI or Tableau, and solid statistics.
You will build ETL pipelines, define KPIs with stakeholders, and present insights to leadership.
Machine learning exposure (scikit-learn) and cloud warehouse experience (Snowflake, BigQuery) are advantages.`;

const CV_OPS = `# Ruwan Abeykoon

Galle, Sri Lanka · ruwan.a@example.com · 071 555 0303

## Summary

Operations manager with seven years in warehousing and last-mile delivery. Led teams of up to 45.

## Experience

### Operations Manager — Almara Logistics (2021–present)

- Ran three regional depots handling 12,000 parcels daily
- Introduced route optimisation that cut fuel cost per parcel by 14%
- Led the WMS migration project across all depots with zero lost days
- Negotiated carrier contracts and managed vendor SLAs

### Depot Supervisor — Halden Foods (2018–2021)

- Supervised cold-chain receiving and dispatch for the southern region
- Built the daily staffing model balancing seasonal demand

## Education

Diploma in Logistics Management, SLIIT, 2018

## Skills

operations management, logistics, supply chain, warehouse management, KPI reporting, vendor management, team leadership, project management, Excel
`;

const JD_OPS = `Regional Operations Manager.
Seven-plus years in logistics or supply chain operations, leading multi-site teams.
Must show vendor management, KPI reporting, project management and warehouse management systems experience.
Lean or Six Sigma certification and ERP exposure (SAP) are pluses. Strong Excel expected.`;

const PAIRS = [
  { id: "dev", cv: CV_DEV, jd: JD_DEV, aliasSwaps: [["JavaScript", "JS"], ["PostgreSQL", "postgres"], ["GitHub Actions", "gh actions"]], addSkill: "Kubernetes" },
  { id: "analyst", cv: CV_ANALYST, jd: JD_ANALYST, aliasSwaps: [["Python", "python3"], ["Power BI", "PowerBI"], ["scikit-learn", "sklearn"]], addSkill: "Tableau" },
  { id: "ops", cv: CV_OPS, jd: JD_OPS, aliasSwaps: [["Excel", "MS Excel"], ["project management", "Project Management"]], addSkill: "Six Sigma" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

async function mdToDocx(md) {
  const r = await fetch(`${SERVER}/api/convert`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileBase64: Buffer.from(md).toString("base64"), fileName: "cv.md", fromFormat: "md", toFormat: "docx" }),
  });
  const j = await r.json();
  if (!j.success) throw new Error(j.error);
  return Buffer.from(j.fileBase64, "base64");
}

async function scoreAts(docx, jd) {
  const form = new FormData();
  const copy = new Uint8Array(docx.byteLength); copy.set(docx);
  form.append("file", new Blob([copy.buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), "cv.docx");
  form.append("jd", jd);
  const r = await fetch(`${PYTHON}/api/ats-analyze`, { method: "POST", body: form });
  if (!r.ok) throw new Error(`ats-analyze ${r.status}: ${await r.text()}`);
  return r.json();
}

/** Stable serialization of the score-bearing parts of a report. */
const scoreKey = (rep) => JSON.stringify({
  overall: rep.overall, scores: rep.scores,
  matched: [...(rep.skills?.matched ?? [])].sort(),
  missing: [...(rep.skills?.missing ?? [])].sort(),
});

const overall = (rep) => rep.overall ?? rep.overall_score;

// Perturbations
const swapBullets = (md) => md.replace(/^- /gm, "* ");
const extraBlankLines = (md) => md.replace(/\n\n/g, "\n\n\n");
function swapSections(md) {
  const exp = md.match(/## Experience[\s\S]*?(?=## Education)/);
  const edu = md.match(/## Education[\s\S]*?(?=## Skills)/);
  if (!exp || !edu) throw new Error("section swap failed");
  return md.replace(exp[0], "@@EXP@@").replace(edu[0], "@@EDU@@").replace("@@EXP@@", edu[0]).replace("@@EDU@@", exp[0]);
}
const applyAliases = (md, swaps) => swaps.reduce((m, [full, alias]) => m.split(full).join(alias), md);
const addSkillTo = (md, skill) => md.replace(/^## Skills\n\n(.*)$/m, (_, line) => `## Skills\n\n${line}, ${skill}`);

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(RESULTS, { recursive: true });
  const rows = [];
  const issues = [];

  for (const pair of PAIRS) {
    const baseDocx = await mdToDocx(pair.cv);

    // 1. Determinism: 5 identical scoring calls.
    const reps = [];
    for (let i = 0; i < 5; i++) reps.push(await scoreAts(baseDocx, pair.jd));
    const keys = new Set(reps.map(scoreKey));
    const deterministic = keys.size === 1;
    if (!deterministic) issues.push(`${pair.id}: determinism FAILED (${keys.size} distinct reports)`);
    const base = reps[0];

    // 2-5. Perturbations.
    const variants = {
      bullets: swapBullets(pair.cv),
      blanks: extraBlankLines(pair.cv),
      sections: swapSections(pair.cv),
      aliases: applyAliases(pair.cv, pair.aliasSwaps),
      addskill: addSkillTo(pair.cv, pair.addSkill),
    };
    const scored = {};
    for (const [name, md] of Object.entries(variants)) {
      scored[name] = await scoreAts(await mdToDocx(md), pair.jd);
    }

    const d = (rep) => +(overall(rep) - overall(base)).toFixed(2);
    const matchedSet = (rep) => new Set(rep.skills?.matched ?? []);
    const aliasSame =
      [...matchedSet(scored.aliases)].sort().join(",") === [...matchedSet(base)].sort().join(",");
    const monotonic = overall(scored.addskill) >= overall(base);
    if (Math.abs(d(scored.bullets)) > 1) issues.push(`${pair.id}: bullet swap moved score by ${d(scored.bullets)}`);
    if (Math.abs(d(scored.blanks)) > 1) issues.push(`${pair.id}: blank lines moved score by ${d(scored.blanks)}`);
    if (!aliasSame) {
      const a = [...matchedSet(base)].filter((s) => !matchedSet(scored.aliases).has(s));
      issues.push(`${pair.id}: alias variant lost skills: ${a.join(", ") || "(gained extras)"}`);
    }
    if (!monotonic) issues.push(`${pair.id}: adding ${pair.addSkill} DECREASED score (${overall(base)} → ${overall(scored.addskill)})`);

    rows.push({
      pair: pair.id,
      base_overall: overall(base),
      deterministic: deterministic ? "yes" : "NO",
      d_bullets: d(scored.bullets),
      d_blanks: d(scored.blanks),
      d_sections: d(scored.sections),
      d_aliases: d(scored.aliases),
      alias_skills_identical: aliasSame ? "yes" : "NO",
      d_addskill: d(scored.addskill),
      monotonic: monotonic ? "yes" : "NO",
    });
    console.log(`${pair.id}: base=${overall(base)} det=${deterministic} Δbullets=${d(scored.bullets)} Δblanks=${d(scored.blanks)} Δsections=${d(scored.sections)} Δaliases=${d(scored.aliases)} Δ+${pair.addSkill}=${d(scored.addskill)}`);
  }

  const headers = Object.keys(rows[0]);
  writeFileSync(join(RESULTS, "ats_consistency.csv"),
    [headers.join(","), ...rows.map((r) => headers.map((h) => r[h]).join(","))].join("\n") + "\n", "utf8");
  writeFileSync(join(RESULTS, "ats_summary.json"), JSON.stringify({ rows, issues }, null, 2), "utf8");

  console.log(issues.length ? `\n${issues.length} issues:\n  ` + issues.join("\n  ") : "\nAll invariance checks passed.");
  console.log("Wrote ats_consistency.csv, ats_summary.json");
}

main();
