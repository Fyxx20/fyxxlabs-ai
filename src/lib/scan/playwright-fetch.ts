import { chromium } from "playwright";

const TIMEOUT_MS = 25000;

export async function fetchHtmlWithPlaywright(url: string): Promise<string> {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (compatible; FyxxLabsBot/1.0; +https://fyxxlabs.com)",
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: TIMEOUT_MS });
    await page.waitForTimeout(1500);
    const html = await page.content();
    return html;
  } finally {
    await browser.close();
  }
}

export async function fetchMultipleUrls(
  urls: string[]
): Promise<{ url: string; html: string }[]> {
  const results: { url: string; html: string }[] = [];
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    for (const url of urls) {
      try {
        const page = await browser.newPage({
          userAgent:
            "Mozilla/5.0 (compatible; FyxxLabsBot/1.0; +https://fyxxlabs.com)",
        });
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: TIMEOUT_MS,
        });
        await page.waitForTimeout(800);
        const html = await page.content();
        results.push({ url, html });
        await page.close();
      } catch (err) {
        console.error(`Failed to fetch ${url}:`, err);
      }
    }
    return results;
  } finally {
    await browser.close();
  }
}
