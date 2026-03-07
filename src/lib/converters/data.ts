/**
 * JSON ↔ YAML ↔ CSV converters (server-side)
 */
import yaml from "js-yaml";
import Papa from "papaparse";

// ─── JSON ────────────────────────────────────────────────────────────────────

export function jsonToYaml(jsonString: string): string {
  const obj = JSON.parse(jsonString);
  return yaml.dump(obj, { indent: 2 });
}

export function jsonToCsv(jsonString: string): string {
  const data = JSON.parse(jsonString);
  const arr = Array.isArray(data) ? data : [data];
  return Papa.unparse(arr);
}

export function jsonToTxt(jsonString: string): string {
  // Pretty-print with 2 spaces
  return JSON.stringify(JSON.parse(jsonString), null, 2);
}

// ─── YAML ────────────────────────────────────────────────────────────────────

export function yamlToJson(yamlString: string): string {
  const obj = yaml.load(yamlString);
  return JSON.stringify(obj, null, 2);
}

export function yamlToTxt(yamlString: string): string {
  return yamlString;
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

export function csvToJson(csvString: string): string {
  const result = Papa.parse(csvString, { header: true, skipEmptyLines: true });
  return JSON.stringify(result.data, null, 2);
}

export function csvToYaml(csvString: string): string {
  const result = Papa.parse(csvString, { header: true, skipEmptyLines: true });
  return yaml.dump(result.data, { indent: 2 });
}

export function csvToHtml(csvString: string): string {
  const result = Papa.parse<string[]>(csvString, { skipEmptyLines: true });
  const rows = result.data as string[][];
  if (!rows.length) return "<table></table>";
  const [header, ...body] = rows;
  const ths = header.map((h) => `<th>${escHtml(h)}</th>`).join("");
  const trs = body
    .map((row) => `<tr>${row.map((cell) => `<td>${escHtml(cell)}</td>`).join("")}</tr>`)
    .join("\n  ");
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body { font-family: sans-serif; padding: 24px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
  th { background: #f0f2f5; font-weight: 600; }
  tr:nth-child(even) { background: #f9fafb; }
</style>
</head><body>
<table>
  <thead><tr>${ths}</tr></thead>
  <tbody>
  ${trs}
  </tbody>
</table>
</body></html>`;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
