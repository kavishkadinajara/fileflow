/**
 * Shared Puppeteer browser launcher with fallback to system Chrome / Edge.
 */
import { existsSync } from "fs";
import puppeteer from "puppeteer";

const SYSTEM_BROWSERS = [
  // Chrome (Windows default paths)
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  // Edge (Windows default paths)
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

function findSystemBrowser(): string | undefined {
  for (const p of SYSTEM_BROWSERS) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

export async function launchBrowser() {
  const args = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"];

  try {
    // Try Puppeteer's bundled browser first
    return await puppeteer.launch({ headless: true, args });
  } catch {
    // Fallback: use system Chrome / Edge
    const executablePath = findSystemBrowser();
    if (!executablePath) {
      throw new Error(
        "No browser found. Install Chrome/Edge or run: npx puppeteer browsers install chrome"
      );
    }
    return await puppeteer.launch({ headless: true, args, executablePath });
  }
}
