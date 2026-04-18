# New Component

Create a new React component for the FileFlowOne UI.

## Arguments
`$ARGUMENTS` — component name and purpose, e.g. "QualityScoreCard — shows SFI radar chart after conversion"

## Steps

1. **Create the file** at `src/components/<ComponentName>.tsx` using TypeScript + Tailwind CSS.

2. **Follow the existing patterns:**
   - Use shadcn/ui primitives from `src/components/ui/` (Button, Card, Badge, Dialog, etc.)
   - Use `lucide-react` for icons
   - Use `cn()` from `src/lib/utils.ts` for conditional class merging
   - Use `next-themes` via the existing theme provider for dark/light mode support

3. **Access global state** via the Zustand store if needed:
   ```ts
   import { useConversionStore } from '@/store/conversionStore';
   const { jobs, activeFile } = useConversionStore();
   ```

4. **Wire into the layout** — add the component to `src/components/ConverterWorkspace.tsx` or the appropriate parent. Check `src/app/page.tsx` if it belongs on the home page.

5. **No new state management files** — extend `conversionStore.ts` if shared state is needed rather than creating a new store.

6. Run `npm run build` to confirm no errors.
