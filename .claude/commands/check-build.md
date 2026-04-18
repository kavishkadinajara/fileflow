# Check Build

Run all static checks for FileFlowOne and surface any errors.

## Steps

Run these in order:

```bash
# 1. Type check (no emit)
npx tsc --noEmit

# 2. Lint
npm run lint

# 3. Production build (catches dynamic import issues, missing env vars at build time)
npm run build
```

## Common failure patterns

| Error | Likely cause | Where to fix |
|---|---|---|
| `Type X is not assignable to FileFormat` | New format added to dispatcher but not to type union | `src/types/index.ts` |
| `Cannot find module '@/...'` | Wrong import path or missing file | Check the file exists under `src/` |
| `serverExternalPackages` warning | New native module used server-side | Add to `serverExternalPackages` in `next.config.mjs` |
| Puppeteer launch error at build | Chromium download — safe to ignore at build time | No action needed |
| `GROQ_API_KEY` missing | AI routes require this env var at runtime, not build | Add to `.env.local` |

## After fixing errors

Re-run `npx tsc --noEmit` first (fast), then `npm run build` to confirm the full pipeline passes.
