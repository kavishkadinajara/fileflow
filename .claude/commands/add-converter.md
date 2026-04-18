# Add Converter

Add a new format conversion pair to FileFlowOne.

## Arguments
`$ARGUMENTS` — describe the conversion, e.g. "latex to markdown" or "epub to html"

## Steps

1. **Register the format(s)** in `src/types/index.ts` — add new format identifier(s) to the `FileFormat` union type if not present.

2. **Add metadata** in `src/lib/formats.ts` — add entries to `FORMAT_META` with label, MIME type, extension, description, icon, and category. Update the conversion support matrix so `isConversionSupported()` returns true for the new pair.

3. **Write the converter** in `src/lib/converters/` — create or extend the appropriate module (e.g. `text.ts` for text-based, `data.ts` for structured data). Export a single async function:
   ```ts
   export async function xToY(content: string | Buffer, options?: ConvertOptions): Promise<string | Buffer>
   ```

4. **Wire into the dispatcher** in `src/app/api/convert/route.ts` — add a case in the dispatch logic that calls the new converter and returns `{ data, mimeType, filename }` in base64 format.

5. **Verify** that the conversion appears in `ConversionConfig.tsx` automatically (it renders from `FORMAT_META` + `isConversionSupported()`). Run `npm run build` to confirm no type errors.

Follow the same error handling shape and base64 I/O contract as the nearest existing converter.
