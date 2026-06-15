import fs from 'fs';

const source = fs.readFileSync('lib/seo/records-policy.ts', 'utf8');
const start = source.indexOf('const WHITELIST_RAW: WhitelistEntry[] = [');
const end = source.indexOf('];', start);
if (start === -1 || end === -1) {
  throw new Error('WHITELIST_RAW block not found');
}
const block = source.slice(start, end + 2);
const entries = [];
let depth = 0;
let current = null;
for (const line of block.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (trimmed.startsWith('const WHITELIST_RAW')) continue;
  if (trimmed.startsWith('//')) continue;
  if (trimmed === '' ) continue;
  if (trimmed.startsWith('{')) {
    depth = 1;
    current = trimmed;
    continue;
  }
  if (current !== null) {
    current += ' ' + trimmed;
    if (trimmed.includes('}')) {
      const objText = current;
      current = null;
      depth = 0;
      const slugMatch = objText.match(/slug:\s*\[([^\]]*)\]/);
      const filtersMatch = objText.match(/filters:\s*\{([^}]*)\}/);
      const titleMatch = objText.match(/title:\s*'([^']*)'/);
      const canonicalPathMatch = objText.match(/canonicalPath:\s*'([^']*)'/);
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
      entries.push({ slug, filters, title: titleMatch?.[1] || '', canonicalPath: canonicalPathMatch?.[1] });
    }
  }
}

function normalizeFilterValue(key, value) {
  switch (key) {
    case 'level': return value.toUpperCase();
    case 'surface': return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    case 'round': return value.toUpperCase();
    case 'subtab': return value.toLowerCase();
    default: return value;
  }
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

function buildCanonicalQueryString(filters) {
  const parts = [];
  const push = (key, values) => {
    const sorted = [...new Set(values)].sort();
    sorted.forEach(v => parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`));
  };
  if (filters.level?.length) push('level', filters.level.map(v => normalizeFilterValue('level', v)));
  if (filters.surface?.length) push('surface', filters.surface.map(v => normalizeFilterValue('surface', v)));
  if (filters.round) parts.push(`round=${encodeURIComponent(normalizeFilterValue('round', filters.round))}`);
  if (filters.bestOf != null) parts.push(`bestOf=${encodeURIComponent(String(filters.bestOf))}`);
  if (filters.subtab) parts.push(`subtab=${encodeURIComponent(normalizeFilterValue('subtab', filters.subtab))}`);
  return parts.join('&');
}

function buildWhitelistCanonicalPath(entry) {
  if (entry.canonicalPath) return entry.canonicalPath;
  if (entry.title) return titleToCanonicalPath(entry.title);
  const qs = buildCanonicalQueryString(entry.filters);
  const path = `/records/${entry.slug.map(encodeURIComponent).join('/')}`;
  return qs ? `${path}?${qs}` : path;
}

const rows = [['url','title']];
for (const entry of entries) {
  const url = `https://localhost:3000${buildWhitelistCanonicalPath(entry)}`;
  rows.push([url, entry.title]);
}
fs.writeFileSync('tmp/records-whitelist-generated.csv', rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n'));
console.log(`Wrote ${entries.length} generated whitelist entries to tmp/records-whitelist-generated.csv`);
