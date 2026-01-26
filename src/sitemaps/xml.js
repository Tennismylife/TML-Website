function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

exports.xmlHeaderUrlset = function() { return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'; };
exports.xmlFooterUrlset = function() { return '</urlset>'; };
exports.xmlHeaderSitemapIndex = function() { return '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'; };
exports.xmlFooterSitemapIndex = function() { return '</sitemapindex>'; };
exports.urlEntry = function({ loc, changefreq, priority, lastmod }) {
  const cf = changefreq || 'weekly';
  const pr = priority || '0.50';
  const lm = lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>\n` : '';
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n${lm}    <changefreq>${cf}</changefreq>\n    <priority>${pr}</priority>\n  </url>\n`;
};
exports.sitemapEntry = function({ loc, lastmod }) {
  const lm = lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : '';
  return `  <sitemap>\n    <loc>${escapeXml(loc)}</loc>\n${lm}  </sitemap>\n`;
};
