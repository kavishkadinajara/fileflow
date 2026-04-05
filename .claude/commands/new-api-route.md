# New API Route

Add a new Next.js App Router API endpoint to FileFlowOne.

## Arguments
`$ARGUMENTS` — route purpose, e.g. "POST /api/slm-score — receive original+converted pair, return SFI score JSON"

## Steps

1. **Create the route file** at `src/app/api/<route-name>/route.ts`.

2. **Use Zod for input validation** — follow the same pattern as `src/app/api/convert/route.ts`:
   ```ts
   import { z } from 'zod';
   const RequestSchema = z.object({ ... });
   export async function POST(req: Request) {
     const body = await req.json();
     const parsed = RequestSchema.safeParse(body);
     if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 });
     ...
   }
   ```

3. **For AI/streaming routes** — follow `src/app/api/chat/route.ts` which uses the Vercel `ai` library with `@ai-sdk/groq`. The Groq API key is read from `process.env.GROQ_API_KEY`.

4. **For file-processing routes** — accept base64-encoded file content (same contract as `/api/convert`) so the client doesn't need special fetch handling.

5. **Update CORS headers** in `next.config.mjs` only if this route needs to be called cross-origin.

6. **Call the route from the client** — add the fetch call in the relevant component or in `src/store/conversionStore.ts` if it relates to job processing.

7. Run `npm run build` to confirm no type errors.
