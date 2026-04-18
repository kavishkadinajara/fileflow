# Add AI Feature

Add a new AI-powered capability to FileFlowOne using the Groq API.

## Arguments
`$ARGUMENTS` — feature description, e.g. "add document summarization before conversion" or "add PII detection before cloud routing"

## Available AI infrastructure

- **Groq LLaMA 3.3** — chat, instruction-following, text rewriting (see `src/app/api/chat/route.ts`)
- **Groq LLaMA Maverick** — classification/detection with higher accuracy (see `src/app/api/ai-tools/route.ts`)
- **`ai` library (Vercel)** — `streamText()` for streaming, `generateText()` for non-streaming
- **`@ai-sdk/groq`** — Groq provider for the ai library
- **`@ai-sdk/google`** — Google provider (configured but check `.env.local` for key)

## Steps

1. **Decide the route** — extend an existing route or create a new one:
   - Extends chat behaviour → add a system prompt branch in `src/app/api/chat/route.ts`
   - New standalone feature → create `src/app/api/<feature-name>/route.ts` using the `/new-api-route` command

2. **System prompt design** — be explicit about input/output format. For structured outputs request JSON directly in the prompt and parse with Zod. Follow the pattern in `src/app/api/ai-tools/route.ts`.

3. **Non-streaming vs streaming:**
   - Use `streamText()` + `result.toDataStreamResponse()` when the user watches output generate (chat, rewriting)
   - Use `generateText()` when you need the full response before acting (detection, scoring, routing)

4. **Add the UI trigger** — in the relevant component (`AiChat.tsx`, `AiToolsPanel.tsx`, or a new component). Show a loading state and handle the `error` case from the API.

5. **Store results** — if the AI output affects job processing, update `conversionStore.ts`. If it's a one-off analysis, keep state local to the component.

6. **Privacy note** — any feature that sends file content to Groq must be clearly disclosed in the UI (see `/privacy-audit` command). Add a tooltip or banner near the trigger button.

7. Run `npm run build` to confirm no type errors.
