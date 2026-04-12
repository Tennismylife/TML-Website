#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
      continue;
    }
    out[key] = next;
    i += 1;
  }
  return out;
}

function usage() {
  console.log([
    'Usage:',
    '  node scripts/sitemap/sync-robots-whitelist.js --sitemap <path> [--sitemaps <path1,path2,...>] [--site-root <url>] [--google-disallow <path>] [--output <path>]',
    '',
    'Example:',
    '  node scripts/sitemap/sync-robots-whitelist.js --sitemaps public/sitemaps/sitemap-ranking-players.xml,public/sitemaps/sitemap-player-surfaces-top100.xml --google-disallow /players/*/ranking',
  ].join('\n'));
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    usage();
    return;
  }

  const defaultSitemap = 'public/sitemaps/sitemap-ranking-players.xml';
  const sitemapRels = String(args.sitemaps || args.sitemap || defaultSitemap)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const siteRoot = String(args['site-root'] || 'https://stats.tennismylife.org').replace(/\/$/, '');
  const outputRel = String(args.output || 'public/robots.txt');
  const googleDisallow = args['google-disallow'] ? String(args['google-disallow']) : '';

  const outputPath = path.join(repoRoot, outputRel);

  const paths = [];
  for (const sitemapRel of sitemapRels) {
    const sitemapPath = path.join(repoRoot, sitemapRel);
    if (!fs.existsSync(sitemapPath)) {
      throw new Error(`Sitemap not found: ${sitemapPath}`);
    }

    const raw = fs.readFileSync(sitemapPath, 'utf8');
    const locRegex = new RegExp(`<loc>${escapeRegex(siteRoot)}([^<]+)</loc>`, 'g');
    let match;
    while ((match = locRegex.exec(raw)) !== null) {
      paths.push(match[1]);
    }
  }

  const uniquePaths = Array.from(new Set(paths)).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));

  if (uniquePaths.length === 0) {
    throw new Error(`No <loc> entries for ${siteRoot} found in provided sitemaps: ${sitemapRels.join(', ')}`);
  }

  const lines = [];
  lines.push('User-agent: Googlebot');
  lines.push('Disallow: /');
  if (googleDisallow) lines.push(`Disallow: ${googleDisallow}`);
  for (const p of uniquePaths) lines.push(`Allow: ${p}$`);

  lines.push('');
  lines.push('User-agent: *');
  lines.push('Allow: /');
  lines.push('Disallow: /api/');
  lines.push('Disallow: /players/*/matches');

  lines.push('');
  lines.push('# Sitemap');
  lines.push('Sitemap: https://stats.tennismylife.org/sitemap_index.xml');

  fs.writeFileSync(outputPath, lines.join('\n') + '\n', 'utf8');

  console.log(`WROTE ${outputRel} allow_count=${uniquePaths.length} sources=${sitemapRels.join(',')}`);
}

try {
  main();
} catch (err) {
  console.error(String(err && err.message ? err.message : err));
  process.exitCode = 1;
}
