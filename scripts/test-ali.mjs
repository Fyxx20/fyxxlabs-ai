const url = 'https://fr.aliexpress.com/item/1005010641274707.html';
const res = await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
  redirect: 'follow',
  signal: AbortSignal.timeout(15000),
});
const html = await res.text();

// Check for subject (title)
const subjectMatch = html.match(/"subject":"([^"]+)"/);
console.log('subject:', subjectMatch?.[1]?.slice(0, 200));

// Check for price  
const priceMatch = html.match(/"formattedPrice":"([^"]+)"/);
console.log('formattedPrice:', priceMatch?.[1]);
const minPriceMatch = html.match(/"minPrice":"([^"]+)"/);
console.log('minPrice:', minPriceMatch?.[1]);
const minAmountMatch = html.match(/"minAmount":\{[^}]*"value":([0-9.]+)/);
console.log('minAmount:', minAmountMatch?.[1]);

// Check for images
const imgMatch = html.match(/"imagePathList":\s*\[([^\]]+)\]/);
if (imgMatch) {
  const imgs = imgMatch[1].match(/"(https?:\/\/[^"]+)"/g);
  console.log('images:', imgs?.slice(0, 3));
}

// Check og:title
const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]*content="([^"]+)"/);
console.log('og:title:', ogTitle?.[1]?.slice(0, 200));

// Check title tag
const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/);
console.log('title tag:', titleTag?.[1]?.slice(0, 200));

// Check for product description
const descMatch = html.match(/"description":"([^"]{0,300})"/);
console.log('description:', descMatch?.[1]?.slice(0, 200));

// Check for DCData
const dcMatch = html.match(/window\._d_c_\.DCData/);
console.log('Has DCData:', !!dcMatch);

// Check for currency
const currMatch = html.match(/"currencyCode":"([^"]+)"/);
console.log('currency:', currMatch?.[1]);

// Check for category 
const catMatch = html.match(/"categoryName":"([^"]+)"/);
console.log('categoryName:', catMatch?.[1]);
