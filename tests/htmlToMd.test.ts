/**
 * htmlToMd serializer — the tokenizer → tree → GFM emitter that replaced the
 * regex chain after ConvertBench caught it leaking CSS and destroying tables.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { htmlToMd } from "../src/lib/converters/text";

test("drops <head>/<style>/<script> instead of leaking CSS text", () => {
  const html = `<!DOCTYPE html><html><head><title>T</title>
    <style>body { color: red; } @page { size: A4; }</style>
    <script>alert(1)</script></head>
    <body><p>Real content.</p></body></html>`;
  const md = htmlToMd(html);
  assert.equal(md, "Real content.");
});

test("converts <table> to a GFM table with separator row", () => {
  const html = `<table><thead><tr><th>Name</th><th>Qty</th></tr></thead>
    <tbody><tr><td>Widget</td><td>3</td></tr><tr><td>Bolt</td><td>12</td></tr></tbody></table>`;
  const md = htmlToMd(html);
  assert.match(md, /\| Name \| Qty \|/);
  assert.match(md, /\| --- \| --- \|/);
  assert.match(md, /\| Widget \| 3 \|/);
  assert.match(md, /\| Bolt \| 12 \|/);
});

test("table without thead promotes the first row to header", () => {
  const md = htmlToMd(`<table><tr><td>A</td><td>B</td></tr><tr><td>1</td><td>2</td></tr></table>`);
  const lines = md.split("\n");
  assert.equal(lines[0], "| A | B |");
  assert.equal(lines[1], "| --- | --- |");
  assert.equal(lines[2], "| 1 | 2 |");
});

test("escapes pipes inside table cells", () => {
  const md = htmlToMd(`<table><tr><th>Expr</th></tr><tr><td>a | b</td></tr></table>`);
  assert.match(md, /\| a \\\| b \|/);
});

test("ordered lists keep numbering and start attribute", () => {
  const md = htmlToMd(`<ol start="3"><li>third</li><li>fourth</li></ol>`);
  assert.match(md, /^3\. third$/m);
  assert.match(md, /^4\. fourth$/m);
});

test("nested lists indent under their parent item", () => {
  const md = htmlToMd(`<ul><li>top<ul><li>inner</li></ul></li></ul>`);
  assert.match(md, /^- top$/m);
  assert.match(md, /^ {2}- inner$/m);
});

test("blockquote renders with > prefix", () => {
  const md = htmlToMd(`<blockquote><p>Quoted line.</p></blockquote>`);
  assert.match(md, /^> Quoted line\.$/m);
});

test("pre/code keeps language and content verbatim", () => {
  const md = htmlToMd(`<pre><code class="language-python">def f(x):\n    return x</code></pre>`);
  assert.match(md, /^```python$/m);
  assert.match(md, /^ {4}return x$/m);
});

test("inline marks: strong, em, code, link, image", () => {
  const md = htmlToMd(`<p><strong>b</strong> <em>i</em> <code>c()</code>
    <a href="https://x.test/d">doc</a> <img src="p.png" alt="pic"/></p>`);
  assert.match(md, /\*\*b\*\*/);
  assert.match(md, /\*i\*/);
  assert.match(md, /`c\(\)`/);
  assert.match(md, /\[doc\]\(https:\/\/x\.test\/d\)/);
  assert.match(md, /!\[pic\]\(p\.png\)/);
});

test("decodes entities including numeric forms", () => {
  const md = htmlToMd(`<p>A &amp; B &lt;tag&gt; &#8212; &#x2192; ok</p>`);
  assert.equal(md, "A & B <tag> — → ok");
});

test("headings h1-h6 map to # levels", () => {
  const md = htmlToMd(`<h1>One</h1><h3>Three</h3><h6>Six</h6>`);
  assert.match(md, /^# One$/m);
  assert.match(md, /^### Three$/m);
  assert.match(md, /^###### Six$/m);
});

test("tolerates unclosed tags (tag soup)", () => {
  const md = htmlToMd(`<ul><li>one<li>two</ul><p>after`);
  assert.match(md, /^- one$/m);
  assert.match(md, /^- two$/m);
  assert.match(md, /after/);
});
