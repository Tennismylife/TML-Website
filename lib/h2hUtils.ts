export type H2HMatch = {
  winner_id?: string | number | null;
  loser_id?: string | number | null;
  winner_name?: string | null;
  loser_name?: string | null;
  score?: string | null;
  tourney_date?: string | Date | null;
  status?: boolean | null;
};

export function filterCountedMatches(matches: H2HMatch[]) {
  return matches
    .filter((m) => m.status !== false)
    .filter((m) => {
      const sc = (m.score ?? '').toUpperCase();
      if (!sc) return true;
      if (sc.includes('DEF') || sc.includes('W/O') || sc.includes('WEA')) return false;
      return true;
    })
    .sort((a, b) => {
      const ta = a.tourney_date ? new Date(a.tourney_date).getTime() : 0;
      const tb = b.tourney_date ? new Date(b.tourney_date).getTime() : 0;
      return ta - tb;
    });
}

export function lastNMatches(matches: H2HMatch[], n = 5) {
  const counted = filterCountedMatches(matches);
  return counted.slice(-n);
}

export function playerResultsForMatches(playerId?: string | number | null, playerName?: string | null, matches: H2HMatch[] = []) {
  const pid = playerId != null ? String(playerId) : null;
  return matches.map((m) => {
    const wid = m.winner_id != null ? String(m.winner_id) : null;
    const lid = m.loser_id != null ? String(m.loser_id) : null;

    if (pid) {
      if (wid === pid) return 'W';
      if (lid === pid) return 'L';
    }

    if (playerName) {
      if (m.winner_name === playerName) return 'W';
      if (m.loser_name === playerName) return 'L';
    }

    return '-';
  });
}
