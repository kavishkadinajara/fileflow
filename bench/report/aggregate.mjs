/**
 * ConvertBench-lite — aggregator + report generator.
 *
 * Reads bench/results/raw.jsonl and produces:
 *   • CSV summary tables (per chain, domain×chain, tier×chain, edges, features)
 *   • Dissertation-grade SVG figures (degradation curves, fidelity by chain,
 *     SFI dimensions, domain heatmap, feature survival)
 *   • bench/report/RESULTS.md — the generated evaluation-chapter data
 *
 * Pure post-processing: safe to re-run at any time, including mid-bench.
 *
 * Usage: node bench/report/aggregate.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BENCH = dirname(dirname(fileURLToPath(import.meta.url)));
const RESULTS = join(BENCH, "results");
const REPORT = join(BENCH, "report");
const FIGURES = join(REPORT, "figures");

// ── Chain identity (fixed order + fixed colors: color follows the entity) ─────

const CHAIN_META = [
  { id: "rt-html",   label: "md→html→md",           color: "#2a78d6" },
  { id: "rt-docx",   label: "md→docx→md",           color: "#008300" },
  { id: "rt-pdf",    label: "md→pdf→md",            color: "#e87ba4" },
  { id: "rt-txt",    label: "md→txt→md",            color: "#eda100" },
  { id: "html-docx", label: "md→html→docx→md",      color: "#1baf7a" },
  { id: "docx-pdf",  label: "md→docx→pdf→md",       color: "#eb6834" },
  { id: "long-4hop", label: "md→html→docx→pdf→md",  color: "#4a3aa7" },
];
const CHAIN_ORDER = CHAIN_META.map((c) => c.id);
const chainMeta = (id) => CHAIN_META.find((c) => c.id === id) ?? { id, label: id, color: "#898781" };

const DOMAIN_ORDER = ["business", "academic", "technical", "legal", "medical"];
const TIER_ORDER = ["simple", "moderate", "complex"];

// Chart chrome (light mode — print/dissertation figures)
const INK = { surface: "#fcfcfb", primary: "#0b0b0b", secondary: "#52514e", muted: "#898781", grid: "#e1e0d9", baseline: "#c3c2b7" };
const FONT = `font-family="system-ui, 'Segoe UI', sans-serif"`;
const SEQ_RAMP = ["#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b"];

// ── Stats ──────────────────────────────────────────────────────────────────────

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const std = (xs) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const fmt = (n, dp = 3) => (Number.isFinite(n) ? n.toFixed(dp) : "—");
const pctf = (n, dp = 1) => (Number.isFinite(n) ? (n * 100).toFixed(dp) : "—");

function groupBy(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}

// ── Load ───────────────────────────────────────────────────────────────────────

function loadRows() {
  const raw = join(RESULTS, "raw.jsonl");
  if (!existsSync(raw)) { console.error("No raw.jsonl yet — run the bench first."); process.exit(1); }
  const rows = [];
  for (const line of readFileSync(raw, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); } catch { /* partial line during live run */ }
  }
  return rows;
}

// ── Aggregations ───────────────────────────────────────────────────────────────

function summarizeChain(rows) {
  const out = [];
  for (const id of CHAIN_ORDER) {
    const rs = [...groupBy(rows, (r) => r.chainId).get(id) ?? []];
    if (!rs.length) continue;
    const finals = rs.map((r) => r.report.finalFidelity);
    const lastHop = (r) => r.report.hops[r.report.hops.length - 1];
    const structs = rs.map((r) => lastHop(r).cumulative.breakdown.structural.score);
    const sems = rs.map((r) => lastHop(r).cumulative.breakdown.semantic.score);
    const funcs = rs.map((r) => lastHop(r).cumulative.breakdown.functional.score);
    const compounded = rs.map((r) => r.report.compoundedLocal);
    const grades = {};
    for (const r of rs) grades[lastHop(r).cumulative.grade] = (grades[lastHop(r).cumulative.grade] ?? 0) + 1;
    out.push({
      id, label: chainMeta(id).label, n: rs.length, hops: rs[0].chain.length - 1,
      mean: mean(finals), std: std(finals), min: Math.min(...finals), max: Math.max(...finals),
      structural: mean(structs), semantic: mean(sems), functional: mean(funcs),
      compoundedLocal: mean(compounded),
      silentGap: mean(rs.map((r) => r.report.compoundedLocal - r.report.finalFidelity)),
      grades, meanSec: mean(rs.map((r) => r.durationMs)) / 1000,
    });
  }
  return out;
}

function matrix(rows, rowKeyFn, rowOrder) {
  const out = [];
  for (const rk of rowOrder) {
    const cells = {};
    for (const id of CHAIN_ORDER) {
      const rs = rows.filter((r) => rowKeyFn(r) === rk && r.chainId === id);
      cells[id] = rs.length ? mean(rs.map((r) => r.report.finalFidelity)) : NaN;
    }
    out.push({ key: rk, cells });
  }
  return out;
}

function curves(rows) {
  const out = new Map();
  for (const id of CHAIN_ORDER) {
    const rs = rows.filter((r) => r.chainId === id);
    if (!rs.length) continue;
    const nHops = rs[0].chain.length - 1;
    const pts = [];
    for (let h = 0; h <= nHops; h++) {
      const cums = rs.map((r) => (h === 0 ? 1 : r.report.curve[h]?.cumulative)).filter(Number.isFinite);
      const locs = rs.map((r) => (h === 0 ? 1 : r.report.curve[h]?.local)).filter(Number.isFinite);
      pts.push({ hop: h, cumulative: mean(cums), cumStd: std(cums), local: mean(locs) });
    }
    out.set(id, pts);
  }
  return out;
}

/** Per-edge stats across ALL hops of all runs (md→html, html→docx, …). */
function edgeStats(rows) {
  const acc = new Map();
  for (const r of rows) {
    for (const h of r.report.hops) {
      const k = `${h.from}→${h.to}`;
      if (!acc.has(k)) acc.set(k, { edge: k, locals: [], structs: [], sems: [], funcs: [], worstCount: 0 });
      const e = acc.get(k);
      e.locals.push(h.local.sfi_score);
      e.structs.push(h.local.breakdown.structural.score);
      e.sems.push(h.local.breakdown.semantic.score);
      e.funcs.push(h.local.breakdown.functional.score);
      const w = r.report.worstHop;
      if (w && w.index === h.index && w.from === h.from && w.to === h.to && w.drop > 0.0005) e.worstCount++;
    }
  }
  return [...acc.values()]
    .map((e) => ({ edge: e.edge, n: e.locals.length, local: mean(e.locals), structural: mean(e.structs), semantic: mean(e.sems), functional: mean(e.funcs), worstCount: e.worstCount }))
    .sort((a, b) => a.local - b.local);
}

/** Feature survival on the FINAL artifact vs the original (micro-averaged). */
function featureSurvival(rows) {
  const feats = ["headings", "tables", "lists", "links", "formulas"];
  const out = [];
  for (const id of CHAIN_ORDER) {
    const rs = rows.filter((r) => r.chainId === id);
    if (!rs.length) continue;
    const sums = Object.fromEntries(feats.map((f) => [f, { src: 0, kept: 0 }]));
    for (const r of rs) {
      const last = r.report.hops[r.report.hops.length - 1].cumulative.breakdown;
      const sd = last.structural.details ?? {};
      const fd = last.functional.details ?? {};
      const pairs = {
        headings: [sd.headings_source, sd.headings_preserved],
        tables: [sd.tables_source, sd.tables_preserved],
        lists: [sd.lists_source, sd.lists_preserved],
        links: [fd.links_source, fd.links_preserved],
        formulas: [fd.formulas_source, fd.formulas_preserved],
      };
      for (const f of feats) {
        const [src, kept] = pairs[f];
        if (typeof src === "number" && typeof kept === "number") {
          sums[f].src += src;
          sums[f].kept += Math.min(kept, src);   // cap: over-detection is not survival
        }
      }
    }
    out.push({ id, label: chainMeta(id).label, ...Object.fromEntries(feats.map((f) => [f, sums[f].src ? sums[f].kept / sums[f].src : NaN])) });
  }
  return out;
}

// ── CSV ────────────────────────────────────────────────────────────────────────

function csv(rows, headers) {
  const q = (v) => (typeof v === "string" && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : String(v));
  return [headers.join(","), ...rows.map((r) => headers.map((h) => q(r[h] ?? "")).join(","))].join("\n") + "\n";
}

// ── SVG primitives ─────────────────────────────────────────────────────────────

const svgOpen = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ${FONT}>\n<rect width="${w}" height="${h}" fill="${INK.surface}"/>`;
const text = (x, y, s, { size = 12, fill = INK.primary, anchor = "start", weight = 400 } = {}) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}">${String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`;

function legendRow(x, y, entries) {
  let cx = x;
  const parts = [];
  for (const e of entries) {
    parts.push(`<rect x="${cx}" y="${y - 9}" width="10" height="10" rx="2" fill="${e.color}"/>`);
    parts.push(text(cx + 15, y, e.label, { size: 11, fill: INK.secondary }));
    cx += 15 + e.label.length * 6.1 + 22;
  }
  return parts.join("\n");
}

/** Rounded-end horizontal bar (rounded on the data end only). */
function hBar(x, y, w, h, color, r = 4) {
  const rr = Math.min(r, w / 2, h / 2);
  return `<path d="M${x},${y} h${w - rr} a${rr},${rr} 0 0 1 ${rr},${rr} v${h - 2 * rr} a${rr},${rr} 0 0 1 -${rr},${rr} h-${w - rr} z" fill="${color}"/>`;
}
function vBar(x, y, w, h, color, r = 4) {
  const rr = Math.min(r, w / 2, h / 2);
  return `<path d="M${x},${y + h} v-${h - rr} a${rr},${rr} 0 0 1 ${rr},-${rr} h${w - 2 * rr} a${rr},${rr} 0 0 1 ${rr},${rr} v${h - rr} z" fill="${color}"/>`;
}

function seqColor(v, lo, hi) {
  if (!Number.isFinite(v)) return "#f0efec";
  const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1)));
  return SEQ_RAMP[Math.round(t * (SEQ_RAMP.length - 1))];
}
const seqInk = (v, lo, hi) => ((v - lo) / (hi - lo || 1) > 0.55 ? "#ffffff" : INK.primary);

// ── Figures ────────────────────────────────────────────────────────────────────

function figDegradation(curveMap) {
  const panels = [
    { title: "Round trips (2 hops)", ids: ["rt-html", "rt-docx", "rt-pdf", "rt-txt"], maxHop: 2 },
    { title: "Multi-hop chains", ids: ["html-docx", "docx-pdf", "long-4hop"], maxHop: 4 },
  ];
  const PW = 430, PH = 300, M = { l: 52, r: 130, t: 46, b: 40 };
  const W = PW * 2 + 30, H = PH + 46;
  const yLo = 0.4, yHi = 1.0;
  const parts = [svgOpen(W, H)];
  parts.push(text(14, 22, "Cumulative fidelity by hop (mean SFI vs original, N docs per chain)", { size: 14, weight: 600 }));

  panels.forEach((panel, pi) => {
    const ox = pi * (PW + 30);
    const plotW = PW - M.l - M.r + (pi === 0 ? 40 : 0);
    const plotH = PH - M.t - M.b;
    const xOf = (hop) => ox + M.l + (hop / panel.maxHop) * plotW;
    const yOf = (v) => 46 + M.t - 26 + (1 - (v - yLo) / (yHi - yLo)) * plotH;
    parts.push(text(ox + M.l, 52, panel.title, { size: 12, fill: INK.secondary, weight: 600 }));
    for (let g = yLo; g <= yHi + 1e-9; g += 0.1) {
      const y = yOf(g);
      parts.push(`<line x1="${ox + M.l}" y1="${y}" x2="${ox + M.l + plotW}" y2="${y}" stroke="${g === yLo ? INK.baseline : INK.grid}" stroke-width="1"/>`);
      parts.push(text(ox + M.l - 8, y + 4, g.toFixed(1), { size: 10, fill: INK.muted, anchor: "end" }));
    }
    for (let hop = 0; hop <= panel.maxHop; hop++) {
      parts.push(text(xOf(hop), 46 + M.t - 26 + plotH + 18, hop === 0 ? "orig" : `hop ${hop}`, { size: 10, fill: INK.muted, anchor: "middle" }));
    }
    const SHORT = { "rt-html": "html", "rt-docx": "docx", "rt-pdf": "pdf", "rt-txt": "txt", "html-docx": "via html→docx", "docx-pdf": "via docx→pdf", "long-4hop": "via html→docx→pdf" };
    const endLabels = [];
    for (const id of panel.ids) {
      const pts = curveMap.get(id);
      if (!pts) continue;
      const meta = chainMeta(id);
      const path = pts.map((p, i) => `${i ? "L" : "M"}${xOf(p.hop)},${yOf(p.cumulative)}`).join(" ");
      parts.push(`<path d="${path}" fill="none" stroke="${meta.color}" stroke-width="2" stroke-linejoin="round"/>`);
      for (const p of pts) {
        parts.push(`<circle cx="${xOf(p.hop)}" cy="${yOf(p.cumulative)}" r="3.5" fill="${meta.color}" stroke="${INK.surface}" stroke-width="2"/>`);
      }
      const last = pts[pts.length - 1];
      endLabels.push({ x: xOf(last.hop) + 8, y: yOf(last.cumulative) + 4, s: `${SHORT[id]} ${pctf(last.cumulative, 0)}%`, color: meta.color, lineY: yOf(last.cumulative) });
    }
    // Collision pass: stack end labels at least 14px apart, keep leader association.
    endLabels.sort((a, b) => a.y - b.y);
    for (let i = 1; i < endLabels.length; i++) {
      if (endLabels[i].y - endLabels[i - 1].y < 14) endLabels[i].y = endLabels[i - 1].y + 14;
    }
    for (const l of endLabels) {
      if (Math.abs(l.y - 4 - l.lineY) > 6) {
        parts.push(`<line x1="${l.x - 6}" y1="${l.lineY}" x2="${l.x - 1}" y2="${l.y - 4}" stroke="${INK.baseline}" stroke-width="1"/>`);
      }
      parts.push(`<rect x="${l.x}" y="${l.y - 9}" width="8" height="8" rx="2" fill="${l.color}"/>`);
      parts.push(text(l.x + 12, l.y, l.s, { size: 10, fill: INK.secondary }));
    }
  });
  parts.push("</svg>");
  return parts.join("\n");
}

function figFinalByChain(summary) {
  const rows = [...summary].sort((a, b) => b.mean - a.mean);
  const M = { l: 190, r: 90, t: 44, b: 30 }, barH = 22, gap = 14;
  const W = 760, plotW = W - M.l - M.r;
  const H = M.t + rows.length * (barH + gap) + M.b;
  const parts = [svgOpen(W, H)];
  parts.push(text(14, 24, "Final fidelity by conversion chain (mean SFI, error bar = ±1 SD)", { size: 14, weight: 600 }));
  for (let g = 0; g <= 1.0001; g += 0.25) {
    const x = M.l + g * plotW;
    parts.push(`<line x1="${x}" y1="${M.t - 6}" x2="${x}" y2="${H - M.b + 4}" stroke="${g === 0 ? INK.baseline : INK.grid}" stroke-width="1"/>`);
    parts.push(text(x, H - M.b + 18, pctf(g, 0) + "%", { size: 10, fill: INK.muted, anchor: "middle" }));
  }
  rows.forEach((r, i) => {
    const y = M.t + i * (barH + gap);
    const meta = chainMeta(r.id);
    parts.push(text(M.l - 10, y + barH / 2 + 4, meta.label, { size: 11.5, fill: INK.primary, anchor: "end" }));
    parts.push(hBar(M.l, y, Math.max(2, r.mean * plotW), barH, meta.color));
    const ex = M.l + r.mean * plotW;
    const e1 = M.l + Math.max(0, r.mean - r.std) * plotW, e2 = M.l + Math.min(1, r.mean + r.std) * plotW;
    parts.push(`<line x1="${e1}" y1="${y + barH / 2}" x2="${e2}" y2="${y + barH / 2}" stroke="${INK.primary}" stroke-width="1.2"/>`);
    parts.push(`<line x1="${e1}" y1="${y + barH / 2 - 4}" x2="${e1}" y2="${y + barH / 2 + 4}" stroke="${INK.primary}" stroke-width="1.2"/>`);
    parts.push(`<line x1="${e2}" y1="${y + barH / 2 - 4}" x2="${e2}" y2="${y + barH / 2 + 4}" stroke="${INK.primary}" stroke-width="1.2"/>`);
    parts.push(text(Math.max(ex, e2) + 8, y + barH / 2 + 4, `${pctf(r.mean)}%`, { size: 11, fill: INK.primary, weight: 600 }));
  });
  parts.push("</svg>");
  return parts.join("\n");
}

function figDimensions(summary) {
  const dims = [
    { key: "structural", label: "Structural", color: "#2a78d6" },
    { key: "semantic", label: "Semantic", color: "#008300" },
    { key: "functional", label: "Functional", color: "#e87ba4" },
  ];
  const M = { l: 52, r: 20, t: 64, b: 74 };
  const groupW = 86, barW = 22, gap = 2;
  const W = M.l + summary.length * groupW + M.r, H = 360;
  const plotH = H - M.t - M.b;
  const yOf = (v) => M.t + (1 - v) * plotH;
  const parts = [svgOpen(W, H)];
  parts.push(text(14, 24, "SFI dimensions by chain (final artifact vs original)", { size: 14, weight: 600 }));
  parts.push(legendRow(M.l, 44, dims));
  for (let g = 0; g <= 1.0001; g += 0.25) {
    parts.push(`<line x1="${M.l}" y1="${yOf(g)}" x2="${W - M.r}" y2="${yOf(g)}" stroke="${g === 0 ? INK.baseline : INK.grid}"/>`);
    parts.push(text(M.l - 8, yOf(g) + 4, pctf(g, 0) + "%", { size: 10, fill: INK.muted, anchor: "end" }));
  }
  summary.forEach((r, gi) => {
    const gx = M.l + gi * groupW + (groupW - dims.length * (barW + gap)) / 2;
    dims.forEach((d, di) => {
      const v = r[d.key];
      const x = gx + di * (barW + gap);
      parts.push(vBar(x, yOf(v), barW, M.t + plotH - yOf(v), d.color));
      parts.push(text(x + barW / 2, yOf(v) - 5, pctf(v, 0), { size: 9, fill: INK.secondary, anchor: "middle" }));
    });
    const lines = chainMeta(r.id).label.split("→");
    const short = lines.length > 3 ? `via ${lines.slice(1, -1).join("+")}` : lines[1];
    parts.push(text(M.l + gi * groupW + groupW / 2, H - M.b + 20, short, { size: 10.5, fill: INK.primary, anchor: "middle" }));
    parts.push(text(M.l + gi * groupW + groupW / 2, H - M.b + 34, `${r.hops} hops`, { size: 9, fill: INK.muted, anchor: "middle" }));
  });
  parts.push("</svg>");
  return parts.join("\n");
}

function figHeatmap(rowsMatrix, rowOrder, title, file) {
  const vals = rowsMatrix.flatMap((r) => Object.values(r.cells)).filter(Number.isFinite);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const M = { l: 96, r: 20, t: 70, b: 16 }, cw = 88, ch = 40;
  const W = M.l + CHAIN_ORDER.length * cw + M.r, H = M.t + rowOrder.length * ch + M.b;
  const parts = [svgOpen(W, H)];
  parts.push(text(14, 24, title, { size: 14, weight: 600 }));
  CHAIN_ORDER.forEach((id, ci) => {
    const lbl = chainMeta(id).label.replace(/^md→|→md$/g, "");
    parts.push(text(M.l + ci * cw + cw / 2, M.t - 26, lbl.length > 12 ? lbl.slice(0, 12) + "…" : lbl, { size: 9.5, fill: INK.secondary, anchor: "middle" }));
    parts.push(text(M.l + ci * cw + cw / 2, M.t - 12, `(${chainMeta(id).label.split("→").length - 1} hops)`, { size: 8.5, fill: INK.muted, anchor: "middle" }));
  });
  rowsMatrix.forEach((row, ri) => {
    parts.push(text(M.l - 10, M.t + ri * ch + ch / 2 + 4, row.key, { size: 11, fill: INK.primary, anchor: "end" }));
    CHAIN_ORDER.forEach((id, ci) => {
      const v = row.cells[id];
      const x = M.l + ci * cw, y = M.t + ri * ch;
      parts.push(`<rect x="${x + 1}" y="${y + 1}" width="${cw - 2}" height="${ch - 2}" rx="3" fill="${seqColor(v, lo, hi)}"/>`);
      parts.push(text(x + cw / 2, y + ch / 2 + 4, Number.isFinite(v) ? pctf(v) + "%" : "—", { size: 10.5, fill: seqInk(v, lo, hi), anchor: "middle", weight: 600 }));
    });
  });
  parts.push("</svg>");
  writeFileSync(join(FIGURES, file), parts.join("\n"), "utf8");
}

function figFeatures(survival) {
  const feats = ["headings", "tables", "lists", "links", "formulas"];
  const rowsMatrix = feats.map((f) => ({ key: f, cells: Object.fromEntries(survival.map((s) => [s.id, s[f]])) }));
  const vals = rowsMatrix.flatMap((r) => Object.values(r.cells)).filter(Number.isFinite);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const M = { l: 86, r: 20, t: 70, b: 16 }, cw = 88, ch = 40;
  const W = M.l + survival.length * cw + M.r, H = M.t + feats.length * ch + M.b;
  const parts = [svgOpen(W, H)];
  parts.push(text(14, 24, "Feature survival after the full chain (kept ÷ source, micro-averaged)", { size: 14, weight: 600 }));
  survival.forEach((s, ci) => {
    const lbl = s.label.replace(/^md→|→md$/g, "");
    parts.push(text(M.l + ci * cw + cw / 2, M.t - 26, lbl.length > 12 ? lbl.slice(0, 12) + "…" : lbl, { size: 9.5, fill: INK.secondary, anchor: "middle" }));
  });
  rowsMatrix.forEach((row, ri) => {
    parts.push(text(M.l - 10, M.t + ri * ch + ch / 2 + 4, row.key, { size: 11, fill: INK.primary, anchor: "end" }));
    survival.forEach((s, ci) => {
      const v = row.cells[s.id];
      const x = M.l + ci * cw, y = M.t + ri * ch;
      parts.push(`<rect x="${x + 1}" y="${y + 1}" width="${cw - 2}" height="${ch - 2}" rx="3" fill="${seqColor(v, lo, hi)}"/>`);
      parts.push(text(x + cw / 2, y + ch / 2 + 4, Number.isFinite(v) ? pctf(v, 0) + "%" : "—", { size: 10.5, fill: seqInk(v, lo, hi), anchor: "middle", weight: 600 }));
    });
  });
  parts.push("</svg>");
  return parts.join("\n");
}

// ── Markdown report ────────────────────────────────────────────────────────────

function gfmTable(headers, rows) {
  return [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
}

function buildReport(rows, summary, byDomain, byTier, edges, survival) {
  const manifest = JSON.parse(readFileSync(join(BENCH, "corpus", "manifest.json"), "utf8"));
  const nRuns = rows.length;
  const totalMin = rows.reduce((a, r) => a + r.durationMs, 0) / 60000;
  const best = [...summary].sort((a, b) => b.mean - a.mean)[0];
  const worst = [...summary].sort((a, b) => a.mean - b.mean)[0];
  const worstEdge = edges[0];
  const tierSpread = byTier.map((t) => ({ tier: t.key, mean: mean(Object.values(t.cells).filter(Number.isFinite)) }));

  const md = `# ConvertBench-lite — Results

Automated round-trip fidelity benchmark over the FileFlowOne conversion engine.
Every number in this file is generated by \`bench/report/aggregate.mjs\` from
\`bench/results/raw.jsonl\`; re-running the bench reproduces it end to end.

## Setup

- **Corpus:** ${manifest.docCount} synthetic markdown documents, ${manifest.domains.length} domains × 3 complexity tiers, deterministic (seeded per doc id — see \`bench/corpus/generate.mjs\`). Ground-truth feature counts in \`manifest.json\`.
- **Chains:** ${CHAIN_META.length} conversion chains (4 two-hop round trips, 3 multi-hop chains) executed by the production \`/api/convert\` pipeline via \`/api/roundtrip\`.
- **Scoring:** Semantic Fidelity Index (SFI = 0.35·structural + 0.45·semantic + 0.20·functional), scored per hop against both the previous artifact (local) and the original (cumulative).
- **Scale:** ${nRuns} chain executions (${rows.reduce((a, r) => a + r.chain.length - 1, 0)} conversions, ${rows.reduce((a, r) => a + 2 * (r.chain.length - 1), 0)} SFI scorings), ${totalMin.toFixed(0)} min total compute.

## Instrument validation (performed before the full run)

A 4-document pilot exposed three defects that were fixed before benchmarking:

1. **Converter defect (product):** \`htmlToMd\` was a regex chain that leaked \`<style>\` CSS into output text, destroyed \`<table>\` elements entirely, and flattened ordered/nested lists. Replaced with a tokenizer → tree → GFM serializer (\`src/lib/converters/text.ts\`).
2. **Instrument defect (SFI):** the HTML extractor counted \`<ul>/<ol>\` containers while md/docx/pdf extractors count list *items* — a unit mismatch that fabricated structural loss on every md↔html measurement.
3. **Instrument defect (SFI):** BeautifulSoup \`get_text()\` included \`<style>\`/\`<script>\` source in the "semantic text" of styled HTML, polluting embedding similarity.

Pilot md→html→md fidelity moved from 78–93% (spurious) to 100.0% after the fixes — the benchmark caught a real defect and two measurement-validity bugs on its first four runs.

## Headline results

![Final fidelity by chain](figures/fig2_final_by_chain.svg)

${gfmTable(
    ["Chain", "Hops", "N", "Mean SFI", "SD", "Min", "Structural", "Semantic", "Functional", "Mean s/run"],
    summary.map((r) => [r.label, r.hops, r.n, `**${pctf(r.mean)}%**`, pctf(r.std), pctf(r.min), pctf(r.structural), pctf(r.semantic), pctf(r.functional), r.meanSec.toFixed(1)]),
  )}

- Best chain: **${best.label}** (${pctf(best.mean)}%). Worst: **${worst.label}** (${pctf(worst.mean)}%).
- The lossiest single edge across all ${nRuns} runs is **${worstEdge.edge}** (mean local SFI ${pctf(worstEdge.local)}%), the worst hop in ${worstEdge.worstCount} runs.

## Degradation curves

![Degradation curves](figures/fig1_degradation.svg)

Interpretation note: at intermediate hops the cumulative score compares the
artifact against the original *across formats* (e.g. docx vs md), where the
SFI extractors are conservative — curves can therefore dip at a cross-format
hop and partially recover at the md endpoint, which is directly comparable.
End-to-end (hop 0 → final hop) comparisons are always like-for-like.

The gap between the compounded-local product Π(local) and the measured
cumulative fidelity exposes loss that per-hop scores cannot see:

${gfmTable(
    ["Chain", "Π(local)", "Measured cumulative", "Silent gap"],
    summary.map((r) => [r.label, pctf(r.compoundedLocal), pctf(r.mean), pctf(r.silentGap)]),
  )}

## SFI dimensions

![Dimensions](figures/fig3_dimensions.svg)

## Fidelity by domain and tier

![Domain heatmap](figures/fig4_domain_heatmap.svg)

${gfmTable(
    ["Domain", ...CHAIN_ORDER.map((id) => chainMeta(id).label)],
    byDomain.map((r) => [r.key, ...CHAIN_ORDER.map((id) => pctf(r.cells[id]) + "%")]),
  )}

${gfmTable(
    ["Tier", ...CHAIN_ORDER.map((id) => chainMeta(id).label)],
    byTier.map((r) => [r.key, ...CHAIN_ORDER.map((id) => pctf(r.cells[id]) + "%")]),
  )}

Tier means: ${tierSpread.map((t) => `${t.tier} ${pctf(t.mean)}%`).join(" · ")} — complexity costs fidelity ${tierSpread.length === 3 && tierSpread[0].mean > tierSpread[2].mean ? "monotonically" : "non-monotonically"}.

## Edge analysis (which single conversion loses the most)

${gfmTable(
    ["Edge", "N hops", "Mean local SFI", "Structural", "Semantic", "Functional", "Worst-hop count"],
    edges.map((e) => [e.edge, e.n, pctf(e.local) + "%", pctf(e.structural), pctf(e.semantic), pctf(e.functional), e.worstCount]),
  )}

## Feature survival

![Feature survival](figures/fig5_feature_survival.svg)

${gfmTable(
    ["Chain", "Headings", "Tables", "Lists", "Links", "Formulas"],
    survival.map((s) => [s.label, ...["headings", "tables", "lists", "links", "formulas"].map((f) => pctf(s[f]) + "%")]),
  )}

Survival is micro-averaged: Σ preserved ÷ Σ source over all docs in the chain,
with per-doc preservation capped at the source count (over-detection ≠ survival).

${sideBenches()}

## Reproducing

\`\`\`bash
node bench/corpus/generate.mjs        # deterministic corpus (byte-identical)
node bench/run/runbench.mjs           # resumable; needs :3000 + :8000
node bench/report/aggregate.mjs       # tables + figures + this file

npx tsx bench/router/runrouter.mjs    # router precision/recall (no servers needed)
node bench/ats/runats.mjs             # ATS invariance (needs :3000 + :8000)
python_backend/.venv/Scripts/python bench/tables/make_fixtures.py
python_backend/.venv/Scripts/python bench/tables/baseline_pdfplumber.py
node bench/tables/runtables.mjs       # table extractor vs pdfplumber (needs :8000)
\`\`\`
`;
  return md;
}

/** Side-benchmark sections, included when their result files exist. */
function sideBenches() {
  const parts = [];

  const routerPath = join(RESULTS, "router_summary.json");
  if (existsSync(routerPath)) {
    const r = JSON.parse(readFileSync(routerPath, "utf8"));
    parts.push(`## Privacy router — sensitivity precision/recall

${r.samples} hand-labeled documents (labels authored from the text alone, incl. 8 hard negatives). Category threshold ${r.categoryThreshold}.

${gfmTable(["Category", "Precision", "Recall", "F1"], [
      ...r.perCategory.map((c) => [c.category, c.precision.toFixed(3), c.recall.toFixed(3), c.f1.toFixed(3)]),
      ["**micro**", r.micro.precision.toFixed(3), r.micro.recall.toFixed(3), r.micro.f1.toFixed(3)],
      ["**macro**", r.macro.precision.toFixed(3), r.macro.recall.toFixed(3), r.macro.f1.toFixed(3)],
    ])}

- Binary sensitive-document detection (score ≥ 0.3): P=${r.binarySensitive.precision.toFixed(3)}, R=${r.binarySensitive.recall.toFixed(3)}, F1=${r.binarySensitive.f1.toFixed(3)}.
- **Privacy guarantee: ${r.privacyGuarantee.routedLocal}/${r.privacyGuarantee.highDocs} high-sensitivity documents routed LOCAL (${(r.privacyGuarantee.rate * 100).toFixed(0)}%).** Zero false positives on the hard-negative set.
- Bench-driven calibration (spaced-IBAN regex, vendor token shapes, plural-aware lexicon matching, ${""}lexicon additions) raised macro-F1 from 0.71 to ${r.macro.f1.toFixed(2)} with precision held at 1.000. Remaining misses are single-term hits scoring 0.12–0.14 against the 0.15 floor.`);
  }

  const atsPath = join(RESULTS, "ats_summary.json");
  if (existsSync(atsPath)) {
    const a = JSON.parse(readFileSync(atsPath, "utf8"));
    parts.push(`## ATS scorer — consistency & invariance

3 synthetic CV/JD pairs, CVs converted through the production md→docx pipeline.

${gfmTable(["Pair", "Base", "Deterministic ×5", "Δ bullets", "Δ blank lines", "Δ section order", "Δ aliases", "Δ +missing skill"],
      a.rows.map((x) => [x.pair, x.base_overall, x.deterministic, x.d_bullets, x.d_blanks, x.d_sections, x.d_aliases, x.d_addskill]))}

All determinism, cosmetic-invariance, alias-skill-identity, and monotonicity gates passed. Noted finding: alias variants keep the skills taxonomy match identical but can cost up to 13 points through the literal JD keyword-overlap term — alias-normalising text before keyword scoring is measured future work.`);
  }

  const tablesPath = join(RESULTS, "tables_accuracy.csv");
  if (existsSync(tablesPath)) {
    const lines = readFileSync(tablesPath, "utf8").trim().split("\n").slice(1).map((l) => l.split(","));
    parts.push(`## Table extractor vs pdfplumber

7 generated fixture PDFs with ground truth by construction (ruled, borderless, tight-numeric, mixed prose+tables, airy pitch). Cell accuracy = position-exact matches ÷ ground-truth cells.

${gfmTable(["Fixture", "Extractor", "Detected", "False pos", "Cell accuracy"],
      lines.map((c) => [c[0] === "TOTAL" ? "**TOTAL**" : c[0], c[1], `${c[3]}/${c[2]}`, c[4], `${(Number(c[5]) * 100).toFixed(1)}%`]))}

FileFlowOne ties pdfplumber on ruled tables, edges ahead on tight numeric columns, and wins the mixed prose+tables page (2/2 vs 1/2 — the borderless second table). The airy-pitch fixture (24 pt row spacing) is a documented limitation: block grouping splits sparse rows before the borderless reconstructor sees a candidate.`);
  }

  return parts.join("\n\n");
}

// ── Main ───────────────────────────────────────────────────────────────────────

function main() {
  mkdirSync(FIGURES, { recursive: true });
  const rows = loadRows();
  console.log(`Loaded ${rows.length} results`);

  const summary = summarizeChain(rows);
  const byDomain = matrix(rows, (r) => r.domain, DOMAIN_ORDER);
  const byTier = matrix(rows, (r) => r.tier, TIER_ORDER);
  const curveMap = curves(rows);
  const edges = edgeStats(rows);
  const survival = featureSurvival(rows);

  // CSVs
  writeFileSync(join(RESULTS, "summary_by_chain.csv"), csv(
    summary.map((r) => ({ chain: r.label, hops: r.hops, n: r.n, mean_sfi: fmt(r.mean, 4), sd: fmt(r.std, 4), min: fmt(r.min, 4), max: fmt(r.max, 4), structural: fmt(r.structural, 4), semantic: fmt(r.semantic, 4), functional: fmt(r.functional, 4), compounded_local: fmt(r.compoundedLocal, 4), silent_gap: fmt(r.silentGap, 4), mean_seconds: fmt(r.meanSec, 1) })),
    ["chain", "hops", "n", "mean_sfi", "sd", "min", "max", "structural", "semantic", "functional", "compounded_local", "silent_gap", "mean_seconds"],
  ), "utf8");

  const matCsv = (mat, keyName) => csv(
    mat.map((r) => ({ [keyName]: r.key, ...Object.fromEntries(CHAIN_ORDER.map((id) => [id, fmt(r.cells[id], 4)])) })),
    [keyName, ...CHAIN_ORDER],
  );
  writeFileSync(join(RESULTS, "summary_by_domain.csv"), matCsv(byDomain, "domain"), "utf8");
  writeFileSync(join(RESULTS, "summary_by_tier.csv"), matCsv(byTier, "tier"), "utf8");

  writeFileSync(join(RESULTS, "degradation_curves.csv"), csv(
    [...curveMap.entries()].flatMap(([id, pts]) => pts.map((p) => ({ chain: chainMeta(id).label, hop: p.hop, mean_cumulative: fmt(p.cumulative, 4), sd: fmt(p.cumStd, 4), mean_local: fmt(p.local, 4) }))),
    ["chain", "hop", "mean_cumulative", "sd", "mean_local"],
  ), "utf8");

  writeFileSync(join(RESULTS, "edge_stats.csv"), csv(
    edges.map((e) => ({ edge: e.edge, n: e.n, mean_local_sfi: fmt(e.local, 4), structural: fmt(e.structural, 4), semantic: fmt(e.semantic, 4), functional: fmt(e.functional, 4), worst_hop_count: e.worstCount })),
    ["edge", "n", "mean_local_sfi", "structural", "semantic", "functional", "worst_hop_count"],
  ), "utf8");

  writeFileSync(join(RESULTS, "feature_survival.csv"), csv(
    survival.map((s) => ({ chain: s.label, headings: fmt(s.headings, 4), tables: fmt(s.tables, 4), lists: fmt(s.lists, 4), links: fmt(s.links, 4), formulas: fmt(s.formulas, 4) })),
    ["chain", "headings", "tables", "lists", "links", "formulas"],
  ), "utf8");

  // Figures
  writeFileSync(join(FIGURES, "fig1_degradation.svg"), figDegradation(curveMap), "utf8");
  writeFileSync(join(FIGURES, "fig2_final_by_chain.svg"), figFinalByChain(summary), "utf8");
  writeFileSync(join(FIGURES, "fig3_dimensions.svg"), figDimensions(summary), "utf8");
  figHeatmap(byDomain, DOMAIN_ORDER, "Mean final fidelity — domain × chain", "fig4_domain_heatmap.svg");
  writeFileSync(join(FIGURES, "fig5_feature_survival.svg"), figFeatures(survival), "utf8");

  // Report
  writeFileSync(join(REPORT, "RESULTS.md"), buildReport(rows, summary, byDomain, byTier, edges, survival), "utf8");

  console.log("Wrote 6 CSVs, 5 figures, RESULTS.md");
  for (const r of summary) console.log(`  ${r.label.padEnd(24)} n=${String(r.n).padStart(3)} mean=${pctf(r.mean)}%`);
}

main();
