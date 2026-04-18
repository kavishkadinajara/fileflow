# Add Format

Register a new file format in the FileFlowOne format registry without necessarily adding conversion logic yet.

## Arguments
`$ARGUMENTS` — format details, e.g. "epub, application/epub+zip, .epub, eBook format, document"

## Steps

1. **Add to `FileFormat` union** in `src/types/index.ts`:
   ```ts
   export type FileFormat = ... | 'epub';
   ```

2. **Add to `FORMAT_META`** in `src/lib/formats.ts`:
   ```ts
   epub: {
     label: 'EPUB',
     mimeType: 'application/epub+zip',
     extension: '.epub',
     description: 'eBook format',
     icon: '📖',
     category: 'document',
   }
   ```
   Categories available: `document` | `data` | `image` | `diagram` | `sql` | `media`

3. **Update the support matrix** in `src/lib/formats.ts` — add only the conversion pairs that have actual converter implementations. Do not add unsupported pairs.

4. Run `npx tsc --noEmit` to confirm no type errors.
