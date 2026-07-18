/**
 * Live network monitor — the runtime heart of the Privacy Audit Dashboard.
 *
 * This is the operational form of the "Browser AI Privacy" threat model (research
 * gaps 7 & 9): rather than *claiming* the app makes no third-party uploads, it
 * *measures* it. On install() it wraps `window.fetch`, `XMLHttpRequest`, and
 * `navigator.sendBeacon`, recording every outbound request with its destination
 * and a privacy classification. A dashboard can then show, in real time, that:
 *
 *   • every request goes to the app's own origin (first-party), and
 *   • no request carries a document body to a third-party host.
 *
 * Classification is deterministic — based purely on the request URL's origin
 * relative to the page origin — so the audit is explainable, not heuristic.
 */

export type RequestClass = "first-party" | "same-site-api" | "supabase" | "ai-provider" | "model-cdn" | "third-party";

export interface NetworkEvent {
  id: number;
  ts: number;                 // epoch ms
  method: string;
  url: string;
  host: string;
  klass: RequestClass;
  via: "fetch" | "xhr" | "beacon";
  hasBody: boolean;           // did the request carry a payload (upload)?
  status?: number;            // filled in on completion (fetch only)
  ok?: boolean;
}

type Listener = (events: NetworkEvent[]) => void;

const MAX_EVENTS = 500;
let events: NetworkEvent[] = [];
let listeners: Listener[] = [];
let seq = 0;
let installed = false;

function pageOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

/** Deterministically classify a URL by its origin relative to the page. */
export function classify(url: string): { host: string; klass: RequestClass } {
  let host = "";
  try {
    // Resolve relative URLs against the page origin.
    const u = new URL(url, pageOrigin() || "http://localhost");
    host = u.host;
    if (u.origin === pageOrigin()) {
      // Our own origin. API routes are still local — flag them distinctly so the
      // dashboard can say "processed by our server, not a third party".
      return { host, klass: u.pathname.startsWith("/api/") ? "same-site-api" : "first-party" };
    }
    if (/\.supabase\.(co|in)$/.test(u.hostname)) return { host, klass: "supabase" };
    if (/(groq|openai|googleapis|generativelanguage|deepseek|anthropic)\./.test(u.hostname))
      return { host, klass: "ai-provider" };
    // Model-weight downloads for on-device inference (WebLLM / Transformers.js).
    // These are GET-only pulls of public model files — the document itself is
    // never in these requests, so they must not read as third-party uploads.
    if (/(^|\.)huggingface\.co$|(^|\.)hf\.co$|(^|\.)mlc\.ai$|^raw\.githubusercontent\.com$/.test(u.hostname))
      return { host, klass: "model-cdn" };
    return { host, klass: "third-party" };
  } catch {
    return { host: host || "invalid", klass: "third-party" };
  }
}

function emit() {
  const snapshot = events.slice();
  for (const l of listeners) l(snapshot);
}

function record(partial: Omit<NetworkEvent, "id" | "ts">): NetworkEvent {
  const ev: NetworkEvent = { id: ++seq, ts: Date.now(), ...partial };
  events = [ev, ...events].slice(0, MAX_EVENTS);
  emit();
  return ev;
}

function updateEvent(id: number, patch: Partial<NetworkEvent>) {
  events = events.map((e) => (e.id === id ? { ...e, ...patch } : e));
  emit();
}

/** Install the interceptors exactly once. Safe to call repeatedly. */
export function installNetworkMonitor() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // ── fetch ──────────────────────────────────────────────────────────────────
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const hasBody = !!(init?.body ?? (input instanceof Request && input.body));
    const { host, klass } = classify(url);
    const ev = record({ method, url, host, klass, via: "fetch", hasBody });
    try {
      const res = await origFetch(input as RequestInfo, init);
      updateEvent(ev.id, { status: res.status, ok: res.ok });
      return res;
    } catch (err) {
      updateEvent(ev.id, { ok: false });
      throw err;
    }
  };

  // ── XMLHttpRequest ───────────────────────────────────────────────────────────
  const OrigXHR = window.XMLHttpRequest;
  const origOpen = OrigXHR.prototype.open;
  const origSend = OrigXHR.prototype.send;
  origOpen && (OrigXHR.prototype.open = function (this: XMLHttpRequest & { __m?: { method: string; url: string } }, method: string, url: string | URL, ...rest: unknown[]) {
    this.__m = { method: String(method).toUpperCase(), url: typeof url === "string" ? url : url.href };
    // @ts-expect-error variadic passthrough to native open
    return origOpen.call(this, method, url, ...rest);
  });
  origSend && (OrigXHR.prototype.send = function (this: XMLHttpRequest & { __m?: { method: string; url: string } }, body?: Document | XMLHttpRequestBodyInit | null) {
    const m = this.__m;
    if (m) {
      const { host, klass } = classify(m.url);
      record({ method: m.method, url: m.url, host, klass, via: "xhr", hasBody: body != null });
    }
    return origSend.call(this, body as XMLHttpRequestBodyInit | null);
  });

  // ── sendBeacon ────────────────────────────────────────────────────────────────
  if (navigator.sendBeacon) {
    const origBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      const href = typeof url === "string" ? url : url.href;
      const { host, klass } = classify(href);
      record({ method: "POST", url: href, host, klass, via: "beacon", hasBody: data != null });
      return origBeacon(url, data);
    };
  }
}

export function subscribe(fn: Listener): () => void {
  listeners.push(fn);
  fn(events.slice());
  return () => { listeners = listeners.filter((l) => l !== fn); };
}

export function getEvents(): NetworkEvent[] {
  return events.slice();
}

export function clearEvents() {
  events = [];
  emit();
}

/** Aggregate counts for the dashboard summary tiles. */
export function summarize(evs: NetworkEvent[]) {
  const byClass: Record<RequestClass, number> = {
    "first-party": 0, "same-site-api": 0, supabase: 0, "ai-provider": 0, "model-cdn": 0, "third-party": 0,
  };
  let uploads = 0;
  let thirdPartyUploads = 0;
  for (const e of evs) {
    byClass[e.klass]++;
    if (e.hasBody) uploads++;
    if (e.hasBody && e.klass === "third-party") thirdPartyUploads++;
  }
  return { total: evs.length, byClass, uploads, thirdPartyUploads };
}
