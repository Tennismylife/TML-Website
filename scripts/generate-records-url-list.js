// Genera la lista completa di tutti gli URL /records/* indicizzati
// Regola policy corrente: filterCount <= 1 || isWhitelisted

const fs = require('fs');
const path = require('path');

// ─── Valori possibili per ogni filtro ────────────────────────────────────────
const LEVELS   = ['G','M','F','A','250','500','D'];
const SURFACES = ['Hard','Clay','Grass','Carpet'];
const ROUNDS   = ['R128','R64','R32','R16','QF','SF','F'];
const BEST_OFS = ['1','3','5'];

// ─── Tutti i path base (slug senza query) ────────────────────────────────────
const BASE_PATHS = [
  '/records',
  '/records/wins',
  '/records/played',
  '/records/count',
  '/records/titles',
  '/records/entries',
  '/records/percentage',
  '/records/ages',
  '/records/ages/oldest',
  '/records/ages/youngest',
  '/records/ages/oldest-winners',
  '/records/ages/youngest-winners',
  '/records/timespan',
  '/records/timespan/entries',
  '/records/timespan/titles',
  '/records/timespan/rounds',
  '/records/roundsonentries',
  '/records/roundsonentries/titles',
  '/records/roundsonentries/round',
  '/records/same',
  '/records/same/wins',
  '/records/same/played',
  '/records/same/entries',
  '/records/same/titles',
  '/records/same/round',
  '/records/seasons',
  '/records/seasons/wins',
  '/records/seasons/played',
  '/records/most-tournament-appearances-single-season',
  '/records/seasons/titles',
  '/records/seasons/round',
  '/records/seasons/percentage',
  '/records/atage',
  '/records/atage/wins',
  '/records/atage/played',
  '/records/atage/entries',
  '/records/atage/titles',
  '/records/atage/slams',
  '/records/atage/round',
  '/records/ageofnth',
  '/records/ageofnth/wins',
  '/records/ageofnth/played',
  '/records/ageofnth/entries',
  '/records/ageofnth/titles',
  '/records/ageofnth/slams',
  '/records/ageofnth/round',
  '/records/neededto',
  '/records/neededto/titles',
  '/records/counterseasons',
  '/records/counterseasons/round',
  '/records/counterseasons/wins',
  '/records/counterseasons/titles',
  '/records/h2h',
  '/records/h2h/count',
  '/records/streak',
  '/records/streak/wins',
  '/records/streak/round',
];

// ─── Whitelist con 2 filtri (non coperti dalla regola 1-filtro) ──────────────
// (ordine canonical: level → surface → round)
const WHITELIST_2_FILTERS = [
  '/records/count?level=M&round=QF',
  '/records/wins?level=M&round=QF',
  '/records/wins?level=G&round=F',
  '/records/wins?level=G&round=SF',
  '/records/count?level=G&round=QF',
  '/records/wins?level=G&round=QF',
  '/records/wins?level=M&round=F',
  '/records/count?level=G&round=SF',
  '/records/count?level=G&round=F',
  '/records/titles?level=G&surface=Clay',
  '/records/titles?level=G&surface=Grass',
  '/records/titles?level=G&surface=Hard',
  '/records/wins?level=G&surface=Clay',
  '/records/wins?level=G&surface=Grass',
  '/records/wins?level=G&surface=Hard',
  '/records/percentage?level=G&surface=Clay',
  '/records/percentage?level=G&surface=Grass',
  '/records/count?level=M&round=F',
];

// ─── Build output rows ────────────────────────────────────────────────────────
const rows = [];

// TIER 1 — 0 filtri (base paths)
for (const p of BASE_PATHS) {
  rows.push({ url: p, tipo: 'base', filtri: 0, index: true, in_sitemap: true });
}

// TIER 2 — 1 filtro: level
for (const p of BASE_PATHS) {
  for (const v of LEVELS) {
    rows.push({ url: `${p}?level=${v}`, tipo: '1-filtro', filtri: 1, index: true, in_sitemap: false });
  }
}

// TIER 2 — 1 filtro: surface
for (const p of BASE_PATHS) {
  for (const v of SURFACES) {
    rows.push({ url: `${p}?surface=${v}`, tipo: '1-filtro', filtri: 1, index: true, in_sitemap: false });
  }
}

// TIER 2 — 1 filtro: round
for (const p of BASE_PATHS) {
  for (const v of ROUNDS) {
    rows.push({ url: `${p}?round=${v}`, tipo: '1-filtro', filtri: 1, index: true, in_sitemap: false });
  }
}

// TIER 2 — 1 filtro: bestOf
for (const p of BASE_PATHS) {
  for (const v of BEST_OFS) {
    rows.push({ url: `${p}?bestOf=${v}`, tipo: '1-filtro', filtri: 1, index: true, in_sitemap: false });
  }
}

// TIER 3 — whitelist con >= 2 filtri (extra rispetto al tier 2)
// controlla che non siano già presenti come 1-filtro
const existingSet = new Set(rows.map(r => r.url));
for (const url of WHITELIST_2_FILTERS) {
  if (!existingSet.has(url)) {
    rows.push({ url, tipo: 'whitelist-2f', filtri: 2, index: true, in_sitemap: true });
  }
}

// Marca in_sitemap=true le entries whitelist con 1 filtro
const WHITELIST_1_FILTER = new Set([
  '/records/ages/oldest-winners?level=F',
  '/records/played?level=M',
  '/records/played?level=F',
  '/records/played?round=F',
  '/records/ages/youngest-winners?level=M',
  '/records/titles?level=G',
  '/records/wins?level=G',
  '/records/played?level=G',
  '/records/ages/youngest-winners?level=G',
  '/records/ages/oldest-winners?level=G',
  '/records/titles?level=M',
  '/records/wins?level=M',
  '/records/titles?level=F',
  '/records/wins?surface=Clay',
  '/records/wins?surface=Grass',
  '/records/wins?surface=Hard',
  '/records/titles?surface=Clay',
  '/records/titles?surface=Grass',
  '/records/streak/wins?surface=Clay',
  '/records/streak/wins?surface=Grass',
  '/records/ages/youngest-winners?surface=Clay',
  '/records/ages/youngest-winners?surface=Grass',
  '/records/percentage?level=G',
  '/records/percentage?level=M',
  '/records/percentage?surface=Clay',
  '/records/percentage?surface=Grass',
  '/records/percentage?surface=Hard',
  '/records/titles?surface=Hard',
  '/records/entries?level=G',
  '/records/entries?level=M',
  '/records/wins?round=SF',
  '/records/wins?round=QF',
  '/records/streak/wins?surface=Hard',
  '/records/streak/wins?level=G',
  '/records/streak/wins?level=M',
  '/records/timespan/titles?level=G',
  '/records/seasons/titles?level=G',
  '/records/seasons/wins?level=G',
]);

for (const row of rows) {
  if (WHITELIST_1_FILTER.has(row.url)) {
    row.in_sitemap = true;
    row.tipo = 'whitelist-1f';
  }
}

// ─── CSV output ───────────────────────────────────────────────────────────────
const header = 'url,tipo,filtri,index,in_sitemap';
const lines = rows.map(r =>
  `${r.url},${r.tipo},${r.filtri},${r.index},${r.in_sitemap}`
);
const csv = [header, ...lines].join('\n');

const outPath = path.join(__dirname, '..', 'docs', 'records-indexed-urls-full.csv');
fs.writeFileSync(outPath, csv, 'utf8');

console.log(`Scritto: ${outPath}`);
console.log(`Totale righe: ${rows.length}`);
console.log(`  - base (0 filtri):         ${rows.filter(r=>r.tipo==='base').length}`);
console.log(`  - 1-filtro:                ${rows.filter(r=>r.tipo==='1-filtro').length}`);
console.log(`  - whitelist-1f (sitemap):  ${rows.filter(r=>r.tipo==='whitelist-1f').length}`);
console.log(`  - whitelist-2f (sitemap):  ${rows.filter(r=>r.tipo==='whitelist-2f').length}`);
