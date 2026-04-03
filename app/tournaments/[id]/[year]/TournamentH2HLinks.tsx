import fs from 'fs';
import path from 'path';
import { createH2HUrl } from '@/lib/utils';

interface Props {
  tournamentId: string;
  year: string;
}

const ROUND_LABELS: Record<string, string> = {
  R1: 'First Round',
  R2: 'Second Round',
  R3: 'Third Round',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  F: 'Final',
};

// Which QF quarter belongs to which SF half (Q1+Q2 → Top, Q3+Q4 → Bottom)
const QUARTER_TO_HALF: Record<string, string> = {
  'Quarter 01': 'Half 01',
  'Quarter 02': 'Half 01',
  'Quarter 03': 'Half 02',
  'Quarter 04': 'Half 02',
};

const QUARTER_DISPLAY: Record<string, string> = {
  'Quarter 01': 'Quarter 1',
  'Quarter 02': 'Quarter 2',
  'Quarter 03': 'Quarter 3',
  'Quarter 04': 'Quarter 4',
};

const HALF_DISPLAY: Record<string, string> = {
  'Half 01': 'Top Half',
  'Half 02': 'Bottom Half',
};

const QUARTER_ORDER = ['Quarter 01', 'Quarter 02', 'Quarter 03', 'Quarter 04'] as const;
const HALF_ORDER = ['Half 01', 'Half 02'] as const;

// Subtle accent colours per quarter (used for visual separation)
const QUARTER_COLORS: Record<string, string> = {
  'Quarter 01': '#1e3a8a35',
  'Quarter 02': '#14532d35',
  'Quarter 03': '#7c2d1235',
  'Quarter 04': '#4c1d9535',
};
const QUARTER_BORDER: Record<string, string> = {
  'Quarter 01': '#3b82f6',
  'Quarter 02': '#22c55e',
  'Quarter 03': '#f97316',
  'Quarter 04': '#a855f7',
};
const QUARTER_LABEL_COLOR: Record<string, string> = {
  'Quarter 01': '#93c5fd',
  'Quarter 02': '#86efac',
  'Quarter 03': '#fdba74',
  'Quarter 04': '#d8b4fe',
};

/** Detect whether a CSV uses the 5-column matrix format (round,match_id,section,player_1,player_2). */
function isMatrixFormat(firstLine: string): boolean {
  return /^round[,;]/i.test(firstLine) || firstLine.includes('match_id');
}

interface H2HStats {
  totalPairs: number;
  playerCount: number;
  rounds: string[];
  mostConnected: { player: string; count: number } | null;
}

function buildStats(
  pairs: Array<{ player1: string; player2: string }>,
  playerMap: Map<string, string[]>,
  rawLines: string[],
  matrixFmt: boolean,
): H2HStats {
  // Unique rounds (preserve natural order)
  const roundOrder = ['R1', 'R2', 'R3', 'QF', 'SF', 'F'];
  const roundSet = new Set<string>();
  if (matrixFmt) {
    for (const line of rawLines) {
      const parts = line.split(',');
      if (parts.length >= 1) {
        const r = parts[0].trim().toUpperCase();
        if (roundOrder.includes(r)) roundSet.add(r);
      }
    }
  }
  const rounds = roundOrder.filter((r) => roundSet.has(r));

  // Deduplicate pairs for counting
  const seen = new Set<string>();
  for (const { player1, player2 } of pairs) {
    const key = [player1, player2].sort().join('|||');
    seen.add(key);
  }

  // Most-connected player
  let mostConnected: { player: string; count: number } | null = null;
  for (const [player, opponents] of playerMap) {
    if (!mostConnected || opponents.length > mostConnected.count) {
      mostConnected = { player, count: opponents.length };
    }
  }

  return {
    totalPairs: seen.size,
    playerCount: playerMap.size,
    rounds,
    mostConnected,
  };
}

function parseH2HPairs(csvContent: string): {
  pairs: Array<{ player1: string; player2: string }>;
  rawLines: string[];
  matrixFmt: boolean;
} {
  const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { pairs: [], rawLines: lines, matrixFmt: false };
  const matrixFmt = isMatrixFormat(lines[0]);
  const pairs: Array<{ player1: string; player2: string }> = [];
  for (const line of lines) {
    if (matrixFmt) {
      // format: round,match_id,section,player_1,player_2
      const parts = line.split(',');
      if (parts.length < 5) continue;
      const p1 = parts[3].trim();
      const p2 = parts[4].trim();
      // skip header row and generic qualifier placeholders
      if (
        !p1 || !p2 ||
        p1.toLowerCase() === 'player_1' ||
        p1.toLowerCase() === 'qualifier' ||
        p2.toLowerCase() === 'qualifier'
      ) continue;
      pairs.push({ player1: p1, player2: p2 });
    } else {
      // legacy 2-column format: player1,player2
      const commaIdx = line.indexOf(',');
      if (commaIdx === -1) continue;
      const p1 = line.slice(0, commaIdx).trim();
      const p2 = line.slice(commaIdx + 1).trim();
      if (!p1 || !p2 || p1.toLowerCase() === 'player1') continue;
      pairs.push({ player1: p1, player2: p2 });
    }
  }
  return { pairs, rawLines: lines, matrixFmt };
}

/**
 * Resolve the CSV file path. Priority:
 * 1. Exact slug match: `{slugUnderscore}_{year}.csv`
 * 2. Exact matrix match: `{slugUnderscore}_h2h_matrix_{year}.csv`
 * 3. Best-overlap scan: any `*_h2h_matrix_{year}.csv` whose filename words
 *    overlap most with the tournament slug words.
 */
function resolveCsvPath(slugUnderscore: string, year: string): string | null {
  const publicDir = path.join(process.cwd(), 'public');
  const candidates: string[] = [
    path.join(publicDir, `${slugUnderscore}_${year}.csv`),
    path.join(publicDir, `${slugUnderscore}_h2h_matrix_${year}.csv`),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  // Scan for any *_h2h_matrix_{year}.csv and pick best slug match
  let files: string[] = [];
  try { files = fs.readdirSync(publicDir); } catch { return null; }
  const suffix = `_h2h_matrix_${year}.csv`;
  const matrixFiles = files.filter((f) => f.endsWith(suffix));
  if (!matrixFiles.length) return null;
  // Score each file by how many slug words appear in its name
  const slugWords = slugUnderscore.split('_').filter((w) => w.length > 2);
  let bestFile = matrixFiles[0];
  let bestScore = -1;
  for (const f of matrixFiles) {
    const score = slugWords.filter((w) => f.includes(w)).length;
    if (score > bestScore) { bestScore = score; bestFile = f; }
  }
  return path.join(publicDir, bestFile);
}

/** Players present in R2 but not in R1 are seeds (they enter the draw at the second round). */
function computeSeeds(rawLines: string[]): Set<string> {
  const r1 = new Set<string>();
  const r2 = new Set<string>();
  for (const line of rawLines) {
    const parts = line.split(',');
    if (parts.length < 5) continue;
    const rnd = parts[0].trim();
    const p1 = parts[3].trim();
    const p2 = parts[4].trim();
    for (const p of [p1, p2]) {
      if (!p || p.toLowerCase() === 'qualifier' || p.toLowerCase().startsWith('player')) continue;
      if (rnd === 'R1') r1.add(p);
      if (rnd === 'R2') r2.add(p);
    }
  }
  const seeds = new Set<string>();
  for (const p of r2) if (!r1.has(p)) seeds.add(p);
  return seeds;
}

/** Map player → QF quarter section name (e.g. "Quarter 01"). */
function computeQuarterMap(rawLines: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of rawLines) {
    const parts = line.split(',');
    if (parts.length < 5) continue;
    if (parts[0].trim() !== 'QF') continue;
    const sec = parts[2].trim();
    const p1 = parts[3].trim();
    const p2 = parts[4].trim();
    for (const p of [p1, p2]) {
      if (p && p !== 'Qualifier') map.set(p, sec);
    }
  }
  return map;
}

// Build bidirectional map: each pair adds both directions
function buildPlayerMap(pairs: Array<{ player1: string; player2: string }>): Map<string, string[]> {
  const map = new Map<string, Set<string>>();
  for (const { player1, player2 } of pairs) {
    if (!map.has(player1)) map.set(player1, new Set());
    if (!map.has(player2)) map.set(player2, new Set());
    map.get(player1)!.add(player2);
    map.get(player2)!.add(player1);
  }
  const sorted = new Map<string, string[]>();
  for (const [player, opponents] of map) {
    sorted.set(player, Array.from(opponents).sort((a, b) => a.localeCompare(b)));
  }
  return sorted;
}

export default function TournamentH2HLinks({ tournamentId, year }: Props) {
  const slugUnderscore = tournamentId.replace(/-/g, '_');
  const csvPath = resolveCsvPath(slugUnderscore, year);

  let pairs: Array<{ player1: string; player2: string }> = [];
  let rawLines: string[] = [];
  let matrixFmt = false;
  let hasData = false;
  try {
    if (csvPath) {
      const content = fs.readFileSync(csvPath, 'utf-8');
      ({ pairs, rawLines, matrixFmt } = parseH2HPairs(content));
      hasData = pairs.length > 0;
    }
  } catch {
    // hasData stays false — we still render the header with a notice
  }

  const playerMap = buildPlayerMap(pairs);
  const sortedPlayers = Array.from(playerMap.keys()).sort((a, b) => a.localeCompare(b));
  const stats = buildStats(pairs, playerMap, rawLines, matrixFmt);

  // --- Bracket analysis (only meaningful for matrix-format CSVs) ---
  const seeds = matrixFmt ? computeSeeds(rawLines) : new Set<string>();
  const quarterMap = matrixFmt ? computeQuarterMap(rawLines) : new Map<string, string>();

  // Players per quarter (sorted alphabetically), seeds per quarter
  const allQuarterPlayers = new Map<string, string[]>();
  const seedsByQuarter = new Map<string, string[]>();
  for (const q of QUARTER_ORDER) { allQuarterPlayers.set(q, []); seedsByQuarter.set(q, []); }
  for (const player of sortedPlayers) {
    const q = quarterMap.get(player);
    if (!q) continue;
    allQuarterPlayers.get(q)?.push(player);
    if (seeds.has(player)) seedsByQuarter.get(q)?.push(player);
  }

  // Seeds per half
  const seedsByHalf = new Map<string, string[]>();
  for (const h of HALF_ORDER) seedsByHalf.set(h, []);
  for (const q of QUARTER_ORDER) {
    const h = QUARTER_TO_HALF[q];
    (seedsByHalf.get(h) ?? []).push(...(seedsByQuarter.get(q) ?? []));
  }

  const hasBracketData = seeds.size > 0 && quarterMap.size > 0;

  // Human-readable description
  const roundText = stats.rounds.map((r) => ROUND_LABELS[r] ?? r).join(', ');
  const description = hasData
    ? [
        `The ${year} draw features ${stats.playerCount} named players`,
        stats.rounds.length ? `competing across ${stats.rounds.length} stages (${roundText})` : null,
        `with ${stats.totalPairs.toLocaleString()} possible head-to-head matchups.`,
        stats.mostConnected
          ? `${stats.mostConnected.player} has the most potential opponents (${stats.mostConnected.count}).`
          : null,
      ].filter(Boolean).join(' ')
    : null;

  // Shared inline-style tokens
  const subHeading: React.CSSProperties = {
    fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.6rem', marginTop: '2rem',
    paddingLeft: '0.75rem', borderLeft: '3px solid #3b82f6',
  };
  const body: React.CSSProperties = { fontSize: '0.9rem', opacity: 0.82, lineHeight: 1.65 };
  const caption: React.CSSProperties = { fontSize: '0.8rem', opacity: 0.65, lineHeight: 1.5 };
  const linkStyle: React.CSSProperties = { textDecoration: 'none', color: '#93c5fd' };
  const pill: React.CSSProperties = {
    display: 'inline-block', padding: '0.15rem 0.55rem', borderRadius: '999px',
    fontSize: '0.72rem', fontWeight: 600,
  };

  // ── JSON-LD ItemList — Google follows and indexes each H2H URL ──
  const SITE = 'https://stats.tennismylife.org';
  const uniquePairUrls: { name: string; url: string }[] = [];
  const seenJsonLd = new Set<string>();
  for (const { player1, player2 } of pairs) {
    const url = createH2HUrl(player1, player2);
    if (!seenJsonLd.has(url)) {
      seenJsonLd.add(url);
      uniquePairUrls.push({ name: `${player1} vs ${player2} head-to-head`, url: `${SITE}${url}` });
    }
  }
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Monte Carlo Masters ${year} — All possible Head-to-Head matchups`,
    numberOfItems: uniquePairUrls.length,
    itemListElement: uniquePairUrls.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: item.url,
    })),
  };

  // ── JSON-LD Person graph for each seed — entity-links players to known identities ──
  const seedList = Array.from(matrixFmt ? computeSeeds(rawLines) : new Set<string>());
  const personGraphJsonLd = seedList.length > 0 ? {
    '@context': 'https://schema.org',
    '@graph': seedList.map((name) => ({
      '@type': 'Person',
      name,
      url: `${SITE}${createH2HUrl(name, seedList.find((s) => s !== name) ?? name)}`,
      description: `${name} ATP tennis player — possible head-to-head matchups at Monte Carlo Masters ${year}`,
    })),
  } : null;

  // ── Deduplicated list of all unique H2H pairs (for sr-only flat link list) ──
  const allUniquePairs: [string, string][] = [];
  const seenPairs = new Set<string>();
  for (const { player1, player2 } of pairs) {
    const key = [player1, player2].sort().join('|||');
    if (!seenPairs.has(key)) { seenPairs.add(key); allUniquePairs.push([player1, player2]); }
  }

  const sectionAriaLabel = hasData
    ? `Head-to-head matchup analysis for Monte Carlo Masters ${year}. ${stats.playerCount} players, ${stats.totalPairs} possible matchups across ${stats.rounds.map((r) => ROUND_LABELS[r] ?? r).join(', ')}.`
    : `Head-to-head analysis for Monte Carlo Masters ${year}`;

  return (
    <section aria-label={sectionAriaLabel} style={{ marginTop: '2.5rem', padding: '0 0.5rem' }}>
      {/* JSON-LD ItemList — machine-readable list of all H2H URLs for Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      {/* JSON-LD Person entities for each seeded player — entity-linking for Google Knowledge Graph */}
      {personGraphJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personGraphJsonLd) }}
        />
      )}

      {/* ── 1. HEADER + OVERVIEW ── */}
      <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.3rem', letterSpacing: '-0.01em', textAlign: 'center', color: '#fbbf24' }}>
        Head-to-Head Analysis — {year}
      </h2>
      <p style={{ textAlign: 'center', fontSize: '0.78rem', opacity: 0.5, marginBottom: hasData && hasBracketData ? '0.5rem' : '1rem' }}>
        Updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
      {hasData ? (
        <p style={{ ...body, marginBottom: hasBracketData ? '0' : '1rem' }}>
          {description}
        </p>
      ) : (
        <p style={{ ...body, textAlign: 'center', opacity: 0.55, marginBottom: '0.5rem' }}>
          The draw for the {year} edition has not been published yet.<br />
          Head-to-head matchup analysis will appear here once the draw is available.
        </p>
      )}

      {hasBracketData && (() => {
        const h1Seeds = seedsByHalf.get('Half 01') ?? [];
        const h2Seeds = seedsByHalf.get('Half 02') ?? [];

        return (
          <>
            {/* ── 2. SEEDS & QUARTER DRAW ── */}
            <h3 style={subHeading}>Seeds &amp; Quarter Draw</h3>
            <p style={{ ...body, marginBottom: '1rem' }}>
              <strong>{seeds.size} seeded players</strong> enter from the Second Round, split across 4 quarters.
              Players in the <em>same quarter</em> can meet no earlier than the quarterfinals.
              Players in the <em>same half</em> (different quarters) can first clash in the semifinals.
              A clash between players from <em>opposite halves</em> is only possible in the final.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '0.5rem' }}>
              {QUARTER_ORDER.map((q) => {
                const qSeeds = seedsByQuarter.get(q) ?? [];
                const allInQ = allQuarterPlayers.get(q) ?? [];
                const half = QUARTER_TO_HALF[q];
                const halfLabel = HALF_DISPLAY[half] ?? half;
                const qLabel = QUARTER_DISPLAY[q] ?? q;
                const borderColor = QUARTER_BORDER[q] ?? '#4b5563';
                const labelColor = QUARTER_LABEL_COLOR[q] ?? '#e5e7eb';
                return (
                  <div key={q} style={{
                    background: QUARTER_COLORS[q],
                    border: `1px solid ${borderColor}55`,
                    borderTop: `3px solid ${borderColor}`,
                    borderRadius: '0.625rem',
                    padding: '0.875rem 1rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: labelColor }}>{qLabel}</span>
                      <span style={{ ...pill, background: `${borderColor}30`, color: labelColor, border: `1px solid ${borderColor}55` }}>{halfLabel}</span>
                    </div>
                    {/* Seeds in this quarter */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '0.55rem' }}>
                      {qSeeds.map((s) => (
                        <span key={s} style={{ fontSize: '0.875rem', fontWeight: 700, color: labelColor }}>
                          🎾 {s}
                        </span>
                      ))}
                    </div>
                    {/* Possible QF clash between the 2 seeds */}
                    {qSeeds.length >= 2 && (
                      <div style={{ fontSize: '0.82rem', marginBottom: '0.5rem', padding: '0.35rem 0.5rem', background: '#ffffff0a', borderRadius: '0.375rem' }}>
                        <span style={{ opacity: 0.6, marginRight: '0.25rem' }}>Possible QF:</span>
                        <a href={createH2HUrl(qSeeds[0], qSeeds[1])} title={`${qSeeds[0]} vs ${qSeeds[1]} head-to-head`} style={{ color: labelColor, textDecoration: 'none', fontWeight: 700 }}>
                          {qSeeds[0]} vs {qSeeds[1]}
                        </a>
                      </div>
                    )}
                    {/* All players in this quarter */}
                    <details style={{ fontSize: '0.82rem' }}>
                      <summary style={{ cursor: 'pointer', opacity: 0.6, userSelect: 'none' }}>
                        All {allInQ.length} players ▾
                      </summary>
                      <ul style={{ margin: '0.4rem 0 0 0.5rem', padding: 0, listStyle: 'none' }}>
                        {allInQ.map((p) => (
                          <li key={p} style={{ lineHeight: 1.8 }}>
                            <a href={createH2HUrl(p, qSeeds[0] ?? sortedPlayers[0])} title={`${p} head-to-head stats`} style={{ color: seeds.has(p) ? labelColor : '#e5e7eb', textDecoration: 'none', fontWeight: seeds.has(p) ? 700 : 400 }}>
                              {seeds.has(p) ? '🎾 ' : ''}{p}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                );
              })}
            </div>

            {/* ── 3. SEMIFINALS ANALYSIS ── */}
            <h3 style={{ ...subHeading, borderLeftColor: '#a78bfa' }}>Possible Semifinals</h3>
            <p style={{ ...body, marginBottom: '1rem' }}>
              The <strong>Top Half semifinal (SF1)</strong> will be contested between the winners of Quarter 1 and Quarter 2.
              The <strong>Bottom Half semifinal (SF2)</strong> pits the winners of Quarter 3 and Quarter 4.
              Below are all possible seeded matchups at the semifinal stage.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem', marginBottom: '0.5rem' }}>
              {HALF_ORDER.map((half) => {
                const [qa, qb] = QUARTER_ORDER.filter((q) => QUARTER_TO_HALF[q] === half);
                const aSeeds = seedsByQuarter.get(qa) ?? [];
                const bSeeds = seedsByQuarter.get(qb) ?? [];
                const crossMatchups: [string, string][] = aSeeds.flatMap((p1) => bSeeds.map((p2): [string, string] => [p1, p2]));
                const halfLabel = HALF_DISPLAY[half] ?? half;
                const sfLabel = half === 'Half 01' ? 'SF1 — Top Half' : 'SF2 — Bottom Half';
                const accentColor = half === 'Half 01' ? '#818cf8' : '#fb923c';
                return (
                  <div key={half} style={{
                    background: '#ffffff07',
                    border: `1px solid ${accentColor}44`,
                    borderTop: `3px solid ${accentColor}`,
                    borderRadius: '0.625rem',
                    padding: '0.875rem 1rem',
                  }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.2rem', color: accentColor }}>{sfLabel}</div>
                    <div style={{ ...caption, marginBottom: '0.6rem' }}>
                      {QUARTER_DISPLAY[qa]} winner vs {QUARTER_DISPLAY[qb]} winner
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                      {crossMatchups.map(([p1, p2]) => (
                        <li key={`${p1}|||${p2}`} style={{ lineHeight: 2, fontSize: '0.9rem' }}>
                          <a href={createH2HUrl(p1, p2)} title={`${p1} vs ${p2} head-to-head`} style={{ color: accentColor, textDecoration: 'none', fontWeight: 600 }}>
                            🎾 {p1} <span style={{ opacity: 0.5, fontWeight: 400 }}>vs</span> {p2} 🎾
                          </a>
                        </li>
                      ))}
                    </ul>
                    {(() => {
                      const allA = allQuarterPlayers.get(qa) ?? [];
                      const allB = allQuarterPlayers.get(qb) ?? [];
                      const nonSeedCross = allA.flatMap((p1) =>
                        allB
                          .filter((p2) => !(seeds.has(p1) && seeds.has(p2)))
                          .map((p2): [string, string] => [p1, p2])
                      );
                      return nonSeedCross.length > 0 ? (
                        <details style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}>
                          <summary style={{ cursor: 'pointer', opacity: 0.55, userSelect: 'none' }}>
                            All {nonSeedCross.length} possible SF matchups ({halfLabel}) ▾
                          </summary>
                          <ul style={{ margin: '0.4rem 0 0 0.4rem', padding: 0, listStyle: 'none', maxHeight: '14rem', overflowY: 'auto' }}>
                            {nonSeedCross.map(([p1, p2]) => (
                              <li key={`${p1}|||${p2}`} style={{ lineHeight: 1.8 }}>
                                <a href={createH2HUrl(p1, p2)} title={`${p1} vs ${p2} head-to-head`} style={{ color: '#d1d5db', textDecoration: 'none' }}>
                                  {p1} vs {p2}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null;
                    })()}
                  </div>
                );
              })}
            </div>

            {/* ── 4. FINAL SCENARIOS ── */}
            <h3 style={{ ...subHeading, borderLeftColor: '#fbbf24' }}>Final Scenarios</h3>
            <p style={{ ...body, marginBottom: '1rem' }}>
              Only players from <strong>opposite halves</strong> can meet in the final.
              The Top Half (Quarters 1–2) and Bottom Half (Quarters 3–4) each contribute one finalist.
              {h1Seeds.length > 0 && h2Seeds.length > 0
                ? <> Among the seeds, there are <strong>{h1Seeds.length * h2Seeds.length} possible all-seeded finals</strong>.</>
                : null
              }
            </p>

            {/* Marquee seed finals */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fbbf24', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                🏆 Possible seeded finals
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {h1Seeds.flatMap((p1) =>
                  h2Seeds.map((p2) => (
                    <a
                      key={`${p1}|||${p2}`}
                      href={createH2HUrl(p1, p2)}
                      title={`${p1} vs ${p2} head-to-head — ${year} Final scenario`}
                      style={{
                        display: 'inline-block',
                        border: '1px solid #fbbf2455',
                        borderRadius: '0.5rem',
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        background: '#fbbf2412',
                        color: '#fde68a',
                        textDecoration: 'none',
                      }}
                    >
                      🎾 {p1} <span style={{ opacity: 0.5, fontWeight: 400 }}>vs</span> {p2} 🎾
                    </a>
                  ))
                )}
              </div>
            </div>

            {/* All possible Final matchups (collapsed) */}
            {(() => {
              const allH1 = (allQuarterPlayers.get('Quarter 01') ?? []).concat(allQuarterPlayers.get('Quarter 02') ?? []);
              const allH2 = (allQuarterPlayers.get('Quarter 03') ?? []).concat(allQuarterPlayers.get('Quarter 04') ?? []);
              const allFinals = allH1.flatMap((p1) => allH2.map((p2): [string, string] => [p1, p2]));
              return (
                <details style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  <summary style={{ cursor: 'pointer', opacity: 0.6, userSelect: 'none', fontWeight: 500 }}>
                    All {allFinals.length} possible final matchups ▾
                  </summary>
                  <ul style={{ margin: '0.5rem 0 0 0.5rem', padding: 0, listStyle: 'none', columns: 2, columnGap: '1.5rem', maxHeight: '18rem', overflowY: 'auto' }}>
                    {allFinals.map(([p1, p2]) => (
                      <li key={`${p1}|||${p2}`} style={{ lineHeight: 1.9, breakInside: 'avoid' }}>
                        <a href={createH2HUrl(p1, p2)} title={`${p1} vs ${p2} head-to-head`} style={{ color: '#d1d5db', textDecoration: 'none' }}>
                          {p1} vs {p2}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })()}
          </>
        );
      })()}

      {/* ── 5. FULL PLAYER H2H DIRECTORY ── */}
      {hasData && (
        <>
          <h3 style={{ ...subHeading, marginTop: hasBracketData ? '2rem' : '1rem', borderLeftColor: '#34d399' }}>
            Complete H2H Directory
          </h3>
          <p style={{ ...body, marginBottom: '1rem' }}>
            All <strong>{sortedPlayers.length} players</strong> in the draw — click any name to expand the full list of
            opponents they could face, with a direct link to each head-to-head page. Seeds are highlighted with 🎾.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '0.5rem',
          }}>
            {sortedPlayers.map((player) => {
              const opponents = playerMap.get(player)!;
              const isSeed = seeds.has(player);
              const q = quarterMap.get(player);
              const borderColor = q ? (QUARTER_BORDER[q] ?? '#4b5563') : '#4b5563';
              return (
                <details key={player} style={{
                  contain: 'content',
                  fontSize: '0.875rem',
                  background: '#ffffff06',
                  border: `1px solid ${isSeed ? borderColor + '66' : '#ffffff14'}`,
                  borderLeft: isSeed ? `3px solid ${borderColor}` : '3px solid transparent',
                  borderRadius: '0.5rem',
                }}>
                  <summary style={{
                    cursor: 'pointer',
                    padding: '0.45rem 0.65rem',
                    fontWeight: isSeed ? 700 : 500,
                    listStyle: 'none',
                    userSelect: 'none',
                    color: isSeed ? (QUARTER_LABEL_COLOR[q ?? ''] ?? '#e5e7eb') : '#e5e7eb',
                  }}>
                    {isSeed ? '🎾 ' : ''}{player}{' '}
                    <span style={{ opacity: 0.5, fontWeight: 400, fontSize: '0.78rem' }}>({opponents.length})</span>
                  </summary>
                  <ul style={{ margin: '0.25rem 0 0.5rem 0.75rem', padding: 0, listStyle: 'none' }}>
                    {opponents.map((opponent) => (
                      <li key={opponent} style={{ lineHeight: '1.75' }}>
                        <a href={createH2HUrl(player, opponent)} title={`${player} vs ${opponent} head-to-head`} style={{ color: '#93c5fd', textDecoration: 'none', fontSize: '0.83rem' }}>
                          {player} vs {seeds.has(opponent) ? '🎾 ' : ''}{opponent}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
        </>
      )}

      {/* SEO: flat always-rendered list of every unique H2H pair — full crawl weight, not inside <details> */}
      <ul
        aria-label="All head-to-head matchups in the tournament"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          border: 0,
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}
      >
        {allUniquePairs.map(([p1, p2]) => (
          <li key={`${p1}|||${p2}`}>
            <a href={createH2HUrl(p1, p2)} title={`${p1} vs ${p2} head-to-head record and statistics`}>
              {p1} vs {p2} head-to-head record and statistics
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}


