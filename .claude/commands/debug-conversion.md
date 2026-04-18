# Debug Conversion

Diagnose a failing or incorrect conversion in FileFlowOne.

## Arguments
`$ARGUMENTS` — describe the issue, e.g. "md to docx loses table formatting" or "mermaid to png returns blank image"

## Investigation checklist

1. **Find the dispatcher case** in `src/app/api/convert/route.ts` — confirm the from/to pair is handled and not falling through to a default error.

2. **Read the converter module** — locate the relevant function in `src/lib/converters/` (check `text.ts`, `mermaid.ts`, `data.ts`, `docx.ts`, `pdf.ts`, `image.ts`, `sql.ts`). Look for:
   - Incorrect assumptions about input encoding (Buffer vs string vs base64)
   - Missing `await` on async calls
   - Puppeteer or Sharp options that clip content

3. **Check Puppeteer** (for PDF/PNG issues) in `src/lib/converters/browser.ts` — confirm the browser launches successfully. On Windows, the fallback order is bundled Chromium → system Chrome → Edge.

4. **Check the Zustand job state** in `src/store/conversionStore.ts` — confirm the job status transitions correctly (idle → processing → done/error) and that `resultBlob` is being set.

5. **Reproduce with minimal input** — create the smallest possible input that triggers the bug and trace it through the dispatcher → converter → response.

6. **Run `npm run build`** after the fix to catch any TypeScript errors introduced.
