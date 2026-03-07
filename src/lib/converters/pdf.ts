/**
 * HTML → PDF converter (server-side via Puppeteer)
 */
import { launchBrowser } from "./browser";

export interface PdfOptions {
  format?: "A4" | "A3" | "Letter" | "Legal";
  landscape?: boolean;
  professional?: boolean;
}

export async function htmlToPdf(html: string, opts: PdfOptions = {}): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    // Wait for Mermaid diagrams to finish rendering (if any)
    const hasMermaid = html.includes('class="mermaid"');
    if (hasMermaid) {
      await page.waitForFunction(
        () => {
          const els = document.querySelectorAll(".mermaid");
          return els.length === 0 || Array.from(els).every((el) => el.querySelector("svg"));
        },
        { timeout: 15000 }
      ).catch(() => {});
    }
    const pdf = await page.pdf({
      format: opts.format ?? "A4",
      landscape: opts.landscape ?? false,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:8px;color:#9CA3AF;width:100%;text-align:right;padding:0 15mm;font-family:Calibri,sans-serif;"><span class="title"></span></div>`,
      footerTemplate: `<div style="font-size:8px;color:#6B7280;width:100%;text-align:center;padding:0 15mm;font-family:Calibri,sans-serif;border-top:1px solid #E5E7EB;padding-top:4px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
      margin: { top: "25mm", bottom: "25mm", left: "20mm", right: "20mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

/**
 * HTML → PNG screenshot
 */
export async function htmlToPng(html: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setContent(html, { waitUntil: "networkidle0" });
    // Wait for Mermaid diagrams to finish rendering (if any)
    const hasMermaid = html.includes('class="mermaid"');
    if (hasMermaid) {
      await page.waitForFunction(
        () => {
          const els = document.querySelectorAll(".mermaid");
          return els.length === 0 || Array.from(els).every((el) => el.querySelector("svg"));
        },
        { timeout: 15000 }
      ).catch(() => {});
    }
    const screenshot = await page.screenshot({ type: "png", fullPage: true, omitBackground: false });
    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}
