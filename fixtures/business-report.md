# Q1 2026 Product & Engineering Report

**Prepared by:** Product & Engineering Leadership
**Period:** January 1 – March 31, 2026
**Distribution:** Executive Team, Board of Directors

---

## Executive Summary

The first quarter of 2026 delivered strong execution across all three product pillars. FileFlowOne reached 42,000 monthly active users, a 34% increase quarter-over-quarter. The launch of the Semantic Fidelity Index (SFI) feature in March generated significant media coverage and drove a 22% uptick in Pro tier subscriptions. Engineering velocity improved by 18% following the adoption of the new CI/CD pipeline.

Key highlights:
- Achieved 99.97% API uptime, exceeding the 99.9% SLA commitment
- Reduced median conversion latency from 1,840 ms to 920 ms (50% improvement)
- Onboarded 3 enterprise customers representing $480K ARR
- Shipped 6 major features and resolved 47 user-reported bugs

---

## Product Metrics

### User Growth

| Metric                     | Q4 2025   | Q1 2026   | Change    |
|----------------------------|-----------|-----------|-----------|
| Monthly Active Users       | 31,300    | 42,000    | +34.2%    |
| Weekly Active Users        | 18,700    | 26,100    | +39.6%    |
| Daily Active Users         | 6,400     | 9,200     | +43.8%    |
| New Registrations          | 8,900     | 13,400    | +50.6%    |
| Churn Rate (monthly)       | 4.1%      | 3.2%      | −0.9 pp   |

### Conversion Volume

| Format Pair    | Q4 2025     | Q1 2026     | Change   |
|----------------|-------------|-------------|----------|
| MD → HTML      | 1,240,000   | 1,780,000   | +43.5%   |
| MD → DOCX      | 890,000     | 1,340,000   | +50.6%   |
| MD → PDF       | 1,120,000   | 1,690,000   | +50.9%   |
| DOCX → PDF     | 670,000     | 1,020,000   | +52.2%   |
| PDF → MD       | 340,000     | 580,000     | +70.6%   |
| Other pairs    | 410,000     | 720,000     | +75.6%   |
| **Total**      | **4,670,000** | **7,130,000** | **+52.7%** |

### Revenue

| Tier       | Q4 2025 MRR | Q1 2026 MRR | Change   |
|------------|-------------|-------------|----------|
| Free       | $0          | $0          | —        |
| Pro        | $68,400     | $83,500     | +22.1%   |
| Enterprise | $28,000     | $68,000     | +142.9%  |
| **Total**  | **$96,400** | **$151,500** | **+57.2%** |

---

## Feature Launches

### January 2026

**SQL Dialect Conversion Improvements**
Enhanced the MSSQL ↔ MySQL ↔ PostgreSQL conversion engine with support for 34 additional function mappings and improved handling of window functions. Customer-reported accuracy improved from 78% to 94%.

**Batch Processing Parallelization**
Rewrote the batch conversion pipeline to process files concurrently rather than sequentially. Throughput for 10-file batches improved by 6.2×.

### February 2026

**AI Modification Panel**
Launched the AI Modify feature allowing users to apply natural language instructions to converted documents (e.g., "Translate to Spanish", "Summarize to 3 bullet points"). Powered by Groq LLaMA 3.3 70B. Achieved 91% user satisfaction in post-launch survey.

**Dark Mode Polish Pass**
Addressed 23 contrast and readability issues in dark mode across the conversion config, job list, and output preview panels.

### March 2026

**Semantic Fidelity Index (SFI)**
Launched the flagship quality metric for converted documents. SFI combines structural, semantic, and functional dimensions into a single A–F grade displayed on every completed conversion job. The feature was covered by The Practical Dev, Hacker News (342 points), and three developer newsletters. Drove the single largest weekly new-user spike in company history (+2,100 registrations in 7 days).

**Round-Trip Scoring**
Extended SFI with round-trip chain scoring, allowing users to measure cumulative fidelity loss across A→B→A conversion chains. Used internally for benchmark regression testing.

---

## Engineering Metrics

### Reliability

| Metric                   | Q4 2025 | Q1 2026 | Target  |
|--------------------------|---------|---------|---------|
| API Uptime               | 99.91%  | 99.97%  | 99.90%  |
| P50 Conversion Latency   | 1,840ms | 920ms   | < 1,500ms |
| P95 Conversion Latency   | 8,200ms | 3,100ms | < 5,000ms |
| Error Rate               | 0.42%   | 0.19%   | < 0.50%   |
| Mean Time to Recovery    | 18 min  | 6 min   | < 30 min  |

### Delivery

| Metric                   | Q4 2025 | Q1 2026 |
|--------------------------|---------|---------|
| Story Points Delivered   | 234     | 276     |
| Sprint Velocity          | 39 pts  | 46 pts  |
| Bugs Opened              | 74      | 52      |
| Bugs Resolved            | 61      | 47 (+ 26 backlog) |
| PRs Merged               | 87      | 104     |
| Code Review Turnaround   | 2.1 days| 1.3 days|

---

## Incidents

### INC-2026-001 — Puppeteer Memory Leak (Jan 14)
**Severity:** P2 | **Duration:** 47 minutes | **Users Affected:** ~1,200

A memory leak in the Puppeteer browser pool caused OOM crashes on the conversion server, degrading PDF and PNG output availability. Root cause was missing browser process cleanup on conversion timeout. Fix: added explicit `browser.close()` call in the finally block of the converter. Post-incident review completed; added memory headroom alerting at 75% threshold.

### INC-2026-002 — SFI Backend Cold Start (Mar 8)
**Severity:** P3 | **Duration:** 12 minutes | **Users Affected:** ~300

Python backend restarted after deployment and the sentence-transformer model (`all-MiniLM-L6-v2`, 80 MB) required a warm-up period before the first scoring request could be served. Subsequent requests to `/api/slm-score` timed out during warm-up. Fix: added a startup probe that pre-loads the model on server init, eliminating cold-start latency.

---

## Q2 2026 Priorities

1. **ConvertBench public dataset** — Release the 500-document benchmark corpus as open data to establish FileFlowOne SFI as an industry standard
2. **PPTX support** — PowerPoint input/output, highest-voted feature request (834 votes)
3. **Self-hosted tier** — Docker image for on-premises deployment targeting enterprise security requirements
4. **Mobile PWA** — Responsive redesign for mobile conversion workflows
5. **Webhook callbacks** — Async conversion with callback URL for large-file workflows

---

## Appendix: Team

| Name               | Role                         | Focus Area         |
|--------------------|------------------------------|--------------------|
| Kavishka Dinajara  | Founder & Lead Engineer      | Full-stack, AI     |
| (open)             | Backend Engineer             | Python, FastAPI    |
| (open)             | Frontend Engineer            | React, TypeScript  |
| (open)             | DevOps / Platform            | Docker, CI/CD      |
