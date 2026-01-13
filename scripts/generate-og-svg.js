const fs = require('fs');
const https = require('https');
const http = require('http');

async function fetchJson(url) {
  const lib = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    lib.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function humanizeName(name) {
  return String(name || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

async function main() {
  const id = process.argv[2] || 'australian-open';
  const tab = process.argv[3] || 'count';
  const base = 'http://localhost:3000';
  let header = null;
  try {
    header = await fetchJson(`${base}/api/tournaments/${encodeURIComponent(id)}/header`);
  } catch (e) {
    console.warn('Failed to fetch tournament header, falling back to id');
  }
  const name = header?.name ? (Array.isArray(header.name) ? header.name.slice(-1)[0] : header.name) : id;
  const human = humanizeName(name);
  const surfaces = Array.isArray(header?.surfaces) && header.surfaces.length ? header.surfaces.join(', ') : 'Unknown Surface';
  const year = (Array.isArray(header?.editions) && header.editions[0]) ? String(header.editions[0]) : new Date().getFullYear().toString();

  const tabLabels = {
    count: 'Counts',
    rounds: 'Rounds',
    ages: 'Ages',
    percentage: 'Percentages',
    timespan: 'Timespans',
    'rounds-on-entries': 'Rounds on Entries',
    least: 'Least',
    'average-age': 'Average Age',
  };
  const typeLabel = tabLabels[tab] || humanizeName(tab || 'Records');

  const styles = {
    default: { icon: '🏆', from: '#C6FF00', to: '#FFEB3B' },
    ages: { icon: '🎂', from: '#4FC3F7', to: '#0288D1' },
    percentage: { icon: '📊', from: '#4DD0E1', to: '#00838F' },
    rounds: { icon: '🔁', from: '#B39DDB', to: '#7E57C2' },
  };
  const s = styles[tab] || styles.default;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#2ecc71" stop-opacity="1"/>
        <stop offset="100%" stop-color="#2ecc71" stop-opacity="1"/>
      </linearGradient>
      <linearGradient id="t" x1="0" x2="1">
        <stop offset="0%" stop-color="${s.from}"/>
        <stop offset="100%" stop-color="${s.to}"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)" />
    <!-- decorative stripe -->
    <rect x="-120" y="40" width="600" height="260" rx="8" fill="url(#t)" opacity="0.10" transform="rotate(-22 180 170)" />
    <g transform="translate(80,150)">
      <rect width="72" height="72" rx="12" fill="rgba(255,255,255,0.06)" />
      <text x="100" y="44" font-size="56" font-family="Arial, Helvetica, sans-serif" fill="#fff" font-weight="900">${escapeXml(human)}</text>
    </g>
    <text x="600" y="360" font-size="48" font-family="Arial, Helvetica, sans-serif" fill="url(#t)" font-weight="900" text-anchor="middle">${escapeXml(typeLabel)}</text>
    <!-- trophy/icon -->
    <text x="1060" y="160" font-size="72" text-anchor="end">${s.icon}</text>
    <text x="1100" y="600" text-anchor="end" font-size="14" font-family="Arial, Helvetica, sans-serif" fill="rgba(255,255,255,0.85)">TennisMyLife</text>
  </svg>`;

  fs.writeFileSync('preview.svg', svg);
  console.log('Wrote preview.svg');
}

function escapeXml(s) {
  return String(s).replace(/[<>&"']/g, function (c) {
    return ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c];
  });
}

main().catch((e) => { console.error(e); process.exit(1); });