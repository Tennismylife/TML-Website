export function xmlHeaderUrlset() {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
}

export function xmlFooterUrlset() {
  return `</urlset>`;
}

export function xmlHeaderSitemapIndex() {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
}

export function xmlFooterSitemapIndex() {
  return `</sitemapindex>`;
}

export function urlEntry({ loc, changefreq, priority, lastmod }: { loc: string; changefreq?: string; priority?: string; lastmod?: string }) {
  const cf = changefreq || 'weekly';
  const pr = priority || '0.50';
  const lm = lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : '';
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n${lm}    <changefreq>${cf}</changefreq>\n    <priority>${pr}</priority>\n  </url>\n`;
}

export function sitemapEntry({ loc, lastmod }: { loc: string; lastmod?: string }) {
  const lm = lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : '';
  return `  <sitemap>\n    <loc>${escapeXml(loc)}</loc>\n${lm}  </sitemap>\n`;
}

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
