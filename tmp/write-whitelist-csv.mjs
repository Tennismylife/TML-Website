import fs from 'fs';

const text = fs.readFileSync('lib/seo/records-policy.ts', 'utf8');
const lines = text.split(/\r?\n/);

function normalizeFilterValue(key, value) {
  switch (key) {
    case 'level': return value.toUpperCase();
    case 'surface': return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    case 'round': return value.toUpperCase();
    case 'subtab': return value.toLowerCase();
    default: return value;
  }
}

function buildCanonicalQueryString(filters) {
  const parts = [];
  const push = (key, values) => {
    const sorted = [...new Set(values)].sort();
    sorted.forEach(v => parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`));
  };
  const order = ['level','surface','round','bestOf','subtab'];
  for (const key of order) {
    switch (key) {
      case 'level':
        if (filters.level?.length) push('level', filters.level.map(v => normalizeFilterValue('level', v)));
        break;
      case 'surface':
        if (filters.surface?.length) push('surface', filters.surface.map(v => normalizeFilterValue('surface', v)));
        break;
      case 'round':
        if (filters.round) parts.push(`round=${encodeURIComponent(normalizeFilterValue('round', filters.round))}`);
        break;
      case 'bestOf':
        if (filters.bestOf != null) parts.push(`bestOf=${encodeURIComponent(String(filters.bestOf))}`);
        break;
      case 'subtab':
        if (filters.subtab) parts.push(`subtab=${encodeURIComponent(normalizeFilterValue('subtab', filters.subtab))}`);
        break;
    }
  }
  return parts.join('&');
}

function titleToCanonicalPath(title) {
  const trimmed = title.split('–')[0].trim();
  const normalized = trimmed
    .replace(/\bmatch\s+wins\b/gi, 'wins')
    .replace(/\bmatch\s+win\b/gi, 'win');
  const slug = normalized
    .toLowerCase()
    .replace(/–/g, '-')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `/records/${slug}`;
}

function buildWhitelistCanonicalPath(entry) {
  if (entry.canonicalPath) return entry.canonicalPath;
  if (entry.title) return titleToCanonicalPath(entry.title);
  const qs = buildCanonicalQueryString(entry.filters);
  const path = `/records/${entry.slug.map(encodeURIComponent).join('/')}`;
  return qs ? `${path}?${qs}` : path;
}

let inWhitelist = false;
const entries = [];
for (const rawLine of lines) {
  const line = rawLine.trim();
  if (line.startsWith('const WHITELIST_RAW')) {
    inWhitelist = true;
    continue;
  }
  if (!inWhitelist) continue;
  if (line === '];') break;
  if (!line.startsWith('{')) continue;

  const slugMatch = line.match(/slug:\s*\[([^\]]*)\]/);
  const filtersMatch = line.match(/filters:\s*\{([^}]*)\}/);
  const titleMatch = line.match(/title:\s*'([^']*)'/);
  const canonicalPathMatch = line.match(/canonicalPath:\s*'([^']*)'/);

  const slug = slugMatch ? slugMatch[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')) : [];
  const filters = {};
  if (filtersMatch) {
    const filterText = filtersMatch[1];
    const levelMatch = filterText.match(/level:\s*\[([^\]]*)\]/);
    if (levelMatch) filters.level = levelMatch[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
    const surfaceMatch = filterText.match(/surface:\s*\[([^\]]*)\]/);
    if (surfaceMatch) filters.surface = surfaceMatch[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
    const roundMatch = filterText.match(/round:\s*'([^']*)'/);
    if (roundMatch) filters.round = roundMatch[1];
    const bestOfMatch = filterText.match(/bestOf:\s*(\d+)/);
    if (bestOfMatch) filters.bestOf = Number(bestOfMatch[1]);
    const subtabMatch = filterText.match(/subtab:\s*'([^']*)'/);
    if (subtabMatch) filters.subtab = subtabMatch[1];
  }
  const entry = {
    slug,
    filters,
    title: titleMatch?.[1] || '',
    canonicalPath: canonicalPathMatch?.[1] || undefined,
  };
  entries.push(entry);
}

const rows = [['url','title']];
for (const entry of entries) {
  const path = buildWhitelistCanonicalPath(entry);
  const url = `https://localhost:3000${path}`;
  rows.push([url, entry.title]);
}
const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
fs.writeFileSync('tmp/records-whitelist.csv', csv, 'utf8');
console.log(`Wrote ${entries.length} entries to tmp/records-whitelist.csv`);
