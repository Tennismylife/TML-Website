const fs = require('fs');
const path = require('path');
const https = require('https');
const { JSDOM } = require('jsdom');

const DATA_DIR = path.join(process.cwd(), 'data');
const ATP_HEADER = [
  'tourney_id',
  'tourney_name',
  'surface',
  'draw_size',
  'tourney_level',
  'indoor',
  'tourney_date',
  'match_num',
  'winner_id',
  'winner_seed',
  'winner_entry',
  'winner_name',
  'winner_hand',
  'winner_ht',
  'winner_ioc',
  'winner_age',
  'winner_rank',
  'winner_rank_points',
  'loser_id',
  'loser_seed',
  'loser_entry',
  'loser_name',
  'loser_hand',
  'loser_ht',
  'loser_ioc',
  'loser_age',
  'loser_rank',
  'loser_rank_points',
  'score',
  'best_of',
  'round',
  'minutes',
  'w_ace',
  'w_df',
  'w_svpt',
  'w_1stIn',
  'w_1stWon',
  'w_2ndWon',
  'w_SvGms',
  'w_bpSaved',
  'w_bpFaced',
  'l_ace',
  'l_df',
  'l_svpt',
  'l_1stIn',
  'l_1stWon',
  'l_2ndWon',
  'l_SvGms',
  'l_bpSaved',
  'l_bpFaced',
];

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function splitPair(value) {
  const parts = String(value || '').split(' vs. ');
  if (parts.length !== 2) return [String(value || '').trim(), ''];
  return [parts[0].trim(), parts[1].trim()];
}

function parseIntOrNull(value) {
  const n = parseInt(String(value || '').replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function normalizeTourneyDate(value) {
  const text = String(value || '').trim();
  const compact = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (compact) return `${compact[1]}${compact[2]}${compact[3]}`;
  return text;
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { rejectUnauthorized: false, headers: { 'user-agent': 'Mozilla/5.0' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

function convertRowToAtpSignature(oldHeader, row) {
  const cols = row.split(',');
  const old = Object.fromEntries(oldHeader.map((h, i) => [h, cols[i] ?? '']));
  return ATP_HEADER.map((h) => {
    if (h === 'indoor') return old.indoor ?? '';
    if (h === 'tourney_date') return normalizeTourneyDate(old[h] ?? '');
    return old[h] ?? '';
  }).join(',');
}

async function convertCsvFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return false;

  const lines = raw.split(/\r?\n/);
  const header = lines[0].split(',');
  if (header.join(',') === ATP_HEADER.join(',')) {
    return false;
  }

  const converted = [ATP_HEADER.join(',')];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    converted.push(convertRowToAtpSignature(header, line));
  }

  fs.writeFileSync(filePath, converted.join('\r\n') + '\r\n', 'utf8');
  return true;
}

async function normalizeDateFormat(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return false;

  const lines = raw.split(/\r?\n/);
  const header = lines[0].split(',');
  const dateIndex = header.indexOf('tourney_date');
  if (dateIndex === -1) return false;

  let changed = false;
  const rebuilt = [lines[0]];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split(',');
    const normalized = normalizeTourneyDate(cols[dateIndex]);
    if (normalized !== cols[dateIndex]) {
      cols[dateIndex] = normalized;
      changed = true;
    }
    rebuilt.push(cols.join(','));
  }

  if (changed) {
    fs.writeFileSync(filePath, rebuilt.join('\r\n') + '\r\n', 'utf8');
  }

  return changed;
}

async function renumberMatchNums(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return false;

  const lines = raw.split(/\r?\n/);
  const header = lines[0].split(',');
  const tourneyIdIndex = header.indexOf('tourney_id');
  const matchNumIndex = header.indexOf('match_num');
  if (tourneyIdIndex === -1 || matchNumIndex === -1) return false;

  const counters = new Map();
  let changed = false;
  const rebuilt = [lines[0]];

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split(',');
    const tourneyId = cols[tourneyIdIndex] || '';
    const nextNum = (counters.get(tourneyId) || 0) + 1;
    counters.set(tourneyId, nextNum);
    if (String(nextNum) !== cols[matchNumIndex]) {
      cols[matchNumIndex] = String(nextNum);
      changed = true;
    }
    rebuilt.push(cols.join(','));
  }

  if (changed) {
    fs.writeFileSync(filePath, rebuilt.join('\r\n') + '\r\n', 'utf8');
  }

  return changed;
}

function extractStatsFromMatchPage(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const serviceBlock = [...doc.querySelectorAll('.mc-stats__tab-content.js-match-stats .compare-stats-block')]
    .find((block) => block.querySelector('.compare-stats-block__header')?.textContent?.trim() === 'Service');

  if (!serviceBlock) return null;

  const rows = [...serviceBlock.querySelectorAll('.compare-stats-block__row')];
  const map = new Map();
  for (const row of rows) {
    const label = row.querySelector('.compare-stats-block__label')?.textContent?.trim();
    if (!label) continue;
    const stats = [...row.querySelectorAll('.compare-stats-block__stat')].map((n) => n.textContent.trim());
    const details = [...row.querySelectorAll('.compare-stats-block__detail')].map((n) => n.textContent.trim());
    map.set(label, { stats, details });
  }

  const get = (label) => map.get(label) || null;
  const aces = get('Aces')?.stats ?? [];
  const dfs = get('Double Faults')?.stats ?? [];
  const firstServe = get('1st Serve')?.details ?? [];
  const firstWon = get('1st Serve Points Won')?.details ?? [];
  const secondWon = get('2nd Serve Points Won')?.details ?? [];
  const bpSaved = get('Break Points Saved')?.details ?? [];
  const svGms = get('Service Games Played')?.stats ?? [];

  if (aces.length < 2 || dfs.length < 2 || firstServe.length < 2 || firstWon.length < 2 || secondWon.length < 2 || bpSaved.length < 2 || svGms.length < 2) {
    return null;
  }

  const wSvpt = parseIntOrNull(firstServe[0].split('/')[1]);
  const lSvpt = parseIntOrNull(firstServe[1].split('/')[1]);
  const w1stIn = parseIntOrNull(firstServe[0].split('/')[0]);
  const l1stIn = parseIntOrNull(firstServe[1].split('/')[0]);
  const w1stWon = parseIntOrNull(firstWon[0].split('/')[0]);
  const l1stWon = parseIntOrNull(firstWon[1].split('/')[0]);
  const w2ndWon = parseIntOrNull(secondWon[0].split('/')[0]);
  const l2ndWon = parseIntOrNull(secondWon[1].split('/')[0]);
  const wBpSaved = parseIntOrNull(bpSaved[0].split('/')[0]);
  const wBpFaced = parseIntOrNull(bpSaved[0].split('/')[1]);
  const lBpSaved = parseIntOrNull(bpSaved[1].split('/')[0]);
  const lBpFaced = parseIntOrNull(bpSaved[1].split('/')[1]);

  return {
    w_ace: parseIntOrNull(aces[0]),
    w_df: parseIntOrNull(dfs[0]),
    w_svpt: wSvpt,
    w_1stIn: w1stIn,
    w_1stWon: w1stWon,
    w_2ndWon: w2ndWon,
    w_SvGms: parseIntOrNull(svGms[0]),
    w_bpSaved: wBpSaved,
    w_bpFaced: wBpFaced,
    l_ace: parseIntOrNull(aces[1]),
    l_df: parseIntOrNull(dfs[1]),
    l_svpt: lSvpt,
    l_1stIn: l1stIn,
    l_1stWon: l1stWon,
    l_2ndWon: l2ndWon,
    l_SvGms: parseIntOrNull(svGms[1]),
    l_bpSaved: lBpSaved,
    l_bpFaced: lBpFaced,
  };
}

function extractPlayersFromMatchPage(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const container = [...doc.querySelectorAll('[data-global-params]')]
    .find((el) => (el.getAttribute('data-global-params') || '').includes('match_players'));
  if (!container) return null;

  try {
    const raw = container.getAttribute('data-global-params') || '{}';
    const parsed = JSON.parse(raw);
    const players = String(parsed.match_players || '').replace(/<[^>]+>/g, '');
    const parts = players.split(/\s+vs\.?\s+/i).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 2) return parts;
  } catch {
    // ignore
  }

  return null;
}

async function updateNottingham2026(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return false;

  const lines = raw.split(/\r?\n/);
  const header = lines[0].split(',');
  const headerIndex = Object.fromEntries(header.map((h, i) => [h, i]));
  const rows = lines.slice(1).filter((line) => /(^|,)Nottingham(,|$)/.test(line));
  if (!rows.length) return false;

  const scoreUrl = 'https://www.wtatennis.com/tournaments/1080/nottingham/2026/scores';
  const scoreHtml = await fetchText(scoreUrl);
  const linkRe = /<a[^>]+href="(\/tournaments\/nottingham\/scores\/LS\d+)"[^>]+title="([^"]+)"/g;
  const links = [...scoreHtml.matchAll(linkRe)].map((m) => ({ href: m[1], title: m[2] }));

  const rowByKey = new Map();
  for (const line of rows) {
    const cols = line.split(',');
    const round = cols[headerIndex.round];
    const key = `${round}|${[normalizeName(cols[headerIndex.winner_name]), normalizeName(cols[headerIndex.loser_name])].sort().join('|')}`;
    rowByKey.set(key, cols);
  }

  let updated = 0;
  for (const link of links) {
    const roundText = link.title.split(' | ')[1] || '';
    const roundMap = [
      ['Round of 128', 'R128'],
      ['Round of 64', 'R64'],
      ['Round of 32', 'R32'],
      ['Round of 16', 'R16'],
      ['Quarterfinals', 'QF'],
      ['Semifinals', 'SF'],
      ['Final', 'F'],
    ];
    const round = (roundMap.find(([label]) => roundText.includes(label)) || [null, null])[1];

    const pageUrl = `https://www.wtatennis.com${link.href}`;
    const html = await fetchText(pageUrl);
    const players = extractPlayersFromMatchPage(html);
    if (!round || !players) continue;
    const key = `${round}|${[normalizeName(players[0]), normalizeName(players[1])].sort().join('|')}`;
    const cols = rowByKey.get(key);
    if (!cols) continue;
    const stats = extractStatsFromMatchPage(html);
    if (!stats) continue;

    for (const [k, v] of Object.entries(stats)) {
      cols[headerIndex[k]] = v == null ? '' : String(v);
    }
    updated += 1;
  }

  const rebuilt = [header.join(',')];
  for (const line of lines.slice(1)) {
    if (/(^|,)Nottingham(,|$)/.test(line)) {
      const cols = line.split(',');
      const key = `${cols[headerIndex.round]}|${[normalizeName(cols[headerIndex.winner_name]), normalizeName(cols[headerIndex.loser_name])].sort().join('|')}`;
      const updatedCols = rowByKey.get(key) || cols;
      rebuilt.push(updatedCols.join(','));
    } else {
      rebuilt.push(line);
    }
  }

  fs.writeFileSync(filePath, rebuilt.join('\r\n') + '\r\n', 'utf8');
  return updated > 0;
}

async function main() {
  const files = fs.readdirSync(DATA_DIR);
  const wtaFiles = files.filter((f) => /^wta_ongoing_tourneys\.csv$/i.test(f) || /_wta\.csv$/i.test(f));

  let convertedCount = 0;
  for (const file of wtaFiles) {
    const fullPath = path.join(DATA_DIR, file);
    if (await convertCsvFile(fullPath)) convertedCount += 1;
    await normalizeDateFormat(fullPath);
    await renumberMatchNums(fullPath);
  }

  const nottinghamFile = path.join(DATA_DIR, '2026_wta.csv');
  const nottinghamUpdated = await updateNottingham2026(nottinghamFile);

  console.log(`Converted ${convertedCount} WTA CSV files to ATP signature.`);
  console.log(`Nottingham 2026 stats updated: ${nottinghamUpdated ? 'yes' : 'no'}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
