/**
 * ATS Resume Optimizer bridge.
 *
 * The deterministic match analysis (resume ↔ job description) runs on the Python
 * backend (skills taxonomy, RAKE keyphrases, TF-IDF similarity, PDF parse-ability).
 * The optional AI bullet-rewrite is done in the Next route via the shared AI layer.
 */
const PYTHON_BACKEND = process.env.PYTHON_BACKEND_URL ?? "http://localhost:8000";

const BACKEND_DOWN =
  "ATS analysis requires the Python backend. Start it with: cd python_backend && python -m uvicorn app.main:app --reload";

export interface AtsFormatIssue {
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  fix: string;
}

export interface AtsReport {
  overall: number;
  subScores: { keywords: number; skills: number; similarity: number; format: number };
  matchedSkills: string[];
  missingSkills: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  formatIssues: AtsFormatIssue[];
  sectionsPresent: string[];
  sectionsMissing: string[];
  contact: { email: boolean; phone: boolean; links: boolean };
  stats: { cvWords: number; jdSkills: number; pageCount: number; fileType: string };
}

/** Analyze a resume against a job description (deterministic, Python backend). */
export async function analyzeResume(buffer: Buffer, filename: string, jd: string): Promise<AtsReport> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)]), filename || "resume.pdf");
  form.append("jd", jd);

  let res: Response;
  try {
    res = await fetch(`${PYTHON_BACKEND}/api/ats-analyze`, { method: "POST", body: form });
  } catch {
    throw new Error(BACKEND_DOWN);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `ATS analysis failed (${res.status})`);
  }
  return (await res.json()) as AtsReport;
}
