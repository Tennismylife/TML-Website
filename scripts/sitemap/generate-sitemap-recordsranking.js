#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const jiti = require('jiti')(__filename);

async function main() {
  try {
    const baseDir = path.join(process.cwd(), 'app', 'recordsranking');
    if (!fs.existsSync(baseDir)) throw new Error('app/recordsranking directory not found');

    // compute global lastmod from DB (reuse prisma)
    let globalMaxDate;
    try {
      const { prisma } = jiti(require('path').join(process.cwd(), 'lib', 'prisma'));
      const globalMax = await prisma.match.aggregate({ _max: { tourney_date: true } });
      globalMaxDate = globalMax._max.tourney_date ? new Date(globalMax._max.tourney_date).toISOString().split('T')[0] : undefined;
    } catch (e) {
      console.warn('Could not compute global max date from DB:', e.message || e);
    }

    const routes = new Set();

    // Walk recursively
    function walk(dir) {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const p = path.join(dir, item.name);
        if (item.isDirectory()) {
          // If directory contains a page file, treat it as a route node
          const possibleFiles = ['page.tsx', 'page.ts', 'page.jsx', 'page.js'];
          const hasPage = possibleFiles.some(f => fs.existsSync(path.join(p, f)));
          if (hasPage) processRouteDir(p);
          // continue walking into subdirectories
          walk(p);
        }
      }
    }

    async function processRouteDir(dir) {
      // derive route path from folder structure
      const rel = path.relative(path.join(process.cwd(), 'app'), dir);
      const routePath = '/' + rel.split(path.sep).map(seg => seg).join('/');

      // Try explicit page file imports to avoid resolution issues
      const possibleFiles = ['page.tsx', 'page.ts', 'page.jsx', 'page.js'];
      let imported = false;

      for (const f of possibleFiles) {
        const file = path.join(dir, f);
        if (!fs.existsSync(file)) continue;
        try {
          const mod = jiti(file);
          imported = true;
          if (mod && typeof mod.generateStaticParams === 'function') {
            const params = await mod.generateStaticParams();
            if (Array.isArray(params)) {
              for (const p of params) {
                if (p && p.slug) {
                  if (Array.isArray(p.slug)) routes.add(routePath + '/' + p.slug.join('/'));
                  else routes.add(routePath + '/' + String(p.slug));
                } else if (typeof p === 'string') {
                  routes.add(routePath + '/' + p);
                } else {
                  const parts = [];
                  if (p && typeof p === 'object') {
                    for (const v of Object.values(p)) {
                      if (Array.isArray(v)) parts.push(...v.map(String));
                      else parts.push(String(v));
                    }
                    if (parts.length) routes.add(routePath + '/' + parts.join('/'));
                  }
                }
              }
            }
          } else {
            // if static route (no dynamic params) include the routePath
            if (!dir.includes('[') && routePath.startsWith('/recordsranking')) routes.add(routePath);
          }
        } catch (e) {
          console.warn('Could not import', file, e.message || e);
          // Attempt to parse generateStaticParams patterns from source as a fallback
          try {
            const src = fs.readFileSync(file, 'utf8');
            const tabsMatch = src.match(/const\s+tabs\s*=\s*\[([\s\S]*?)\]/);
            const subMapMatch = src.match(/const\s+subTabsMap(?:\s*:\s*[^=]+)?\s*=\s*\{([\s\S]*?)\}/);
            const extractedParams = [];
            if (tabsMatch) {
              const inner = tabsMatch[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
              const tabs = inner.split(',').map(s => s.trim()).filter(Boolean).map(s => s.replace(/^['"]|['"]$/g, ''));
              tabs.forEach(t => extractedParams.push({ slug: [t] }));
            }
            if (subMapMatch) {
              const inner = subMapMatch[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
              const re = /([a-zA-Z0-9_\-]+)\s*:\s*\[([^\]]*)\]/g;
              let m;
              while ((m = re.exec(inner))) {
                const key = m[1].trim();
                const arr = m[2].split(',').map(s => s.trim()).filter(Boolean).map(s => s.replace(/^['"]|['"]$/g, ''));
                arr.forEach(s => extractedParams.push({ slug: [key, s] }));
              }
            }
            if (extractedParams.length) {
              for (const p of extractedParams) {
                if (p && p.slug) routes.add(routePath + '/' + p.slug.join('/'));
              }
            }
          } catch (pErr) {
            console.warn('Fallback parse failed for', file, pErr.message || pErr);
          }
        }
      }

      // If no explicit page files were found but there is a routePath (directory-based route), include it
      if (!imported && fs.existsSync(dir)) {
        if (!dir.includes('[') && routePath.startsWith('/recordsranking')) routes.add(routePath);
      }
    }

    // root /recordsranking if app/recordsranking/page exists
    const rootPossible = ['page.tsx','page.ts','page.js','page.jsx'].some(f => fs.existsSync(path.join(baseDir, f)));
    if (rootPossible) routes.add('/recordsranking');

    walk(baseDir);

    const urlList = Array.from(routes).sort();

    // remove any routes which reference parallel/modal segments (e.g., @modal)
    const filteredUrlList = urlList.filter(u => {
      if (u.split('/').some(seg => seg.startsWith('@'))) return false;
      const segments = u.split('/').filter(Boolean);
      for (let i = 0; i < segments.length; i++) {
        const dirPath = path.join(process.cwd(), 'app', ...segments.slice(0, i + 1));
        if (fs.existsSync(path.join(dirPath, '@modal'))) return false;
      }
      return true;
    });
    const removedCount = urlList.length - filteredUrlList.length;
    if (removedCount > 0) console.log('Filtered out', removedCount, 'modal/parallel routes from recordsranking sitemap');

    // build xml
    const siteBase = (process.env.SITE_URL || 'https://stats.tennismylife.org').replace(/\/$/, '');
    const xmlUrls = filteredUrlList.map(u => {
      const lastmodTag = globalMaxDate ? `    <lastmod>${globalMaxDate}</lastmod>\n` : '';
      return `  <url>\n    <loc>${siteBase}${u}</loc>\n${lastmodTag}    <changefreq>daily</changefreq>\n    <priority>1.00</priority>\n  </url>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlUrls}\n</urlset>`;

    const outDir = path.join(process.cwd(), 'public', 'sitemaps');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'sitemap-recordsranking.xml');
    fs.writeFileSync(outPath, xml, 'utf8');
    fs.writeFileSync(outPath + '.gz', zlib.gzipSync(Buffer.from(xml, 'utf8')));
    console.log('WROTE', outPath, 'entries=', filteredUrlList.length);

    // regenerate index
    const genIndex = require('./generate_sitemap_index');
    if (typeof genIndex === 'function') genIndex();
    else {
      require('child_process').execFileSync('node',[path.join(__dirname,'generate_sitemap_index.js')],{stdio:'inherit'});
    }
  } catch (err) {
    console.error('Error generating sitemap-recordsranking:', err);
    process.exit(1);
  }
}

main();
