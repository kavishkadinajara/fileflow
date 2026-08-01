"use client";

/**
 * Privacy Audit Dashboard — the operational proof of FileFlowOne's privacy claims
 * (research gaps 7 & 9). It combines a LIVE network monitor (every outbound
 * request, classified by destination) with the static threat model and per-feature
 * processing-location map, and can export the whole thing as a JSON audit log.
 *
 * The headline is the verdict banner: as long as no document is uploaded to a
 * third-party host, it reads "No third-party uploads detected" — measured, live.
 */
import {
  type NetworkEvent,
  type RequestClass,
  installNetworkMonitor,
  subscribe,
  clearEvents,
  summarize,
} from "@/lib/privacy/networkMonitor";
import {
  THREAT_MODEL,
  FEATURE_LOCATIONS,
  PROTECTION_LABEL,
  LOCATION_LABEL,
  type Protection,
  type Location,
} from "@/lib/privacy/auditModel";
import {
  CheckCircle2, AlertTriangle, ShieldAlert, ShieldCheck, Download, Trash2,
  Activity, MapPin, Radar,
} from "lucide-react";
import { useEffect, useState } from "react";

const CLASS_META: Record<RequestClass, { label: string; dot: string; text: string }> = {
  "first-party":   { label: "First-party",  dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  "same-site-api": { label: "App API",      dot: "bg-sky-500",     text: "text-sky-600 dark:text-sky-400" },
  supabase:        { label: "Supabase",     dot: "bg-violet-500",  text: "text-violet-600 dark:text-violet-400" },
  "ai-provider":   { label: "AI provider",  dot: "bg-amber-500",   text: "text-amber-600 dark:text-amber-400" },
  "third-party":   { label: "Third-party",  dot: "bg-rose-500",    text: "text-rose-600 dark:text-rose-400" },
};

const PROTECTION_STYLE: Record<Protection, { icon: typeof ShieldCheck; cls: string }> = {
  protected:       { icon: ShieldCheck, cls: "text-emerald-500" },
  partial:         { icon: ShieldAlert, cls: "text-amber-500" },
  "not-protected": { icon: AlertTriangle, cls: "text-rose-500" },
};

const LOCATION_STYLE: Record<Location, string> = {
  browser:          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "local-server":   "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  "cloud-optional": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function PrivacyAuditDashboard() {
  const [events, setEvents] = useState<NetworkEvent[]>([]);

  useEffect(() => {
    installNetworkMonitor();
    return subscribe(setEvents);
  }, []);

  const stats = summarize(events);
  const clean = stats.thirdPartyUploads === 0;

  function exportLog() {
    const report = {
      generated_at: new Date().toISOString(),
      origin: typeof window !== "undefined" ? window.location.origin : "",
      verdict: clean ? "no-third-party-uploads" : "third-party-upload-detected",
      summary: stats,
      threat_model: THREAT_MODEL,
      feature_locations: FEATURE_LOCATIONS,
      network_log: events,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fileflowone-privacy-audit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6">
      {/* Verdict banner */}
      <div className={`rounded-2xl border p-5 flex items-center gap-4 ${clean
        ? "border-emerald-500/30 bg-emerald-500/5"
        : "border-rose-500/30 bg-rose-500/5"}`}>
        {clean
          ? <ShieldCheck className="h-10 w-10 text-emerald-500 shrink-0" />
          : <ShieldAlert className="h-10 w-10 text-rose-500 shrink-0" />}
        <div className="flex-1">
          <h2 className="text-lg font-bold">
            {clean ? "No third-party uploads detected" : "Third-party upload detected"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {clean
              ? "Every request this session went to the app's own origin or a service you configured — no document was sent to an unknown host."
              : `${stats.thirdPartyUploads} request(s) sent a payload to a third-party host. Review the network log below.`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl font-bold tabular-nums">{stats.total}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">requests watched</div>
        </div>
      </div>

      {/* Class summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {(Object.keys(CLASS_META) as RequestClass[]).map((k) => (
          <div key={k} className="rounded-xl border bg-card p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${CLASS_META[k].dot}`} />
              <span className="text-[10px] text-muted-foreground">{CLASS_META[k].label}</span>
            </div>
            <div className="text-xl font-bold tabular-nums">{stats.byClass[k]}</div>
          </div>
        ))}
      </div>

      {/* Live network log */}
      <div className="rounded-2xl border bg-card">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Live network monitor
          </h3>
          <div className="flex items-center gap-3">
            <button onClick={exportLog} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
              <Download className="h-3.5 w-3.5" /> Export audit log
            </button>
            <button onClick={clearEvents} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-rose-500">
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto divide-y">
          {events.length === 0 ? (
            <p className="p-4 text-[11px] text-muted-foreground">
              Watching… Convert a file or run a tool in another tab and the requests appear here in real time.
            </p>
          ) : events.map((e) => (
            <div key={e.id} className="flex items-center gap-2 px-4 py-2 text-[11px]">
              <span className={`h-2 w-2 rounded-full shrink-0 ${CLASS_META[e.klass].dot}`} />
              <span className="font-mono text-muted-foreground w-16 shrink-0">{fmtTime(e.ts)}</span>
              <span className="font-semibold w-12 shrink-0">{e.method}</span>
              <span className="truncate flex-1" title={e.url}>{e.host}</span>
              {e.hasBody && (
                <span className={`px-1.5 py-px rounded text-[9px] shrink-0 ${e.klass === "third-party"
                  ? "bg-rose-500/15 text-rose-500" : "bg-muted text-muted-foreground"}`}>
                  upload
                </span>
              )}
              <span className={`shrink-0 ${CLASS_META[e.klass].text}`}>{CLASS_META[e.klass].label}</span>
              {e.status != null && (
                <span className={`w-8 text-right shrink-0 ${e.ok ? "text-muted-foreground" : "text-rose-500"}`}>{e.status}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Processing-location map */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" /> Where each feature processes your data
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {FEATURE_LOCATIONS.map((f) => (
            <div key={f.feature} className="rounded-xl border bg-card p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">{f.feature}</span>
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium shrink-0 ${LOCATION_STYLE[f.location]}`}>
                  {LOCATION_LABEL[f.location]}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{f.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Threat model */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Radar className="h-4 w-4 text-primary" /> Threat model — who can see your document
        </h3>
        <div className="rounded-xl border bg-card divide-y">
          {THREAT_MODEL.map((t) => {
            const S = PROTECTION_STYLE[t.protection];
            return (
              <div key={t.adversary} className="flex items-start gap-3 p-3">
                <S.icon className={`h-4 w-4 mt-0.5 shrink-0 ${S.cls}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{t.adversary}</span>
                    <span className={`text-[10px] ${S.cls}`}>{PROTECTION_LABEL[t.protection]}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{t.mechanism}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          This dashboard is itself deterministic: the verdict is computed from real intercepted requests, not a promise.
        </p>
      </div>
    </div>
  );
}
