// Test the full scrape flow as the API does it
import * as cheerio from 'cheerio';

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

const url = 'https://fr.aliexpress.com/item/1005010641274707.html?spm=a2g0o.home.pcJustForYou.14.2eebf0c9fcdRbz&gps-id=pcJustForYou';

try {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const res = await fetch(url, {
    signal: controller.signal,
    headers: BROWSER_HEADERS,
    redirect: 'follow',
  });
  clearTimeout(timeout);
  console.log('Status:', res.status);
  console.log('CT:', res.headers.get('content-type'));
  
  const ct = res.headers.get('content-type') ?? '';
  if (res.ok || ct.includes('text/html')) {
    const html = await res.text();
    console.log('HTML length:', html.length);
    
    const $ = cheerio.load(html);
    
    let title = $('meta[property="og:title"]').attr('content')?.trim() || $('h1').first().text().trim() || $('title').first().text().trim() || '';
    console.log('Raw title:', JSON.stringify(title.slice(0, 200)));
    
    title = title.replace(/\s*[-|]\s*(AliExpress|Amazon|Temu|eBay|Alibaba).*$/i, '').trim();
    console.log('Clean title:', JSON.stringify(title.slice(0, 200)));
    console.log('Title length:', title.length);
    console.log('Would pass check:', title.length >= 3);
    
    // Check AliExpress-specific: imagePathList
    const imgMatch = html.match(/"imagePathList":\s*\[([^\]]+)\]/);
    if (imgMatch) {
      const imgs = imgMatch[1].match(/"(https?:\/\/[^"]+)"/g);
      console.log('AliExpress images found:', imgs?.length);
    }
    
    // Price from script data
    const pricePatterns = [
      /"formattedPrice":"([^"]+)"/,
      /"minPrice":"([^"]+)"/,
      /"discountPrice":"([^"]+)"/,
      /"actMinPrice":"([^"]+)"/,
    ];
    for (const p of pricePatterns) {
      const m = html.match(p);
      if (m) console.log('Price pattern', p.source.slice(0, 30), ':', m[1]);
    }
  } else {
    console.log('BAD status, not HTML');
  }
} catch (e) {
  console.error('FETCH ERROR:', e.message);
}
