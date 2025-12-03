import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type SideKeys =
  | 'ace' | 'df'
  | 'svpt' | '1stIn' | '1stWon' | '2ndWon'
  | 'bpSaved' | 'bpFaced';

type StatKey =
  | 'aces' | 'df'
  | '1stserve' | '1stservewon' | '2ndservewon' | 'servicewon'
  | 'bpsaved' | 'bpwon' // Return BP Won %
  | '1streturnwon' | '2ndreturnwon' | 'returnwon'
  | 'totalpointsplayed' | 'totalpointswon' | 'totalpointswonpct'
  | 'totalgames' | 'totalgameswon' | 'gameswonpct'
  | 'setsplayed' | 'setswon' | 'setswonpct'
  | 'tiebreaksplayed' | 'tiebreakswon' | 'tiebreakswonpct'
  | 'totalminutes' | 'avgminutes';

type MatchRow = {
  winner_id: string | null;
  winner_name: string | null;
  winner_ioc: string | null;

  loser_id: string | null;
  loser_name: string | null;
  loser_ioc: string | null;

  score: string | null;
  minutes: number | null;

  // opzionali secondo la stat
  w_ace?: number | null; l_ace?: number | null;
  w_df?: number | null; l_df?: number | null;
  w_svpt?: number | null; l_svpt?: number | null;
  w_1stIn?: number | null; l_1stIn?: number | null;
  w_1stWon?: number | null; l_1stWon?: number | null;
  w_2ndWon?: number | null; l_2ndWon?: number | null;
  w_bpSaved?: number | null; l_bpSaved?: number | null;
  w_bpFaced?: number | null; l_bpFaced?: number | null;
};

type PlayerAgg = {
  id: number;
  name: string;
  ioc: string;

  // match in cui il giocatore appare (dopo filtri)
  matchesTotal: number;

  // match effettivamente usati per la stat richiesta
  matchesUsed: number;

  // servizio
  aceTotal: number;
  dfTotal: number;
  svptTotal: number;
  firstInTotal: number;
  firstWonTotal: number;
  secondWonTotal: number;
  bpSavedTotal: number;
  bpFacedTotal: number;

  // ribattuta (derivata dall’avversario)
  retBpWonTotal: number;       // opp.bpFaced - opp.bpSaved
  retBpChancesTotal: number;   // opp.bpFaced

  // return sulla prima, seconda, totale
  retFirstChancesTotal: number;  // opp.1stIn
  retFirstWonTotal: number;      // opp.1stIn - opp.1stWon
  retSecondChancesTotal: number; // opp.svpt - opp.1stIn
  retSecondWonTotal: number;     // (opp.svpt - opp.1stIn) - opp.2ndWon
  retPointsChancesTotal: number; // opp.svpt
  retPointsWonTotal: number;     // opp.svpt - (opp.1stWon + opp.2ndWon)

  // punteggio
  gamesTotal: number;
  gamesWonTotal: number;
  setsTotal: number;
  setsWonTotal: number;
  tiebreaksTotal: number;
  tiebreaksWonTotal: number;

  minutesTotal: number;
};

function neededFieldsForStat(stat: StatKey): SideKeys[] {
  switch (stat) {
    case 'aces': return ['ace'];
    case 'df': return ['df'];
    case '1stserve': return ['svpt', '1stIn'];
    case '1stservewon': return ['1stIn', '1stWon'];
    case '2ndservewon': return ['svpt', '1stIn', '2ndWon'];
    case 'servicewon': return ['svpt', '1stWon', '2ndWon'];
    case 'bpsaved': return ['bpSaved', 'bpFaced'];
    case 'bpwon': return ['bpSaved', 'bpFaced']; // Return BP Won% si ricava dall’avversario

    // metriche da ribattitore
    case '1streturnwon': return ['1stIn', '1stWon'];
    case '2ndreturnwon': return ['svpt', '1stIn', '2ndWon'];
    case 'returnwon': return ['svpt', '1stWon', '2ndWon'];

    // total points
    case 'totalpointsplayed': return ['svpt']; // return chances = opp.svpt
    case 'totalpointswon':
    case 'totalpointswonpct': return ['svpt', '1stWon', '2ndWon'];

    // solo score/minuti
    case 'totalgames':
    case 'totalgameswon':
    case 'gameswonpct':
    case 'setsplayed':
    case 'setswon':
    case 'setswonpct':
    case 'tiebreaksplayed':
    case 'tiebreakswon':
    case 'tiebreakswonpct':
    case 'totalminutes':
    case 'avgminutes':
    default:
      return [];
  }
}

function buildSelect(stat: StatKey) {
  const sides = neededFieldsForStat(stat);
  const base: any = {
    winner_id: true, winner_name: true, winner_ioc: true,
    loser_id: true, loser_name: true, loser_ioc: true,
    score: true, minutes: true,
  };
  const add = (key: SideKeys) => {
    base[`w_${key}`] = true;
    base[`l_${key}`] = true;
  };
  sides.forEach(add);
  return base;
}

// parsing score robusto: solo token "g1-g2"; tie-break se c'è "("
type SetToken = { g1: number; g2: number; tb: boolean };
function tokenizeScore(score: string | null): SetToken[] {
  if (!score) return [];
  return score
    .trim()
    .split(/\s+/)
    .filter(s => /^\d{1,2}-\d{1,2}/.test(s)) // ignora RET/W.O. ecc.
    .map(s => {
      const m = s.match(/^(\d{1,2})-(\d{1,2})/);
      if (!m) return null;
      const g1 = parseInt(m[1], 10);
      const g2 = parseInt(m[2], 10);
      return { g1, g2, tb: s.includes('(') };
    })
    .filter((x): x is SetToken => !!x);
}

/**
 * Determina se questo match contribuisce davvero alla stat per il giocatore p.
 * Regole:
 *  - per % ⇒ match usato se denominatore > 0
 *  - per metriche da score ⇒ match usato se c’è almeno un set valido
 *  - per conteggi (aces/df) ⇒ match usato se i campi sono presenti (0 è valido)
 *  - per minuti ⇒ usiamo minutes != null (per media includo anche 0; per total puoi cambiare policy)
 */
function matchContributes(
  stat: StatKey,
  p: {
    svpt?: number | null; firstIn?: number | null; firstWon?: number | null; secondWon?: number | null;
    bpSaved?: number | null; bpFaced?: number | null;
    minutes?: number | null; isWinner: boolean;
  },
  opp: {
    svpt?: number | null; firstIn?: number | null; firstWon?: number | null; secondWon?: number | null;
    bpSaved?: number | null; bpFaced?: number | null;
  },
  sets: SetToken[],
): boolean {
  const hasSets = sets.length > 0;
  const svpt = p.svpt ?? null;
  const firstIn = p.firstIn ?? null;
  const firstWon = p.firstWon ?? null;
  const secondWon = p.secondWon ?? null;
  const bpFaced = p.bpFaced ?? null;

  const o_svpt = opp.svpt ?? null;
  const o_firstIn = opp.firstIn ?? null;
  const o_firstWon = opp.firstWon ?? null;

  switch (stat) {
    case 'aces': return true;
    case 'df': return true;

    case '1stserve':      return svpt !== null && svpt > 0;
    case '1stservewon':   return firstIn !== null && firstIn > 0;
    case '2ndservewon':   return (svpt !== null && firstIn !== null) && (svpt - firstIn) > 0;
    case 'servicewon':    return svpt !== null && svpt > 0;

    case 'bpsaved':       return bpFaced !== null && bpFaced > 0;
    case 'bpwon':         return opp.bpFaced !== null && opp.bpFaced > 0;

    case '1streturnwon':  return o_firstIn !== null && o_firstIn > 0;
    case '2ndreturnwon':  return (o_svpt !== null && o_firstIn !== null) && (o_svpt - o_firstIn) > 0;
    case 'returnwon':     return o_svpt !== null && o_svpt > 0;

    case 'totalpointsplayed':
      return (svpt !== null && o_svpt !== null) && (svpt + o_svpt) > 0;

    case 'totalpointswon':
      return (svpt !== null && firstWon !== null && secondWon !== null) &&
             (o_svpt !== null && o_firstWon !== null && opp.secondWon !== null);

    case 'totalpointswonpct':
      return (svpt !== null && o_svpt !== null) && (svpt + o_svpt) > 0;

    case 'totalgames':
    case 'totalgameswon':
    case 'gameswonpct':
      return hasSets && sets.reduce((a, s) => a + s.g1 + s.g2, 0) > 0;

    case 'setsplayed':
    case 'setswon':
    case 'setswonpct':
      return hasSets;

    case 'tiebreaksplayed':
      return hasSets;
    case 'tiebreakswon':
    case 'tiebreakswonpct':
      return sets.some(s => s.tb);

    case 'totalminutes':
      return p.minutes !== null && p.minutes > 0;
    case 'avgminutes':
      return p.minutes !== null;

    default:
      return true;
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const stat = (url.searchParams.get('stat') || 'aces') as StatKey;
    const surface = url.searchParams.get('surface') || 'all';
    // prendi l'anno normalmente, niente parsing "sporco"
    const yearParam = url.searchParams.get('year') || 'all';
    const tourneyLevel = url.searchParams.get('tourneyLevel') || 'all';

    // --- Filtro principale ---
    const where: any = {};
    if (surface !== 'all') where.surface = surface;
    if (tourneyLevel !== 'all') where.tourney_level = tourneyLevel;

    // ---- YEAR: usa direttamente il campo 'year' del DB ----
    if (yearParam !== 'all') {
      const y = Number(yearParam);
      if (!Number.isNaN(y)) {
        where.year = y;
      }
    }

    // --- Selezione campi dinamica in base alla stat ---
    const selectFields = buildSelect(stat);
    const allMatches = await prisma.match.findMany({
      where,
      select: selectFields,
    }) as unknown as MatchRow[];

    // --- Aggregazione ---
    const map = new Map<number, PlayerAgg>();

    for (const m of allMatches) {
      const sets = tokenizeScore(m.score);
      const gamesInMatch = sets.reduce((acc, s) => acc + s.g1 + s.g2, 0);
      const tiebreaksInMatch = sets.filter(s => s.tb).length;

      type P = {
        id: number | null;
        name: string | null;
        ioc: string | null;
        isWinner: boolean;
        ace?: number | null;
        df?: number | null;
        svpt?: number | null;
        firstIn?: number | null;
        firstWon?: number | null;
        secondWon?: number | null;
        bpSaved?: number | null;
        bpFaced?: number | null;
      };

      const W: P = {
        id: m.winner_id ? Number(m.winner_id) : null, name: m.winner_name, ioc: m.winner_ioc, isWinner: true,
        ace: m.w_ace, df: m.w_df, svpt: m.w_svpt, firstIn: m.w_1stIn, firstWon: m.w_1stWon,
        secondWon: m.w_2ndWon, bpSaved: m.w_bpSaved, bpFaced: m.w_bpFaced,
      };
      const L: P = {
        id: m.loser_id ? Number(m.loser_id) : null, name: m.loser_name, ioc: m.loser_ioc, isWinner: false,
        ace: m.l_ace, df: m.l_df, svpt: m.l_svpt, firstIn: m.l_1stIn, firstWon: m.l_1stWon,
        secondWon: m.l_2ndWon, bpSaved: m.l_bpSaved, bpFaced: m.l_bpFaced,
      };

      const players: [P, P] = [W, L];

      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const opp = players[1 - i];
        if (!p.id || !p.name) continue;

        const pid = p.id as number;
        const agg =
          map.get(pid) ||
          {
            id: pid,
            name: p.name!,
            ioc: (p.ioc || ''),
            matchesTotal: 0,
            matchesUsed: 0,

            aceTotal: 0,
            dfTotal: 0,
            svptTotal: 0,
            firstInTotal: 0,
            firstWonTotal: 0,
            secondWonTotal: 0,
            bpSavedTotal: 0,
            bpFacedTotal: 0,

            retBpWonTotal: 0,
            retBpChancesTotal: 0,

            retFirstChancesTotal: 0,
            retFirstWonTotal: 0,
            retSecondChancesTotal: 0,
            retSecondWonTotal: 0,
            retPointsChancesTotal: 0,
            retPointsWonTotal: 0,

            gamesTotal: 0,
            gamesWonTotal: 0,
            setsTotal: 0,
            setsWonTotal: 0,
            tiebreaksTotal: 0,
            tiebreaksWonTotal: 0,

            minutesTotal: 0,
          } as PlayerAgg;

        // appare in questo match filtrato
        agg.matchesTotal += 1;

        // --- Servizio
        agg.aceTotal += p.ace || 0;
        agg.dfTotal += p.df || 0;
        agg.svptTotal += p.svpt || 0;
        agg.firstInTotal += p.firstIn || 0;
        agg.firstWonTotal += p.firstWon || 0;
        agg.secondWonTotal += p.secondWon || 0;
        agg.bpSavedTotal += p.bpSaved || 0;
        agg.bpFacedTotal += p.bpFaced || 0;

        // --- Ribattuta (dall’avversario)
        const o_svpt = opp.svpt || 0;
        const o_1stIn = opp.firstIn || 0;
        const o_1stWon = opp.firstWon || 0;
        const o_2ndWon = opp.secondWon || 0;

        // Return BP%
        const o_bpFaced = opp.bpFaced || 0;
        const o_bpSaved = opp.bpSaved || 0;
        agg.retBpWonTotal += Math.max(0, o_bpFaced - o_bpSaved);
        agg.retBpChancesTotal += o_bpFaced;

        // 1st Serve Return
        const retFirstChances = Math.max(0, o_1stIn);
        const retFirstWon = Math.max(0, o_1stIn - o_1stWon);
        agg.retFirstChancesTotal += retFirstChances;
        agg.retFirstWonTotal += retFirstWon;

        // 2nd Serve Return
        const retSecondChances = Math.max(0, o_svpt - o_1stIn);
        const retSecondWon = Math.max(0, retSecondChances - o_2ndWon);
        agg.retSecondChancesTotal += retSecondChances;
        agg.retSecondWonTotal += retSecondWon;

        // Return Points Won complessivo
        const retPointsChances = Math.max(0, o_svpt);
        const retPointsWon = Math.max(0, o_svpt - (o_1stWon + o_2ndWon));
        agg.retPointsChancesTotal += retPointsChances;
        agg.retPointsWonTotal += retPointsWon;

        // --- Minuti
        agg.minutesTotal += m.minutes || 0;

        // --- Giochi/Set/TB dallo score (POV vincitore)
        agg.gamesTotal += gamesInMatch;
        agg.gamesWonTotal += sets.reduce(
          (acc, s) => acc + (p.isWinner ? s.g1 : s.g2),
          0
        );
        agg.setsTotal += sets.length;
        agg.setsWonTotal += sets.reduce(
          (acc, s) => acc + (p.isWinner ? (s.g1 > s.g2 ? 1 : 0) : (s.g2 > s.g1 ? 1 : 0)),
          0
        );
        agg.tiebreaksTotal += tiebreaksInMatch;
        agg.tiebreaksWonTotal += sets.reduce(
          (acc, s) => acc + (s.tb ? (p.isWinner ? (s.g1 > s.g2 ? 1 : 0) : (s.g2 > s.g1 ? 1 : 0)) : 0),
          0
        );

        // --- Conteggia matchesUsed per la stat corrente
        const contributes = matchContributes(
          stat,
          { svpt: p.svpt, firstIn: p.firstIn, firstWon: p.firstWon, secondWon: p.secondWon, bpSaved: p.bpSaved, bpFaced: p.bpFaced, minutes: m.minutes ?? null, isWinner: p.isWinner },
          { svpt: opp.svpt, firstIn: opp.firstIn, firstWon: opp.firstWon, secondWon: opp.secondWon, bpSaved: opp.bpSaved, bpFaced: opp.bpFaced },
          sets
        );
        if (contributes) {
          agg.matchesUsed += 1;
        }

        map.set(pid, agg);
      }
    }

    // --- Calcolo finale per stat
    const sortedStats = Array.from(map.values())
      .map((p) => {
        let total = 0;

        switch (stat) {
          case 'aces': total = p.aceTotal; break;
          case 'df': total = p.dfTotal; break;

          case '1stserve':
            total = p.svptTotal ? (p.firstInTotal / p.svptTotal) * 100 : 0;
            break;
          case '1stservewon':
            total = p.firstInTotal ? (p.firstWonTotal / p.firstInTotal) * 100 : 0;
            break;
          case '2ndservewon': {
            const secondIn = Math.max(0, p.svptTotal - p.firstInTotal);
            total = secondIn ? (p.secondWonTotal / secondIn) * 100 : 0;
            break;
          }
          case 'servicewon':
            total = p.svptTotal ? ((p.firstWonTotal + p.secondWonTotal) / p.svptTotal) * 100 : 0;
            break;

          case 'bpsaved':
            total = p.bpFacedTotal ? (p.bpSavedTotal / p.bpFacedTotal) * 100 : 0;
            break;

          case 'bpwon': // Return BP Won %
            total = p.retBpChancesTotal ? (p.retBpWonTotal / p.retBpChancesTotal) * 100 : 0;
            break;

          case '1streturnwon':
            total = p.retFirstChancesTotal ? (p.retFirstWonTotal / p.retFirstChancesTotal) * 100 : 0;
            break;
          case '2ndreturnwon':
            total = p.retSecondChancesTotal ? (p.retSecondWonTotal / p.retSecondChancesTotal) * 100 : 0;
            break;
          case 'returnwon':
            total = p.retPointsChancesTotal ? (p.retPointsWonTotal / p.retPointsChancesTotal) * 100 : 0;
            break;

          case 'totalpointsplayed': {
            const pointsPlayedTotal = p.svptTotal + p.retPointsChancesTotal;
            total = pointsPlayedTotal;
            break;
          }
          case 'totalpointswon': {
            const serviceWon = p.firstWonTotal + p.secondWonTotal;
            const pointsWonTotal = serviceWon + p.retPointsWonTotal;
            total = pointsWonTotal;
            break;
          }
          case 'totalpointswonpct': {
            const pointsPlayedTotal = p.svptTotal + p.retPointsChancesTotal;
            const serviceWon = p.firstWonTotal + p.secondWonTotal;
            const pointsWonTotal = serviceWon + p.retPointsWonTotal;
            total = pointsPlayedTotal ? (pointsWonTotal / pointsPlayedTotal) * 100 : 0;
            break;
          }

          case 'totalgames': total = p.gamesTotal; break;
          case 'totalgameswon': total = p.gamesWonTotal; break;
          case 'gameswonpct':
            total = p.gamesTotal ? (p.gamesWonTotal / p.gamesTotal) * 100 : 0;
            break;

          case 'setsplayed': total = p.setsTotal; break;
          case 'setswon': total = p.setsWonTotal; break;
          case 'setswonpct':
            total = p.setsTotal ? (p.setsWonTotal / p.setsTotal) * 100 : 0;
            break;

          case 'tiebreaksplayed': total = p.tiebreaksTotal; break;
          case 'tiebreakswon': total = p.tiebreaksWonTotal; break;
          case 'tiebreakswonpct':
            total = p.tiebreaksTotal ? (p.tiebreaksWonTotal / p.tiebreaksTotal) * 100 : 0;
            break;

          case 'totalminutes': total = p.minutesTotal; break;
          case 'avgminutes': total = p.matchesUsed ? p.minutesTotal / p.matchesUsed : 0; break;

          default: break;
        }

        return {
          id: p.id,
          name: p.name,
          ioc: p.ioc,
          matches: p.matchesUsed,       // match usati per la stat
          matchesTotal: p.matchesTotal, // opzionale
          total,
        };
      })
      .sort((a, b) => b.total - a.total);

    return NextResponse.json(sortedStats);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}