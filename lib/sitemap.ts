export async function generateSitemapXml() {
  const base = process.env.SITE_URL || 'https://example.com';
  const routes = ['/', '/records', '/ranking', '/players'];
  const urls = routes.map((p) => `  <url><loc>${base}${p}</loc><changefreq>weekly</changefreq></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

export async function getSitemapUrls() {
  return ['/', '/records', '/ranking', '/players'];
}
