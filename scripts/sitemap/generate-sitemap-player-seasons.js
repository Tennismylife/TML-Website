#!/usr/bin/env node
const path = require('path');
const fs = require('fs');

async function generatePlayerSeasonsXml() {
  console.log('[sitemap-player-seasons] start');
  const jiti = require('jiti')(__filename);
  const { prisma } = jiti(path.join(process.cwd(), 'lib', 'prisma.ts'));
  if (!prisma) throw new Error('prisma client not found');

  const base = process.env.SITE_URL || 'https://stats.tennismylife.org';

  // --- User-provided whitelist and priorities ---
  // Name,Priorità
  const whitelist = [
    ['Carlos Alcaraz','Altissima'],
    ['Jannik Sinner','Altissima'],
    ['Novak Djoković','Altissima'],
    ['Roger Federer','Altissima'],
    ['Rafael Nadal','Altissima'],
    ['Alexander Zverev','Alta'],
    ['Lorenzo Musetti','Alta'],
    ['Taylor Fritz','Medio-alta'],
    ['Alex de Minaur','Medio-alta'],
    ['Félix Auger-Aliassime','Medio-alta'],
    ['Ben Shelton','Medio-alta'],
    ['Alexander Bublik','Medio-alta'],
    ['Daniil Medvedev','Medio-alta'],
    ['Jack Draper','Medio-alta'],
    ['Casper Ruud','Medio-alta'],
    ['Andrey Rublev','Medio-alta'],
    ['Holger Rune','Medio-alta'],
    ['Stefanos Tsitsipas','Medio-alta'],
    ['Juan Martín del Potro','Medio-alta'],
    ['Marat Safin','Medio-alta'],
    ['Juan Carlos Ferrero','Media'],
    ['Mats Wilander','Media'],
    ['Ken Rosewall','Media'],
    ['Alejandro Davidovich Fokina','Media'],
    ['Jakub Menšík','Media'],
    ['Karen Khachanov','Media'],
    ['Francisco Cerúndolo','Media'],
    ['Flavio Cobolli','Media'],
    ['Learner Tien','Media'],
    ['Frances Tiafoe','Media'],
    ['Lleyton Hewitt','Media'],
    ['Stan Wawrinka','Media'],
    ['Guillermo Vilas','Media'],
    ['Goran Ivanisevic','Media'],
    ['Andy Roddick','Media'],
    ['Ilie Nastase','Media'],
    ['Ivan Lendl','Media'],
    ['Pete Sampras','Media'],
    ['Björn Borg','Media'],
    ['Andre Agassi','Media'],
    ['John McEnroe','Media'],
    ['Jimmy Connors','Media'],
    ['Rod Laver','Media'],
    ['Andy Murray','Media'],
  ];

  function slugifyName(name) {
    if (!name) return '';
    return String(name)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // strip diacritics
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  const labelToPriority = { 'Altissima': '1.00', 'Alta': '0.90', 'Medio-alta': '0.75', 'Media': '0.50' };
  const allowedSlugs = Object.create(null);
  for (const [name, label] of whitelist) {
    const s = slugifyName(name);
    allowedSlugs[s] = { label, priority: labelToPriority[label] || '0.50' };
  }

  console.log('[sitemap-player-seasons] allowed slugs:', Object.keys(allowedSlugs));

  // Fetch player slugs
  console.log('[sitemap-player-seasons] loading players');
  const players = await prisma.player.findMany({ select: { id: true, slug: true } });
  const idToSlug = {};
  for (const p of players) if (p.id && p.slug) idToSlug[String(p.id)] = String(p.slug).toLowerCase();

  // Two groupBy queries: winner/year and loser/year to collect counts per player-year
  console.log('[sitemap-player-seasons] groupBy winner/year');
  const wins = await prisma.match.groupBy({ by: ['winner_id', 'year'], where: { year: { not: null } }, _count: { _all: true }, _max: { tourney_date: true } });
  console.log('[sitemap-player-seasons] groupBy loser/year');
  const losses = await prisma.match.groupBy({ by: ['loser_id', 'year'], where: { year: { not: null } }, _count: { _all: true }, _max: { tourney_date: true } });
  // Merge into map: { playerId: { total: number, years: { [year]: { count, lastmod } } } }
  const playersMap = Object.create(null);

  function addRow(playerId, year, count, lastmod) {
    if (!playerId || !year) return;
    const id = String(playerId);
    playersMap[id] = playersMap[id] || { total: 0, years: {} };
    playersMap[id].years[year] = playersMap[id].years[year] || { count: 0, lastmod: undefined };
    playersMap[id].years[year].count += count || 0;
    playersMap[id].total += count || 0;
    if (lastmod) {
      const cur = playersMap[id].years[year].lastmod;
      const cand = new Date(lastmod).toISOString().split('T')[0];
      if (!cur || new Date(cand) > new Date(cur)) playersMap[id].years[year].lastmod = cand;
    }
  }

  for (const w of wins) addRow(w.winner_id, w.year, w._count?._all || 0, w._max?.tourney_date);
  for (const l of losses) addRow(l.loser_id, l.year, l._count?._all || 0, l._max?.tourney_date);

  // Filter players with at least MIN_MATCHES played
  const MIN_MATCHES = Number(process.env.SITEMAP_MIN_MATCHES || 100);

  const seasonEntries = [];
  for (const [pid, info] of Object.entries(playersMap)) {
    const slug = idToSlug[pid];
    if (!slug) continue;
    if (slug.startsWith('unknown-') || slug.startsWith('qualifier-')) continue;

    // Whitelist filter: only include players explicitly provided by user
    if (!allowedSlugs[slug]) continue;

    for (const [yearStr, yinfo] of Object.entries(info.years)) {
      const year = Number(yearStr);
      if (!year || Number.isNaN(year)) continue;
      // include player total so we can use it for info but priority comes from the whitelist label
      // Force lastmod to today's date (YYYY-MM-DD)
      const today = new Date().toISOString().split('T')[0];
      seasonEntries.push({ path: `/players/${slug}/season/${year}`, lastmod: today, popularity: yinfo.count, playerTotal: info.total, priorityLabel: allowedSlugs[slug].label, priority: allowedSlugs[slug].priority });
    }
  }

  console.log('[sitemap-player-seasons] season entries count (after whitelist filter):', seasonEntries.length);

  // If a whitelist priority was provided for the entry, use it; otherwise fall back to computed one.
  function computePriority(total) {
    if (!total || isNaN(total)) return '0.40';
    if (total >= 5000) return '1.00';
    if (total >= 2000) return '0.90';
    if (total >= 1000) return '0.75';
    if (total >= 500) return '0.60';
    if (total >= 100) return '0.50';
    return '0.40';
  }

  const urls = seasonEntries
    .map(e => {
      const lastmodTag = e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>\n` : '';
      const priority = e.priority || computePriority(e.playerTotal);
      const changefreq = (priority === '1.00') ? 'daily' : 'monthly';
      return `  <url>\n    <loc>${base}${e.path}</loc>\n${lastmodTag}    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
  console.log('[sitemap-player-seasons] done');
  return xml;
}

async function main() {
  try {
    const xml = await generatePlayerSeasonsXml();
    // Write to project root public directory
    const outPath = path.join(process.cwd(), 'public', 'sitemap-player-seasons.xml');
    fs.writeFileSync(outPath, xml, 'utf8');
    console.log('Player seasons sitemap written to', outPath);
  } catch (e) {
    console.error('Failed to generate player seasons sitemap:', e);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generatePlayerSeasonsXml };
