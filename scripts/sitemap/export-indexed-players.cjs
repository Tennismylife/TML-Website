const fs = require('fs');
const path = require('path');

const sitemapDir = path.join(__dirname, '..', '..', 'public', 'sitemaps');
const outputPath = path.join(__dirname, '..', '..', 'tmp', 'indexed-players-sitemap.csv');

function main() {
  if (!fs.existsSync(sitemapDir)) {
    throw new Error(`Sitemap directory not found: ${sitemapDir}`);
  }

  const files = fs.readdirSync(sitemapDir)
    .filter(f => f.startsWith('sitemap-players-') && f.endsWith('.xml'))
    .sort();

  const urlRegex = /<loc>([^<]+)<\/loc>/g;
  const urls = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(sitemapDir, file), 'utf8');
    let match;
    while ((match = urlRegex.exec(content))) {
      const url = match[1].trim();
      if (url.includes('/players/')) {
        urls.push(url);
      }
    }
  }

  const uniqueUrls = Array.from(new Set(urls)).sort((a, b) => a.localeCompare(b));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const csvLines = [
    'url,slug,id',
    ...uniqueUrls.map(url => {
      const slug = url.replace(/^https?:\/\/[^\/]+\//, '').replace(/^players\//, '').replace(/\/?$/, '');
      return `"${url.replace(/"/g, '""')}","${slug.replace(/"/g, '""')}",""`;
    }),
  ];

  fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf8');
  console.log(`Wrote ${uniqueUrls.length} player URLs to ${outputPath}`);
}

main();
