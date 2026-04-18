# Privacy Audit

Implement or review the privacy transparency features for FileFlowOne's local-first architecture.

## Arguments
`$ARGUMENTS` — scope, e.g. "implement privacy dashboard component" or "audit current network requests during conversion"

## Background (from research gap report)

FileFlowOne's privacy model:
| Adversary | Protected? | Mechanism |
|---|---|---|
| Network eavesdropper | YES | No network transmission in local mode |
| Cloud provider | YES | No API calls in local mode |
| Browser extension | PARTIAL | CSP headers, sandboxing |
| Local malware | NO | Outside browser security model |

## Privacy dashboard component

**File:** `src/components/PrivacyDashboard.tsx`

Display in real-time:
1. **Processing location indicator** — "Browser (local)" / "Local server" / "Cloud (Groq)" depending on which path the current job uses:
   - Media conversions → "Browser (FFmpeg.wasm)"
   - Text/doc/image conversions → "Local server"
   - AI chat/modify → "Cloud (Groq)" — clearly flag this
2. **Network request counter** — zero during non-AI conversions (verify via Performance API or a custom fetch interceptor)
3. **Data retention notice** — "Files deleted from memory after download" (confirm `URL.revokeObjectURL` is called in `conversionStore.ts`)
4. **AI mode disclosure** — when Groq is used, show what data is sent (file content + instruction)

## CSP audit

Review `next.config.mjs` headers:
- Confirm `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin` are set (required for FFmpeg.wasm SharedArrayBuffer)
- Consider adding `Content-Security-Policy` header that blocks `connect-src` except `https://api.groq.com` (opt-in cloud)

## Store audit

In `src/store/conversionStore.ts` confirm:
- `URL.revokeObjectURL` is called when jobs are removed/cleared
- No file content is persisted to `localStorage` or `sessionStorage` without explicit user action
