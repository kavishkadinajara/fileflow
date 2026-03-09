/**
 * Shared Puppeteer browser launcher.
 * - Production / serverless: uses @sparticuz/chromium (works on Vercel / AWS Lambda)
 * - Local dev: uses system Chrome / Edge
 */
import { existsSync } from "fs";
import puppeteer from "puppeteer-core";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const SYSTEM_BROWSERS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

function findSystemBrowser(): string | undefined {
  for (const p of SYSTEM_BROWSERS) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

export async function launchBrowser() {
  if (IS_PRODUCTION) {
    // Serverless: use @sparticuz/chromium
    const chromium = (await import("@sparticuz/chromium")).default;
    return await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  // Local dev: use system Chrome / Edge
  const args = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
  ];

  const executablePath = findSystemBrowser();
  if (!executablePath) {
    throw new Error(
      "No browser found. Install Chrome/Edge or run: npx puppeteer browsers install chrome"
    );
  }
  return await puppeteer.launch({ headless: true, args, executablePath });
}
