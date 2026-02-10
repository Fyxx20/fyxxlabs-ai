// Test different AliExpress fetching strategies
const itemId = '1005008086404944';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
};

async function tryFetch(label, url, headers = HEADERS) {
  try {
    const res = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(10000) });
    const text = await res.text();
    const hasTitle = text.match(/<meta[^>]+property="og:title"[^>]*content="([^"]+)"/);
    const hasImages = text.match(/"imagePathList"/);
    const hasSubject = text.match(/"subject"\s*:\s*"([^"]+)"/);
    const blocked = text.includes('Just a moment') || text.includes('challenge') || text.includes('captcha');
    console.log(`\n[${label}] status=${res.status} len=${text.length} blocked=${blocked}`);
    if (hasTitle) console.log(`  og:title: ${hasTitle[1].slice(0,80)}`);
    if (hasSubject) console.log(`  subject: ${hasSubject[1].slice(0,80)}`);
    if (hasImages) console.log(`  has imagePathList: true`);
    if (!hasTitle && !hasSubject && !hasImages) {
      console.log(`  first 300: ${text.slice(0,300).replace(/\n/g,' ')}`);
    }
    return text;
  } catch (e) {
    console.log(`\n[${label}] ERROR: ${e.message}`);
    return null;
  }
}

// Strategy 1: Direct FR page
await tryFetch('FR direct', `https://fr.aliexpress.com/item/${itemId}.html`);

// Strategy 2: Direct .com (no locale)
await tryFetch('.com direct', `https://www.aliexpress.com/item/${itemId}.html`);

// Strategy 3: Mobile
await tryFetch('Mobile', `https://m.aliexpress.com/item/${itemId}.html`, {
  ...HEADERS,
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
});

// Strategy 4: AliExpress internal API
await tryFetch('API detail', `https://www.aliexpress.com/aeglodetailweb/api/detail/item?itemId=${itemId}`, {
  'User-Agent': HEADERS['User-Agent'],
  'Accept': 'application/json',
  'Referer': `https://www.aliexpress.com/item/${itemId}.html`,
});

// Strategy 5: Googlebot UA
await tryFetch('Googlebot', `https://www.aliexpress.com/item/${itemId}.html`, {
  'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Accept': 'text/html',
});

// Strategy 6: Facebook crawler (forces OG meta rendering)
await tryFetch('Facebook', `https://www.aliexpress.com/item/${itemId}.html`, {
  'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  'Accept': 'text/html',
});

// Strategy 7: curl-like minimal
await tryFetch('curl-like', `https://www.aliexpress.com/item/${itemId}.html`, {
  'User-Agent': 'curl/7.88.1',
  'Accept': '*/*',
});
