# Building a Type-Safe File Converter in TypeScript

This tutorial walks through building a robust file conversion module in TypeScript, covering input validation, format detection, stream processing, and error handling.

## Prerequisites

- Node.js 20+
- TypeScript 5.3+
- `npm install zod sharp mammoth`

## Project Structure

```
src/
  converters/
    text.ts        ← Markdown ↔ HTML, DOCX, TXT
    image.ts       ← PNG ↔ JPEG, SVG
    docx.ts        ← DOCX extraction
  lib/
    formats.ts     ← Format registry
    utils.ts       ← Shared helpers
  types/
    index.ts       ← Shared type definitions
```

## Step 1: Define the Type System

Start with a discriminated union for all supported formats:

```typescript
// src/types/index.ts

export type FileFormat =
  | "md" | "html" | "docx" | "pdf" | "txt"
  | "png" | "jpeg" | "svg"
  | "json" | "yaml" | "csv";

export interface ConversionJob {
  id:         string;
  fileName:   string;
  fromFormat: FileFormat;
  toFormat:   FileFormat;
  status:     "idle" | "processing" | "done" | "error";
  progress:   number;
  resultBlob?: Blob;
  error?:     string;
  createdAt:  Date;
}

export interface ConvertRequest {
  fileBase64: string;
  fileName:   string;
  fromFormat: FileFormat;
  toFormat:   FileFormat;
  options?:   ConvertOptions;
}

export interface ConvertOptions {
  pdfPageSize?:    "A4" | "A3" | "Letter" | "Legal";
  pdfOrientation?: "portrait" | "landscape";
  imageQuality?:   number;
}
```

## Step 2: Build the Format Registry

```typescript
// src/lib/formats.ts

import type { FileFormat } from "@/types";

export const SUPPORTED_CONVERSIONS: { from: FileFormat; to: FileFormat }[] = [
  { from: "md",   to: "html"  },
  { from: "md",   to: "docx"  },
  { from: "md",   to: "pdf"   },
  { from: "md",   to: "txt"   },
  { from: "html", to: "md"    },
  { from: "html", to: "docx"  },
  { from: "html", to: "pdf"   },
  { from: "docx", to: "md"    },
  { from: "docx", to: "html"  },
  { from: "docx", to: "pdf"   },
];

export function isConversionSupported(from: FileFormat, to: FileFormat): boolean {
  return SUPPORTED_CONVERSIONS.some((p) => p.from === from && p.to === to);
}

export function getSupportedOutputs(from: FileFormat): FileFormat[] {
  return SUPPORTED_CONVERSIONS
    .filter((p) => p.from === from)
    .map((p) => p.to);
}

export function detectTextFormat(text: string): FileFormat {
  const trimmed = text.trim();
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) return "html";
  if (/^#+\s/m.test(trimmed) || /^[-*]\s/m.test(trimmed)) return "md";
  return "txt";
}
```

## Step 3: Implement the Markdown Converter

```typescript
// src/lib/converters/text.ts

import { marked } from "marked";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";
import type { FileFormat } from "@/types";

/** Markdown → HTML */
export async function mdToHtml(md: string): Promise<string> {
  const html = await marked.parse(md);
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Converted</title></head>
<body>${html}</body>
</html>`;
}

/** Markdown → plain text (strips all markdown syntax) */
export function mdToTxt(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")           // code blocks
    .replace(/`[^`]+`/g, "")                  // inline code
    .replace(/^#{1,6}\s+/gm, "")              // headings
    .replace(/[*_~>|]/g, "")                   // formatting
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")  // links → text
    .replace(/\s+/g, " ")
    .trim();
}

/** Markdown → DOCX buffer */
export async function mdToDocx(md: string): Promise<Buffer> {
  const lines = md.split("\n");
  const children: Paragraph[] = [];

  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);
    const li = line.match(/^[-*]\s+(.+)/);

    if (h1) {
      children.push(new Paragraph({ text: h1[1], heading: HeadingLevel.HEADING_1 }));
    } else if (h2) {
      children.push(new Paragraph({ text: h2[1], heading: HeadingLevel.HEADING_2 }));
    } else if (h3) {
      children.push(new Paragraph({ text: h3[1], heading: HeadingLevel.HEADING_3 }));
    } else if (li) {
      children.push(new Paragraph({ text: `• ${li[1]}` }));
    } else if (line.trim()) {
      children.push(new Paragraph({ text: line }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
```

## Step 4: Add Zod Validation to the API Route

```typescript
// src/app/api/convert/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  fileBase64: z.string().min(1),
  fileName:   z.string().min(1).max(255),
  fromFormat: z.enum(["md", "html", "docx", "pdf", "txt", "png", "jpeg"]),
  toFormat:   z.enum(["md", "html", "docx", "pdf", "txt", "png", "jpeg"]),
  options:    z.object({
    pdfPageSize:    z.enum(["A4", "A3", "Letter", "Legal"]).optional(),
    pdfOrientation: z.enum(["portrait", "landscape"]).optional(),
    imageQuality:   z.number().min(1).max(100).optional(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  const body   = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.message },
      { status: 400 },
    );
  }

  const { fileBase64, fileName, fromFormat, toFormat, options = {} } = parsed.data;
  const fileBuffer = Buffer.from(fileBase64, "base64");

  try {
    const result = await runConversion(fileBuffer, fileName, fromFormat, toFormat, options);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Conversion failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
```

## Step 5: Write Tests

```typescript
// src/lib/converters/__tests__/text.test.ts

import { describe, it, expect } from "vitest";
import { mdToTxt, detectTextFormat } from "@/lib/formats";
import { mdToHtml } from "@/lib/converters/text";

describe("mdToTxt", () => {
  it("strips headings", () => {
    expect(mdToTxt("# Hello\nWorld")).toBe("Hello World");
  });

  it("strips links, keeps text", () => {
    expect(mdToTxt("[click here](https://example.com)")).toBe("click here");
  });

  it("strips code blocks", () => {
    expect(mdToTxt("```js\nconsole.log('hi')\n```")).toBe("");
  });
});

describe("detectTextFormat", () => {
  it("detects HTML", () => {
    expect(detectTextFormat("<!DOCTYPE html><html></html>")).toBe("html");
  });

  it("detects Markdown by heading", () => {
    expect(detectTextFormat("# Title\nSome text")).toBe("md");
  });

  it("falls back to txt", () => {
    expect(detectTextFormat("Just plain text")).toBe("txt");
  });
});

describe("mdToHtml", () => {
  it("wraps in html document", async () => {
    const html = await mdToHtml("# Hello");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<h1>");
  });
});
```

## Common Pitfalls

- **Buffer vs Uint8Array**: When passing file data to `new Blob()`, always use `new Blob([new Uint8Array(buffer)])` rather than `new Blob([buffer])` to avoid TypeScript type errors.
- **MIME types**: Always set explicit MIME types when creating `File` objects for multipart uploads — browsers may report `""` for `.docx` files.
- **Puppeteer memory**: Always call `browser.close()` in a `finally` block. Browser processes do not self-terminate on route handler exit.
- **React Strict Mode double-fire**: Guard `useEffect` with a `useRef` flag when the effect must run exactly once (e.g., auto-triggering a network request on mount).
