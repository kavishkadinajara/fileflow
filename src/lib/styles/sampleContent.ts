/**
 * Sample Markdown used in the Style Studio live preview.
 * Designed to exercise every renderable element: headings, paragraphs,
 * lists, code, tables, blockquotes, links, images.
 */
export const STUDIO_SAMPLE_MD = `# The Quick Brown Fox

A demonstration document for the **Style Studio**. Every element below shows how your style choices will render in the final output.

## Section One

The quick brown fox jumps over the lazy dog. The five boxing wizards jump quickly. Pack my box with five dozen liquor jugs.

This paragraph contains **bold text**, *italic text*, and \`inline code\`. Links look like [this one](https://example.com).

### Sub-section with a list

- First bullet point
- Second bullet — with *some emphasis*
- Third bullet, slightly longer to test wrapping behaviour

### Numbered list

1. Step one
2. Step two
3. Step three

## Section Two

> "Design is not just what it looks like and feels like. Design is how it works."
> — Steve Jobs

### Code block

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

const message = greet("world");
console.log(message);
\`\`\`

### Data table

| Column | Type | Description |
|---|---|---|
| ID | INT | Primary key |
| Name | VARCHAR | Display name |
| Email | VARCHAR | Contact address |
| Active | BIT | Status flag |

## Section Three

A final paragraph to demonstrate body text flow. This is the kind of length that will appear in real documents — research papers, business reports, technical documentation.

The end.
`;
