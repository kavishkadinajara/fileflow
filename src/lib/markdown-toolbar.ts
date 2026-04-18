/**
 * Markdown formatting toolbar utilities.
 * Each function takes the current textarea value + selection range,
 * and returns the new value + the new selection range.
 */

export interface InsertResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

function wrap(
  value: string,
  start: number,
  end: number,
  prefix: string,
  suffix: string
): InsertResult {
  const selected = value.slice(start, end);
  const newValue = value.slice(0, start) + prefix + selected + suffix + value.slice(end);
  return {
    value: newValue,
    selectionStart: start + prefix.length,
    selectionEnd: start + prefix.length + selected.length,
  };
}

function insertAtLineStart(
  value: string,
  start: number,
  end: number,
  prefix: string
): InsertResult {
  // Find the start of each selected line
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const selectedText = value.slice(lineStart, end);
  const modified = selectedText
    .split("\n")
    .map((line) => prefix + line)
    .join("\n");
  const newValue = value.slice(0, lineStart) + modified + value.slice(end);
  return {
    value: newValue,
    selectionStart: lineStart + prefix.length,
    selectionEnd: lineStart + modified.length,
  };
}

// ── Toolbar Actions ──────────────────────────────────────────────────────────

export function applyBold(value: string, selStart: number, selEnd: number): InsertResult {
  return wrap(value, selStart, selEnd, "**", "**");
}

export function applyItalic(value: string, selStart: number, selEnd: number): InsertResult {
  return wrap(value, selStart, selEnd, "_", "_");
}

export function applyStrikethrough(value: string, selStart: number, selEnd: number): InsertResult {
  return wrap(value, selStart, selEnd, "~~", "~~");
}

export function applyInlineCode(value: string, selStart: number, selEnd: number): InsertResult {
  return wrap(value, selStart, selEnd, "`", "`");
}

export function applyH1(value: string, selStart: number, selEnd: number): InsertResult {
  return insertAtLineStart(value, selStart, selEnd, "# ");
}

export function applyH2(value: string, selStart: number, selEnd: number): InsertResult {
  return insertAtLineStart(value, selStart, selEnd, "## ");
}

export function applyH3(value: string, selStart: number, selEnd: number): InsertResult {
  return insertAtLineStart(value, selStart, selEnd, "### ");
}

export function applyBlockquote(value: string, selStart: number, selEnd: number): InsertResult {
  return insertAtLineStart(value, selStart, selEnd, "> ");
}

export function applyBulletList(value: string, selStart: number, selEnd: number): InsertResult {
  return insertAtLineStart(value, selStart, selEnd, "- ");
}

export function applyCodeBlock(value: string, selStart: number, selEnd: number): InsertResult {
  const selected = value.slice(selStart, selEnd);
  const snippet = selected || "code here";
  const newValue = value.slice(0, selStart) + "```\n" + snippet + "\n```" + value.slice(selEnd);
  return {
    value: newValue,
    selectionStart: selStart + 4,
    selectionEnd: selStart + 4 + snippet.length,
  };
}

export function applyHorizontalRule(value: string, selStart: number, selEnd: number): InsertResult {
  const before = value.slice(0, selStart);
  const after = value.slice(selEnd);
  const prefix = before.endsWith("\n") || before === "" ? "" : "\n";
  const insertion = `${prefix}\n---\n\n`;
  return {
    value: before + insertion + after,
    selectionStart: selStart + insertion.length,
    selectionEnd: selStart + insertion.length,
  };
}

export function applyLink(value: string, selStart: number, selEnd: number): InsertResult {
  const selected = value.slice(selStart, selEnd) || "link text";
  const snippet = `[${selected}](https://example.com)`;
  const newValue = value.slice(0, selStart) + snippet + value.slice(selEnd);
  return {
    value: newValue,
    selectionStart: selStart + 1,
    selectionEnd: selStart + 1 + selected.length,
  };
}

export function applyTable(value: string, selStart: number, selEnd: number): InsertResult {
  const table = `| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Row 1    | Data     | Data     |\n| Row 2    | Data     | Data     |`;
  const before = value.slice(0, selStart);
  const after = value.slice(selEnd);
  const prefix = before.endsWith("\n") || before === "" ? "" : "\n\n";
  const insertion = prefix + table + "\n";
  return {
    value: before + insertion + after,
    selectionStart: selStart + prefix.length + 2,
    selectionEnd: selStart + prefix.length + 2 + "Column 1".length,
  };
}
