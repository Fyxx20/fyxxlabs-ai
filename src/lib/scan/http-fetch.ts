const TIMEOUT_MS = 8000;

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  Connection: "keep-alive",
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchHtmlWithHttp(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
      redirect: "follow",
    });
    clearTimeout(timeout);
    // Accept any response that has HTML content (even 403/503 behind Cloudflare)
    const contentType = res.headers.get("content-type") ?? "";
    if (res.ok || contentType.includes("text/html") || contentType.includes("text/plain")) {
      const text = await res.text();
      if (text.length > 100) return text;
    }
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/** Fetch a single URL with one retry on failure */
async function fetchWithRetry(url: string): Promise<{ url: string; html: string } | null> {
  try {
    const html = await fetchHtmlWithHttp(url);
    return { url, html };
  } catch {
    // Retry once after small delay
    await delay(300);
    try {
      const html = await fetchHtmlWithHttp(url);
      return { url, html };
    } catch (err) {
      console.error(`[scan] Failed to fetch ${url}: ${err instanceof Error ? err.message : "unknown"}`);
      return null;
    }
  }
}

/** Fetch multiple URLs in parallel with concurrency limit and delays between batches */
export async function fetchMultipleHttp(
  urls: string[],
  concurrency = 5
): Promise<{ url: string; html: string }[]> {
  const results: { url: string; html: string }[] = [];
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map((url) => fetchWithRetry(url))
    );
    for (const r of settled) {
      if (r.status === "fulfilled" && r.value) results.push(r.value);
    }
    // Small delay between batches to avoid rate limiting
    if (i + concurrency < urls.length) {
      await delay(200);
    }
  }
  return results;
}
