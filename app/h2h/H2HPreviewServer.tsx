import React from 'react';
import { prisma } from '@/lib/prisma';
import Flag from '@/components/Flag';

interface Player {
  id?: string | number;
  atpname?: string | null;
  ioc?: string | null;
}

interface Match {
  winner_id?: string | number | null;
  loser_id?: string | number | null;
  surface?: string | null;
  tourney_level?: string | null; // 'G' for GS
  status?: boolean | null;
  score?: string | null;
}

interface Props {
  player1: Player | null;
  player2: Player | null;
  matches: Match[];
}

export default async function H2HPreviewServer({ player1, player2, matches }: Props) {
  if (!player1 || !player2) return null;

  const countedMatches = matches.filter((m) => m.status !== false && !((m.score ?? '').toUpperCase().includes('DEF') || (m.score ?? '').toUpperCase().includes('W/O') || (m.score ?? '').toUpperCase().includes('WEA')));
  const total = countedMatches.length;
  const wins1 = countedMatches.filter((m) => String(m.winner_id) === String(player1.id)).length;
  const wins2 = countedMatches.filter((m) => String(m.winner_id) === String(player2.id)).length;
  const losses1 = wins2;
  const losses2 = wins1;

  const leader = wins1 > wins2 ? player1.atpname : wins2 > wins1 ? player2.atpname : null;

  const pct = (wins: number, totalMatches = total) => (totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(2) : '0.00');

  // Styling helpers
  const valueClass = (a: number, b: number) => {
    if (a > b) return "font-bold text-green-400";
    if (a < b) return "font-bold text-red-400";
    return "font-semibold text-gray-300";
  };



  const surfaceScore = (surfaceName: string) => {
    const key = surfaceName.toLowerCase();
    const p1 = countedMatches.filter((m) => (m.surface ?? '').toLowerCase().includes(key) && String(m.winner_id) === String(player1.id)).length;
    const p2 = countedMatches.filter((m) => (m.surface ?? '').toLowerCase().includes(key) && String(m.winner_id) === String(player2.id)).length;
    return `${p1}–${p2}`;
  };

  const surfaceCounts = (surfaceName: string) => {
    const key = surfaceName.toLowerCase();
    const p1 = countedMatches.filter((m) => (m.surface ?? '').toLowerCase().includes(key) && String(m.winner_id) === String(player1.id)).length;
    const p2 = countedMatches.filter((m) => (m.surface ?? '').toLowerCase().includes(key) && String(m.winner_id) === String(player2.id)).length;
    return { p1, p2 };
  }; 

  // Per-player counts per surface (wins and losses within the H2H)
  const p1_hard_wins = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'hard' && String(m.winner_id) === String(player1.id)).length;
  const p1_hard_losses = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'hard' && String(m.winner_id) === String(player2.id)).length;
  const p1_clay_wins = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'clay' && String(m.winner_id) === String(player1.id)).length;
  const p1_clay_losses = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'clay' && String(m.winner_id) === String(player2.id)).length;
  const p1_grass_wins = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'grass' && String(m.winner_id) === String(player1.id)).length;
  const p1_grass_losses = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'grass' && String(m.winner_id) === String(player2.id)).length;

  const p2_hard_wins = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'hard' && String(m.winner_id) === String(player2.id)).length;
  const p2_hard_losses = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'hard' && String(m.winner_id) === String(player1.id)).length;
  const p2_clay_wins = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'clay' && String(m.winner_id) === String(player2.id)).length;
  const p2_clay_losses = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'clay' && String(m.winner_id) === String(player1.id)).length;
  const p2_grass_wins = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'grass' && String(m.winner_id) === String(player2.id)).length;
  const p2_grass_losses = countedMatches.filter((m) => (m.surface ?? '').toLowerCase() === 'grass' && String(m.winner_id) === String(player1.id)).length;

  const slamMatches = countedMatches.filter((m) => m.tourney_level === 'G').length;
  const slamScore = (() => {
    const p1 = countedMatches.filter((m) => m.tourney_level === 'G' && String(m.winner_id) === String(player1.id)).length;
    const p2 = countedMatches.filter((m) => m.tourney_level === 'G' && String(m.winner_id) === String(player2.id)).length;
    return `${p1}–${p2}`;
  })();

  // Fetch career stats from DB for each player (server-side)
  const fetchCareerStats = async (playerId?: string | number) => {
    if (!playerId) return null;
    const idStr = String(playerId);

    // retrieve all matches for career stats; keep those with status=false since titles query handles them explicitly
    const careerMatches = await prisma.match.findMany({
      where: {
        OR: [{ winner_id: idStr }, { loser_id: idStr }],
        NOT: {
          OR: [
            { score: { contains: "DEF", mode: "insensitive" } },
            { score: { contains: "W/O", mode: "insensitive" } },
            { score: { contains: "WEA", mode: "insensitive" } },
            // do NOT exclude status=false here (included in title count as requested)
          ],
        },
      },
      select: { id: true, winner_id: true, loser_id: true, surface: true, tourney_level: true, round: true, tourney_name: true, winner_rank: true, loser_rank: true, team_event: true },
    });

    let winsAll = 0;
    let totalAll = 0;
    let winsHard = 0;
    let winsClay = 0;
    let winsGrass = 0;
    let winsCarpet = 0;
    let lossesAll = 0;
    let lossesHard = 0;
    let lossesClay = 0;
    let lossesGrass = 0;
    let lossesCarpet = 0;
    let titlesAll = 0;
    let titlesHard = 0;
    let titlesClay = 0;
    let titlesGrass = 0;
    let titlesCarpet = 0;
    let top10Wins = 0;
    let top10Losses = 0;

    // separate query for titles; this will count even matches where status=false
    const titleRows = await prisma.match.findMany({
      where: {
        winner_id: idStr,
        round: 'F',
        team_event: false,
        AND: [
          { tourney_name: { not: { contains: 'Next Gen' } } },
          { tourney_name: { not: { contains: 'WEA' } } },
          { score: { not: { contains: 'WEA' } } },
        ],
      },
      select: { surface: true },
    });
    titlesAll = titleRows.length;
    titlesHard = titleRows.filter(m => m.surface === 'Hard').length;
    titlesClay = titleRows.filter(m => m.surface === 'Clay').length;
    titlesGrass = titleRows.filter(m => m.surface === 'Grass').length;
    titlesCarpet = titleRows.filter(m => m.surface === 'Carpet').length;

    careerMatches.forEach((m) => {
      totalAll += 1;
      if (m.winner_id === idStr) {
        winsAll += 1;
        if (m.surface === 'Hard') winsHard += 1;
        if (m.surface === 'Clay') winsClay += 1;
        if (m.surface === 'Grass') winsGrass += 1;
        if (m.surface === 'Carpet') winsCarpet += 1;
        // Top 10 win: opponent (loser) was ranked <= 10
        if (m.loser_rank != null && m.loser_rank <= 10) top10Wins += 1;
      } else {
        // player lost this match
        lossesAll += 1;
        if (m.surface === 'Hard') lossesHard += 1;
        if (m.surface === 'Clay') lossesClay += 1;
        if (m.surface === 'Grass') lossesGrass += 1;
        if (m.surface === 'Carpet') lossesCarpet += 1;
        // Top 10 loss: player lost to a top 10 opponent
        if (m.winner_rank != null && m.winner_rank <= 10) top10Losses += 1;
      }
    });

    return {
      totalAll,
      winsAll,
      lossesAll,
      percAll: totalAll > 0 ? (winsAll / totalAll) * 100 : 0,
      winsHard,
      winsClay,
      winsGrass,
      winsCarpet,
      lossesHard,
      lossesClay,
      lossesGrass,
      lossesCarpet,
      titlesAll,
      titlesHard,
      titlesClay,
      titlesGrass,
      titlesCarpet,
      top10Wins,
      top10Losses,
      top10WinPct: (top10Wins + top10Losses) > 0 ? ((top10Wins / (top10Wins + top10Losses)) * 100).toFixed(2) : '0.00',
    };
  };

  const [p1Career, p2Career] = await Promise.all([
    fetchCareerStats(player1.id),
    fetchCareerStats(player2.id),
  ]);

  // Helper: win% string for a surface in the career stats
  const surfWinPct = (wins: number, losses: number) => {
    const t = wins + losses;
    return t > 0 ? ((wins / t) * 100).toFixed(2) : '0.00';
  };

  const hardClay = surfaceCounts('Clay');
  const hardHard = surfaceCounts('Hard');
  const hardGrass = surfaceCounts('Grass');

  return (
    <div className="mb-6 p-6 bg-gray-800 rounded-lg shadow-lg">
      <h3 className="text-2xl font-bold mb-3 text-center" data-h2h-color="yellow">H2H Preview</h3>

      <div className="text-sm leading-relaxed text-gray-200 space-y-3">
        {/* ── Paragraph 1: the rivalry ── */}
        <p>
          <span className="inline-flex items-center"><Flag ioc={player1.ioc} className="w-4 h-3 mr-2" /><strong>{player1.atpname}</strong></span>{' '}
          and{' '}
          <span className="inline-flex items-center"><Flag ioc={player2.ioc} className="w-4 h-3 mr-2" /><strong>{player2.atpname}</strong></span>{' '}
          {total >= 10 ? (
            <>
              have built a notable rivalry on the ATP Tour, having clashed{' '}
              <strong className="text-yellow-400">{total}</strong> times.{' '}
            </>
          ) : total === 0 ? (
            <>
              have not met yet.{' '}
            </>
          ) : (
            <>
              have met <strong className="text-yellow-400">{total}</strong> {total === 1 ? 'time' : 'times'}.{' '}
            </>
          )}
          {leader ? (
            <>
              <strong>{leader}</strong> currently holds the upper hand, leading the series{' '}
              <strong className={valueClass(wins1, wins2)}>{wins1}</strong>–<strong className={valueClass(wins2, wins1)}>{wins2}</strong>.
            </>
          ) : (
            <>
              Their series is perfectly balanced at{' '}
              <strong className="text-gray-300">{wins1}–{wins2}</strong>, making every encounter between them impossible to call.
            </>
          )}
        </p>

        {/* ── Paragraph 2: player1 career profile ── */}
        <p>
          Looking at their individual career profiles,{' '}
          <span className="inline-flex items-center"><Flag ioc={player1.ioc} className="w-4 h-3 mr-2" /><strong>{player1.atpname}</strong></span>{' '}
          has compiled an overall career record of{' '}
          <strong className="text-green-400">{p1Career?.winsAll ?? 0}</strong>–<strong className="text-red-400">{p1Career?.lossesAll ?? 0}</strong> across{' '}
          <strong className="text-yellow-400">{p1Career?.totalAll ?? 0}</strong> matches,{' '}
          translating to a win rate of <strong className="text-yellow-400">{p1Career ? p1Career.percAll.toFixed(2) : '0.00'}%</strong>.{' '}
          On hard courts his record stands at{' '}
          <strong className="text-green-400">{p1Career?.winsHard ?? 0}</strong>–<strong className="text-red-400">{p1Career?.lossesHard ?? 0}</strong>{' '}
          (<strong className="text-yellow-400">{surfWinPct(p1Career?.winsHard ?? 0, p1Career?.lossesHard ?? 0)}%</strong>),{' '}
          while on clay he holds a{' '}
          <strong className="text-green-400">{p1Career?.winsClay ?? 0}</strong>–<strong className="text-red-400">{p1Career?.lossesClay ?? 0}</strong>{' '}
          (<strong className="text-yellow-400">{surfWinPct(p1Career?.winsClay ?? 0, p1Career?.lossesClay ?? 0)}%</strong>) mark.{' '}
          On grass the numbers read{' '}
          <strong className="text-green-400">{p1Career?.winsGrass ?? 0}</strong>–<strong className="text-red-400">{p1Career?.lossesGrass ?? 0}</strong>{' '}
          (<strong className="text-yellow-400">{surfWinPct(p1Career?.winsGrass ?? 0, p1Career?.lossesGrass ?? 0)}%</strong>){' '}
          {((p1Career?.winsCarpet ?? 0) + (p1Career?.lossesCarpet ?? 0)) > 0 && (
            <>
              , and on carpet{' '}
              <strong className="text-green-400">{p1Career?.winsCarpet ?? 0}</strong>–<strong className="text-red-400">{p1Career?.lossesCarpet ?? 0}</strong>{' '}
              (<strong className="text-yellow-400">{surfWinPct(p1Career?.winsCarpet ?? 0, p1Career?.lossesCarpet ?? 0)}%</strong>)
            </>
          )}
          .{' '}
          {(p1Career?.titlesAll ?? 0) > 0 && (
            <>
              Throughout his career he has won <strong className="text-yellow-400">{p1Career!.titlesAll}</strong> {p1Career!.titlesAll === 1 ? 'title' : 'titles'}{' '}
              ({[
                p1Career!.titlesHard > 0 && `${p1Career!.titlesHard} hard`,
                p1Career!.titlesClay > 0 && `${p1Career!.titlesClay} clay`,
                p1Career!.titlesGrass > 0 && `${p1Career!.titlesGrass} grass`,
                p1Career!.titlesCarpet > 0 && `${p1Career!.titlesCarpet} carpet`,
              ].filter(Boolean).join(', ')}).{' '}
            </>
          )}
          {(p1Career?.top10Wins ?? 0) + (p1Career?.top10Losses ?? 0) > 0 && (
            <>
              Against Top 10 opponents his record reads{' '}
              <strong className="text-green-400">{p1Career!.top10Wins}</strong>–<strong className="text-red-400">{p1Career!.top10Losses}</strong>{' '}
              (<strong className="text-yellow-400">{p1Career!.top10WinPct}%</strong>).
            </>
          )}
        </p>

        {/* ── Paragraph 3: player2 career profile ── */}
        <p>
          <span className="inline-flex items-center"><Flag ioc={player2.ioc} className="w-4 h-3 mr-2" /><strong>{player2.atpname}</strong></span>,{' '}
          on the other hand, enters this matchup with a career mark of{' '}
          <strong className="text-green-400">{p2Career?.winsAll ?? 0}</strong>–<strong className="text-red-400">{p2Career?.lossesAll ?? 0}</strong> from{' '}
          <strong className="text-yellow-400">{p2Career?.totalAll ?? 0}</strong> matches{' '}
          (<strong className="text-yellow-400">{p2Career ? p2Career.percAll.toFixed(2) : '0.00'}%</strong> win rate).{' '}
          His hard-court record is{' '}
          <strong className="text-green-400">{p2Career?.winsHard ?? 0}</strong>–<strong className="text-red-400">{p2Career?.lossesHard ?? 0}</strong>{' '}
          (<strong className="text-yellow-400">{surfWinPct(p2Career?.winsHard ?? 0, p2Career?.lossesHard ?? 0)}%</strong>),{' '}
          on clay he stands at{' '}
          <strong className="text-green-400">{p2Career?.winsClay ?? 0}</strong>–<strong className="text-red-400">{p2Career?.lossesClay ?? 0}</strong>{' '}
          (<strong className="text-yellow-400">{surfWinPct(p2Career?.winsClay ?? 0, p2Career?.lossesClay ?? 0)}%</strong>),{' '}
          and on grass he has gone{' '}
          <strong className="text-green-400">{p2Career?.winsGrass ?? 0}</strong>–<strong className="text-red-400">{p2Career?.lossesGrass ?? 0}</strong>{' '}
          (<strong className="text-yellow-400">{surfWinPct(p2Career?.winsGrass ?? 0, p2Career?.lossesGrass ?? 0)}%</strong>){' '}
          {((p2Career?.winsCarpet ?? 0) + (p2Career?.lossesCarpet ?? 0)) > 0 && (
            <>
              , with a carpet record of{' '}
              <strong className="text-green-400">{p2Career?.winsCarpet ?? 0}</strong>–<strong className="text-red-400">{p2Career?.lossesCarpet ?? 0}</strong>{' '}
              (<strong className="text-yellow-400">{surfWinPct(p2Career?.winsCarpet ?? 0, p2Career?.lossesCarpet ?? 0)}%</strong>)
            </>
          )}
          .{' '}
          {(p2Career?.titlesAll ?? 0) > 0 && (
            <>
              He has accumulated <strong className="text-yellow-400">{p2Career!.titlesAll}</strong> {p2Career!.titlesAll === 1 ? 'title' : 'titles'} in total{' '}
              ({[
                p2Career!.titlesHard > 0 && `${p2Career!.titlesHard} hard`,
                p2Career!.titlesClay > 0 && `${p2Career!.titlesClay} clay`,
                p2Career!.titlesGrass > 0 && `${p2Career!.titlesGrass} grass`,
                p2Career!.titlesCarpet > 0 && `${p2Career!.titlesCarpet} carpet`,
              ].filter(Boolean).join(', ')}).{' '}
            </>
          )}
          {(p2Career?.top10Wins ?? 0) + (p2Career?.top10Losses ?? 0) > 0 && (
            <>
              Against Top 10 opponents his record stands at{' '}
              <strong className="text-green-400">{p2Career!.top10Wins}</strong>–<strong className="text-red-400">{p2Career!.top10Losses}</strong>{' '}
              (<strong className="text-yellow-400">{p2Career!.top10WinPct}%</strong>).
            </>
          )}
        </p>

        {/* ── Paragraph 4: H2H surface breakdown ── */}
        {total > 0 && (
        <p>
          When it comes to their head-to-head meetings, the surface breakdown reveals some interesting contrasts.{' '}
          {(hardHard.p1 + hardHard.p2) > 0 && (
            <>
              On hard courts they have met <strong className="text-yellow-400">{hardHard.p1 + hardHard.p2}</strong> times,{' '}
              {hardHard.p1 >= hardHard.p2 ? (
                <>with <strong>{player1.atpname}</strong> leading <strong className="text-blue-400">{hardHard.p1}–{hardHard.p2}</strong>{' '}
                (<strong className="text-yellow-400">{((hardHard.p1 / (hardHard.p1 + hardHard.p2)) * 100).toFixed(2)}%</strong>).</>
              ) : (
                <>with <strong>{player2.atpname}</strong> leading <strong className="text-blue-400">{hardHard.p2}–{hardHard.p1}</strong>{' '}
                (<strong className="text-yellow-400">{((hardHard.p2 / (hardHard.p1 + hardHard.p2)) * 100).toFixed(2)}%</strong>).</>
              )}{' '}
            </>
          )}
          {(hardClay.p1 + hardClay.p2) > 0 && (
            <>
              The clay record between them sits at <strong className="text-blue-400">{hardClay.p1}–{hardClay.p2}</strong>{' '}
              (<strong className="text-yellow-400">{hardClay.p1 + hardClay.p2 > 0 ? ((hardClay.p1 / (hardClay.p1 + hardClay.p2)) * 100).toFixed(2) : '0.00'}%</strong> for{' '}
              <strong>{player1.atpname}</strong>){' '}
              across <strong className="text-yellow-400">{hardClay.p1 + hardClay.p2}</strong> matches.{' '}
            </>
          )}
          {(hardGrass.p1 + hardGrass.p2) > 0 && (
            <>
              On grass, their <strong className="text-yellow-400">{hardGrass.p1 + hardGrass.p2}</strong>{' '}
              encounter{hardGrass.p1 + hardGrass.p2 !== 1 ? 's have' : ' has'} yielded a record of{' '}
              <strong className="text-blue-400">{hardGrass.p1}–{hardGrass.p2}</strong>{' '}
              (<strong className="text-yellow-400">{hardGrass.p1 + hardGrass.p2 > 0 ? ((hardGrass.p1 / (hardGrass.p1 + hardGrass.p2)) * 100).toFixed(2) : '0.00'}%</strong>).
            </>
          )}
        </p>
        )}

        {/* ── Paragraph 5: Grand Slams ── */}
        {slamMatches >= 5 && (
          <p>
            At the Grand Slam level — where the best-of-five format adds an extra layer of physical and mental endurance —{' '}
            the two have crossed paths <strong className="text-yellow-400">{slamMatches}</strong>{' '}
            {slamMatches === 1 ? 'time' : 'times'}, producing a Slam record of{' '}
            <strong className="text-blue-400">{slamScore}</strong> in favour of{' '}
            <strong>{player1.atpname}</strong>.{' '}
            These matches, often played in front of the largest tennis audiences, frequently prove decisive in shaping the broader narrative of a rivalry.
          </p>
        )}
      </div>
    </div>
  );
}
