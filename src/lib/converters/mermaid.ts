/**
 * Mermaid diagram → SVG / PNG / PDF / HTML (server-side via Puppeteer)
 */
import { launchBrowser } from "./browser";

const MERMAID_CDN =
  "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";

function buildMermaidHtml(code: string, theme = "default"): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 24px; background: white; display: flex; justify-content: center; align-items: center; min-height: 100vh; box-sizing: border-box; }
    .mermaid { max-width: 100%; }
  </style>
  <script src="${MERMAID_CDN}"></script>
</head>
<body>
  <div class="mermaid">
${code}
  </div>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: '${theme}' });
  </script>
</body>
</html>`;
}

export async function mermaidToSvg(code: string, theme = "default"): Promise<string> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(buildMermaidHtml(code, theme), { waitUntil: "networkidle0" });
    await page.waitForSelector(".mermaid svg", { timeout: 15000 });
    const svg = await page.evaluate(() => {
      const el = document.querySelector(".mermaid svg");
      return el ? el.outerHTML : "";
    });
    return svg;
  } finally {
    await browser.close();
  }
}

export async function mermaidToPng(code: string, theme = "default"): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    // Use 3x device scale for high-quality PNG output
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 3 });
    await page.setContent(buildMermaidHtml(code, theme), { waitUntil: "networkidle0" });
    await page.waitForSelector(".mermaid svg", { timeout: 15000 });
    const element = await page.$(".mermaid");
    const screenshot = await element!.screenshot({ type: "png", omitBackground: false });
    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}

export async function mermaidToPdf(code: string, theme = "default"): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(buildMermaidHtml(code, theme), { waitUntil: "networkidle0" });
    await page.waitForSelector(".mermaid svg", { timeout: 15000 });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function mermaidToHtml(code: string, theme = "default"): Promise<string> {
  return buildMermaidHtml(code, theme);
}
