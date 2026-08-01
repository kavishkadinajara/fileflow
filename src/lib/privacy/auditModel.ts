/**
 * Static privacy facts backing the Privacy Audit Dashboard.
 *
 * These encode the formal threat model and the per-feature processing-location
 * map from the FileFlowOne research (gaps 7 & 9). They are declarative so the
 * dashboard renders them consistently and they can be exported into the audit
 * log a data-protection officer would review.
 */

export type Protection = "protected" | "partial" | "not-protected";

export interface ThreatRow {
  adversary: string;
  protection: Protection;
  mechanism: string;
}

/** Formal threat model — who can/can't see a document during processing. */
export const THREAT_MODEL: ThreatRow[] = [
  { adversary: "Network eavesdropper", protection: "protected",
    mechanism: "Media never transmitted; other traffic is TLS to first-party origin only." },
  { adversary: "Cloud AI provider", protection: "protected",
    mechanism: "No document is sent to an AI provider unless you explicitly opt in to an AI action." },
  { adversary: "Third-party analytics / trackers", protection: "protected",
    mechanism: "No third-party scripts; CSP + a live network monitor prove zero external calls." },
  { adversary: "Server-side storage", protection: "protected",
    mechanism: "Files are processed in memory and discarded; the database stores metadata only." },
  { adversary: "Browser extension", protection: "partial",
    mechanism: "COOP/COEP isolation limits cross-origin access, but an extension with page access is outside the app's control." },
  { adversary: "Local malware", protection: "not-protected",
    mechanism: "Anything running on your own machine is outside any web application's security model." },
];

export type Location = "browser" | "local-server" | "cloud-optional";

export interface FeatureLocation {
  feature: string;
  location: Location;
  note: string;
}

/** Where each feature actually processes your data. */
export const FEATURE_LOCATIONS: FeatureLocation[] = [
  { feature: "Audio / video conversion", location: "browser",
    note: "FFmpeg WebAssembly — the file never leaves your device." },
  { feature: "Document & image conversion", location: "local-server",
    note: "Processed by the app's own server, in memory, then discarded." },
  { feature: "PDF editing & tables", location: "local-server",
    note: "Python backend on the same deployment; no third-party service." },
  { feature: "Summarizer (extractive)", location: "browser",
    note: "TextRank runs entirely client-side with no network call." },
  { feature: "ATS resume analysis", location: "local-server",
    note: "Deterministic scoring on the app's backend; résumé discarded after scoring." },
  { feature: "Semantic Fidelity scoring", location: "local-server",
    note: "Embeddings computed on the backend; no document leaves the deployment." },
  { feature: "AI polish / rewrite (optional)", location: "cloud-optional",
    note: "ONLY this opt-in action sends the selected text to your configured AI provider." },
];

export const PROTECTION_LABEL: Record<Protection, string> = {
  protected: "Protected",
  partial: "Partial",
  "not-protected": "Not protected",
};

export const LOCATION_LABEL: Record<Location, string> = {
  browser: "Your browser",
  "local-server": "App server",
  "cloud-optional": "Cloud (opt-in)",
};
