# Review Types

Audit and extend the TypeScript type system for FileFlowOne.

## Arguments
`$ARGUMENTS` — scope, e.g. "add SFI score types" or "audit ConversionJob for missing fields"

## Central type file

All shared types live in `src/types/index.ts`:
- `FileFormat` — union of all supported format identifiers
- `FormatMeta` — label, mimeType, extension, description, icon, category
- `ConversionJob` — id, fromFormat, toFormat, status, progress, resultBlob, sourceContent, error
- `ConversionPair` — { from: FileFormat, to: FileFormat }
- `ConvertRequest` / `ConvertResponse` — API request/response shapes
- `ConvertOptions` — PDF/image/Mermaid/video options passed through the API

## Guidelines

1. **Extend `ConversionJob`** when a new piece of per-job data is needed (e.g. `sfiScore`, `privacyMode`, `processingLocation`).

2. **Extend `ConvertOptions`** when a new converter accepts configuration parameters.

3. **Add to `FileFormat`** when registering a new format — always use the `/add-format` command alongside this.

4. **Keep API types in sync** — `ConvertRequest` and `ConvertResponse` in `types/index.ts` must match the Zod schemas in `src/app/api/convert/route.ts`. If you change one, change both.

5. **Run `npx tsc --noEmit`** after any type change to confirm the whole project still compiles.

6. **Do not add `any`** — if a type is genuinely unknown, use `unknown` and narrow it at the use site.
