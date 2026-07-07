type EditionMatch = {
  winner_id?: string | null;
  winner_name?: string | null;
  winner_ioc?: string | null;
  winner_slug?: string | null;
  winner_rank?: number | null;
  loser_id?: string | null;
  loser_name?: string | null;
  loser_ioc?: string | null;
  loser_slug?: string | null;
  loser_rank?: number | null;
  w_ace?: number | null;
  l_ace?: number | null;
  w_df?: number | null;
  l_df?: number | null;
  w_svpt?: number | null;
  l_svpt?: number | null;
  w_1stIn?: number | null;
  l_1stIn?: number | null;
  w_1stWon?: number | null;
  l_1stWon?: number | null;
  w_2ndWon?: number | null;
  l_2ndWon?: number | null;
  w_bpSaved?: number | null;
  l_bpSaved?: number | null;
  w_bpFaced?: number | null;
  l_bpFaced?: number | null;
  minutes?: number | null;
};

export type EditionPlayerAggregate = {
  playerId: string;
  name: string;
  ioc: string | null;
  slug: string | null;
  rank: number | null;
  matches: number;
  wins: number;
  losses: number;
  minutes: number;
  aces: number;
  doubleFaults: number;
  servicePoints: number;
  firstServeIn: number;
  firstServeWon: number;
  secondServeWon: number;
  breakPointsSaved: number;
  breakPointsFaced: number;
  returnPointsWon: number;
  returnPointsPlayed: number;
};

function toNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function ensurePlayer(
  map: Map<string, EditionPlayerAggregate>,
  playerId: string,
  name: string | null | undefined,
  ioc: string | null | undefined,
  slug: string | null | undefined,
) {
  let entry = map.get(playerId);
  if (!entry) {
    entry = {
      playerId,
      name: name || playerId,
      ioc: ioc ?? null,
      slug: slug ?? null,
      rank: null,
      matches: 0,
      wins: 0,
      losses: 0,
      minutes: 0,
      aces: 0,
      doubleFaults: 0,
      servicePoints: 0,
      firstServeIn: 0,
      firstServeWon: 0,
      secondServeWon: 0,
      breakPointsSaved: 0,
      breakPointsFaced: 0,
      returnPointsWon: 0,
      returnPointsPlayed: 0,
    };
    map.set(playerId, entry);
  } else {
    if (!entry.slug && slug) entry.slug = slug;
    if (!entry.ioc && ioc) entry.ioc = ioc;
    if ((!entry.name || entry.name === playerId) && name) entry.name = name;
  }
  return entry;
}

export function pct(num: number, den: number) {
  if (!den) return null;
  const value = (num / den) * 100;
  return Number.isFinite(value) ? value : null;
}

export function aggregateEditionPlayerStats(matches: EditionMatch[]): EditionPlayerAggregate[] {
  const players = new Map<string, EditionPlayerAggregate>();

  for (const match of matches) {
    const winnerId = match.winner_id ? String(match.winner_id) : null;
    const loserId = match.loser_id ? String(match.loser_id) : null;
    if (!winnerId || !loserId) continue;

    const winner = ensurePlayer(players, winnerId, match.winner_name, match.winner_ioc, match.winner_slug);
    const loser = ensurePlayer(players, loserId, match.loser_name, match.loser_ioc, match.loser_slug);

    const winnerRank = match.winner_rank != null ? Number(match.winner_rank) : null;
    const loserRank = match.loser_rank != null ? Number(match.loser_rank) : null;
    if (winnerRank && (!winner.rank || winnerRank < winner.rank)) winner.rank = winnerRank;
    if (loserRank && (!loser.rank || loserRank < loser.rank)) loser.rank = loserRank;

    winner.matches += 1;
    winner.wins += 1;
    loser.matches += 1;
    loser.losses += 1;
    winner.minutes += toNumber(match.minutes);
    loser.minutes += toNumber(match.minutes);

    winner.aces += toNumber(match.w_ace);
    winner.doubleFaults += toNumber(match.w_df);
    winner.servicePoints += toNumber(match.w_svpt);
    winner.firstServeIn += toNumber(match.w_1stIn);
    winner.firstServeWon += toNumber(match.w_1stWon);
    winner.secondServeWon += toNumber(match.w_2ndWon);
    winner.breakPointsSaved += toNumber(match.w_bpSaved);
    winner.breakPointsFaced += toNumber(match.w_bpFaced);
    winner.returnPointsPlayed += toNumber(match.l_svpt);
    winner.returnPointsWon += Math.max(
      0,
      toNumber(match.l_svpt) - (toNumber(match.l_1stWon) + toNumber(match.l_2ndWon)),
    );

    loser.aces += toNumber(match.l_ace);
    loser.doubleFaults += toNumber(match.l_df);
    loser.servicePoints += toNumber(match.l_svpt);
    loser.firstServeIn += toNumber(match.l_1stIn);
    loser.firstServeWon += toNumber(match.l_1stWon);
    loser.secondServeWon += toNumber(match.l_2ndWon);
    loser.breakPointsSaved += toNumber(match.l_bpSaved);
    loser.breakPointsFaced += toNumber(match.l_bpFaced);
    loser.returnPointsPlayed += toNumber(match.w_svpt);
    loser.returnPointsWon += Math.max(
      0,
      toNumber(match.w_svpt) - (toNumber(match.w_1stWon) + toNumber(match.w_2ndWon)),
    );
  }

  return Array.from(players.values()).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.matches !== a.matches) return b.matches - a.matches;
    if (b.aces !== a.aces) return b.aces - a.aces;
    return a.name.localeCompare(b.name);
  });
}
