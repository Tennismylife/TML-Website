export function buildMostPointsResult(
  grouped: any[],
  candidates: any[],
  players: any[],
  options: { allowPlaceholder?: boolean } = {}
) {
  const candidateMap = new Map<string, any>();
  for (const row of candidates) {
    if (!candidateMap.has(row.playerId)) candidateMap.set(row.playerId, row);
  }

  const playersMap = new Map(players.map((p: any) => [p.id, p]));

  const results: any[] = [];
  for (const g of grouped) {
    const row = candidateMap.get(g.playerId);
    const playerFromPlayers = playersMap.get(g.playerId ?? "");
    const name = row?.player?.atpname ?? playerFromPlayers?.atpname ?? `Player ${g.playerId}`;

    // If placeholder names are not allowed, skip entries without a real name
    const isPlaceholder = !row?.player?.atpname && !playerFromPlayers?.atpname;
    if (isPlaceholder && !options.allowPlaceholder) {
      console.warn(`MostPoints: skipping placeholder player id ${g.playerId}`);
      continue;
    }

    if (isPlaceholder) {
      console.warn(`MostPoints: missing player name for id ${g.playerId}`);
    }

    results.push({
      name,
      country: row?.player?.ioc ?? playerFromPlayers?.ioc ?? "UNK",
      points: g._max?.points ?? 0,
      date: row?.rankingDate?.date ? row.rankingDate.date.toISOString().slice(0, 10) : "N/A",
    });
  }

  return results;
}

export default buildMostPointsResult;
