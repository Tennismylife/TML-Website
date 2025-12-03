import type { Match } from "@/types";

/** ---------------------------------------
 * Helpers
 * ------------------------------------- */
function safeDiv(n: number, d: number) {
  return d > 0 ? n / d : 0;
}
function fmtPct(x?: number) {
  return Number.isFinite(x!) ? Number(x!.toFixed(1)) : 0;
}
function fmtTwoDecimals(x?: number) {
  return Number.isFinite(x!) ? x!.toFixed(2) : "0.00";  // Ora stringa con 2 decimali fissi
}

/**
 * Parsing robusto del punteggio:
 * - Ignora token non-set (RET, W/O, etc.)
 * - Considera i tie-break tra () (es. 7-6(5)) rimuovendoli
 * - Considera il super tie-break tra [] (es. [10-7]) come 1 set vinto dal vincitore del match
 *   (non incrementa i games)
 * - Mappa i games dal punto di vista del giocatore (iAmWinner)
 */
function parseScore(score: string, iAmWinner: boolean) {
  if (!score) {
    return { sets: 0, mySetsWon: 0, myGames: 0, oppGames: 0 };
  }

  const tokens = score
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  let sets = 0, mySetsWon = 0, myGames = 0, oppGames = 0;

  for (const raw of tokens) {
    if (/^(RET|W\/O|WO|DEF|ABD|ABN|NS|NA)$/i.test(raw)) break;

    if (/^\[[^\]]+\]$/.test(raw)) {
      sets++;
      if (iAmWinner) mySetsWon++;
      continue;
    }

    const clean = raw.replace(/\([^)]*\)/g, "");
    const m = clean.match(/^(\d+)-(\d+)$/);
    if (!m) continue;

    const a = Number(m[1]);
    const b = Number(m[2]);

    sets++;
    if (iAmWinner) {
      myGames += a;
      oppGames += b;
      if (a > b) mySetsWon++;
    } else {
      myGames += b;
      oppGames += a;
      if (b > a) mySetsWon++;
    }
  }

  return { sets, mySetsWon, myGames, oppGames };
}

/** ---------------------------------------
 * Tipi di output
 * ------------------------------------- */
export interface StatItem {
  label: string;
  value: number | string;  // Supporta stringhe per formattazione decimale
}
export interface PlayerStats {
  serve: StatItem[];
  ret: StatItem[];
  points: StatItem[];
  games: StatItem[];
  sets: StatItem[];
}

/** ---------------------------------------
 * Calcolo statistiche
 * ------------------------------------- */
export function calculateStats(matches: Match[], playerId: string): PlayerStats {
  let aces = 0,
    doubleFaults = 0,
    my_svpt = 0,
    my_1stIn = 0,
    my_1stWon = 0,
    my_2ndWon = 0,
    my_bpSaved = 0,
    my_bpFaced = 0;

  let acesAgainst = 0,
    dfAgainst = 0,
    opp_svpt = 0,
    opp_1stIn = 0,
    opp_1stWon = 0,
    opp_2ndWon = 0,
    opp_bpSaved = 0,
    opp_bpFaced = 0;

  let totalPointsPlayed = 0,
    totalPointsWon = 0;

  let totalSets = 0,
    mySetsWon = 0,
    totalGames = 0,
    myGamesWon = 0;

  let totalServiceGamesPlayed = 0,
    totalServiceGamesWon = 0,
    totalReturnGamesPlayed = 0,
    totalReturnGamesWon = 0;

  for (const m of matches) {
    const iAmWinner = String((m as any).winner_id) === String(playerId);
    const me = iAmWinner ? "w" : "l";
    const opp = iAmWinner ? "l" : "w";

    const m_ace = (m as any)[`${me}_ace`] ?? 0;
    const m_df = (m as any)[`${me}_df`] ?? 0;
    const m_svpt = (m as any)[`${me}_svpt`] ?? 0;
    const m_1stIn = (m as any)[`${me}_1stIn`] ?? 0;
    const m_1stWon = (m as any)[`${me}_1stWon`] ?? 0;
    const m_2ndWon = (m as any)[`${me}_2ndWon`] ?? 0;
    const m_bpSaved = (m as any)[`${me}_bpSaved`] ?? 0;
    const m_bpFaced = (m as any)[`${me}_bpFaced`] ?? 0;

    aces += m_ace;
    doubleFaults += m_df;
    my_svpt += m_svpt;
    my_1stIn += m_1stIn;
    my_1stWon += m_1stWon;
    my_2ndWon += m_2ndWon;
    my_bpSaved += m_bpSaved;
    my_bpFaced += m_bpFaced;

    const o_ace = (m as any)[`${opp}_ace`] ?? 0;
    const o_df = (m as any)[`${opp}_df`] ?? 0;
    const o_svpt = (m as any)[`${opp}_svpt`] ?? 0;
    const o_1stIn = (m as any)[`${opp}_1stIn`] ?? 0;
    const o_1stWon = (m as any)[`${opp}_1stWon`] ?? 0;
    const o_2ndWon = (m as any)[`${opp}_2ndWon`] ?? 0;
    const o_bpSaved = (m as any)[`${opp}_bpSaved`] ?? 0;
    const o_bpFaced = (m as any)[`${opp}_bpFaced`] ?? 0;

    acesAgainst += o_ace;
    dfAgainst += o_df;
    opp_svpt += o_svpt;
    opp_1stIn += o_1stIn;
    opp_1stWon += o_1stWon;
    opp_2ndWon += o_2ndWon;
    opp_bpSaved += o_bpSaved;
    opp_bpFaced += o_bpFaced;

    const m_pointsWon = (m_1stWon + m_2ndWon) + (o_svpt - (o_1stWon + o_2ndWon));
    const m_pointsPlayed = m_svpt + o_svpt;
    totalPointsWon += m_pointsWon;
    totalPointsPlayed += m_pointsPlayed;

    const { sets, mySetsWon: sWon, myGames, oppGames } = parseScore((m as any).score || "", iAmWinner);
    totalSets += sets;
    mySetsWon += sWon;
    totalGames += myGames + oppGames;
    myGamesWon += myGames;

    const me_SvGms = (m as any)[`${me}_SvGms`] ?? 0;
    const opp_SvGms = (m as any)[`${opp}_SvGms`] ?? 0;

    const breaksConceded = Math.max(0, m_bpFaced - m_bpSaved);
    const breaksMade = Math.max(0, o_bpFaced - o_bpSaved);

    totalServiceGamesPlayed += me_SvGms;
    totalServiceGamesWon += Math.max(0, me_SvGms - breaksConceded);

    totalReturnGamesPlayed += opp_SvGms;
    totalReturnGamesWon += breaksMade;
  }

  const firstServePct = safeDiv(my_1stIn, my_svpt);
  const firstServeWonPct = safeDiv(my_1stWon, my_1stIn);
  const secondServeWonPct = safeDiv(my_2ndWon, Math.max(0, my_svpt - my_1stIn));
  const bpSavedPct = safeDiv(my_bpSaved, my_bpFaced);
  const spwPct = safeDiv(my_1stWon + my_2ndWon, my_svpt);
  const sgwPct = safeDiv(totalServiceGamesWon, totalServiceGamesPlayed);

  const firstSrvReturnWonPct = safeDiv(opp_1stIn - opp_1stWon, opp_1stIn);
  const secondSrvReturnWonPct = safeDiv((opp_svpt - opp_1stIn) - opp_2ndWon, Math.max(0, opp_svpt - opp_1stIn));
  const my_breaksMade_total = Math.max(0, opp_bpFaced - opp_bpSaved);
  const bpWonPct = safeDiv(my_breaksMade_total, opp_bpFaced);
  const rpwPct = safeDiv(opp_svpt - (opp_1stWon + opp_2ndWon), opp_svpt);
  const rgwPct = safeDiv(totalReturnGamesWon, totalReturnGamesPlayed);

  const totalPointsWonPct = safeDiv(totalPointsWon, totalPointsPlayed);
  const pointsPerGame = safeDiv(totalPointsPlayed, totalGames);
  const pointsPerSet = safeDiv(totalPointsPlayed, totalSets);
  const pointsPerMatch = safeDiv(totalPointsPlayed, matches.length);

  const gamesWonPct = safeDiv(myGamesWon, totalGames);
  const gamesPerSet = safeDiv(totalGames, totalSets);
  const gamesPerMatch = safeDiv(totalGames, matches.length);

  const setsWonPct = safeDiv(mySetsWon, totalSets);
  const setsPerMatch = safeDiv(totalSets, matches.length);

  return {
    serve: [
      { label: "Aces", value: aces },
      { label: "Double Faults", value: doubleFaults },
      { label: "1st Serve %", value: fmtPct(firstServePct * 100) },
      { label: "1st Serve Won %", value: fmtPct(firstServeWonPct * 100) },
      { label: "2nd Serve Won %", value: fmtPct(secondServeWonPct * 100) },
      { label: "Break Points Saved %", value: fmtPct(bpSavedPct * 100) },
      { label: "Service Points Won %", value: fmtPct(spwPct * 100) },
      { label: "Service Games Won %", value: fmtPct(sgwPct * 100) },
    ],
    ret: [
      { label: "Aces against", value: acesAgainst },
      { label: "DF against", value: dfAgainst },
      { label: "1st Srv. Return Won %", value: fmtPct(firstSrvReturnWonPct * 100) },
      { label: "2nd Srv. Return Won %", value: fmtPct(secondSrvReturnWonPct * 100) },
      { label: "Break Points Won %", value: fmtPct(bpWonPct * 100) },
      { label: "Return Points Won %", value: fmtPct(rpwPct * 100) },
      { label: "Return Games Won %", value: fmtPct(rgwPct * 100) },
    ],
    points: [
      { label: "Total Points Played", value: totalPointsPlayed },
      { label: "Total Points Won", value: totalPointsWon },
      { label: "Total Points Won %", value: fmtPct(totalPointsWonPct * 100) },
      // Ora con 2 decimali fissi come stringa
      { label: "Points per Game", value: fmtTwoDecimals(pointsPerGame) },
      { label: "Points per Set", value: fmtTwoDecimals(pointsPerSet) },
      { label: "Points per Match", value: fmtTwoDecimals(pointsPerMatch) },
    ],
    games: [
      { label: "Total Games Played", value: totalGames },
      { label: "Total Games Won", value: myGamesWon },
      { label: "Games Won %", value: fmtPct(gamesWonPct * 100) },
      // Ora con 2 decimali fissi come stringa
      { label: "Games per Set", value: fmtTwoDecimals(gamesPerSet) },
      { label: "Games per Match", value: fmtTwoDecimals(gamesPerMatch) },
    ],
    sets: [
      { label: "Sets Played", value: totalSets },
      { label: "Sets Won", value: mySetsWon },
      { label: "Sets Won %", value: fmtPct(setsWonPct * 100) },
      // Ora con 2 decimali fissi come stringa
      { label: "Sets per Match", value: fmtTwoDecimals(setsPerMatch) },
    ],
  };
}