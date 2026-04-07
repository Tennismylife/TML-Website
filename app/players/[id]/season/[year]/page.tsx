import React from 'react';
import PlayerTabPage from '../../[tab]/page';

import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { id, year } = await params;
  // Resolve player
  let player: any = null;
  try {
    const isSlug = !/^\d+$/.test(String(id));
    if (isSlug) {
      player = await prisma.player.findUnique({ where: { slug: String(id).toLowerCase() }, select: { id: true, atpname: true, player: true, slug: true } });
    } else {
      player = await prisma.player.findUnique({ where: { id: String(id) }, select: { id: true, atpname: true, player: true, slug: true } });
    }
  } catch (e) {
    // ignore
  }
  const name = player ? (player.atpname || player.player) : String(id);
  const y = String(year);
  // Use requested SEO title format
  const title = `${name} ${y} ATP Season – Match Results & Stats`;
  const description = `${name} ${y} season: match results, win-loss record, titles & surface breakdown (hard, clay, grass). Full season stats on TennisMyLife.`;
  const canonical = `https://stats.tennismylife.org/players/${encodeURIComponent(player?.slug || String(id))}/season/${encodeURIComponent(y)}`;
  const imageUrl = `https://stats.tennismylife.org/og/${encodeURIComponent(player?.slug || String(id))}.png`;

  // noindex if no matches exist for this player/year
  let hasMatches = false;
  if (player?.id) {
    try {
      const cnt = await prisma.match.count({
        where: { year: Number(y), OR: [{ winner_id: player.id }, { loser_id: player.id }] },
      });
      hasMatches = cnt > 0;
    } catch (e) {
      hasMatches = true; // fail open
    }
  }

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'profile',
      url: canonical,
      siteName: 'TennisMyLife',
      title,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: `${name} ${y} season` }]
    },
    twitter: { card: 'summary_large_image', title, description, images: [{ url: imageUrl, alt: `${name} ${y} season` }] },
    robots: { index: hasMatches, follow: true },
  } as Metadata;
}

export default async function SeasonYearPage({ params, searchParams }: any) {

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  let id: any = resolvedParams?.id;
  let year: any = resolvedParams?.year;

  if (!id) {
    try {
      const h = await headers();
      const hdrs: Record<string, string | undefined> = {};
      try { for (const [k, v] of h.entries()) hdrs[k] = v; } catch (e) { /* ignore */ }

      // If headers are present, this was likely an actual HTTP request — attempt to recover from Referer
      if (Object.keys(hdrs).length) {
        try {
          // Try to parse the referer path to derive missing id/year when possible
          const ref = (hdrs['referer'] || hdrs['referrer'] || '') as string;
          if (ref) {
            try {
              const url = new URL(ref);
              const segs = url.pathname.split('/').filter(Boolean);
              if (segs[0] === 'players' && segs[1]) {
                id = id || segs[1];
                if (!year && segs[2] === 'season') year = year || segs[3];
              }
            } catch (e) { /* ignore referer parse errors */ }
          }

          await fetch(new URL('/api/debug/season-missing', 'http://localhost:3000').toString(), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ where: 'SeasonYearPage.missingId', params: resolvedParams, searchParams: resolvedSearchParams, headers: hdrs, derived: { id, year }, stack: (new Error().stack || '').split('\n').slice(0,10) }),
            keepalive: true,
          }).catch(() => {});
        } catch (e) {}

      } else {
        // No headers -> likely internal render (static/SSR). Avoid noisy logs; return notFound()
        const { notFound } = await import('next/navigation');
        notFound();
        return null;
      }
    } catch (e) {
      try {
        const safeSerialize = (v: any) => {
          try {
            if (v == null) return null;
            if (typeof v === 'object') return JSON.parse(JSON.stringify(v, (_k, val) => (typeof val === 'bigint' ? String(val) : val)));
            return v;
          } catch (err) {
            return String(v);
          }
        };
      } catch (e2) {}
    }

    if (!id) return <div className="text-red-500 font-bold">Player not found</div>;
  }

  // Render an H1 heading and forward to the existing PlayerTabPage server component.
  // Fetch player display name for the heading
  let player: any = null;
  try {
    const isSlug = !/^\d+$/.test(String(id));
    if (isSlug) {
      player = await prisma.player.findUnique({ where: { slug: String(id).toLowerCase() }, select: { id: true, atpname: true, player: true, slug: true } });
    } else {
      player = await prisma.player.findUnique({ where: { id: String(id) }, select: { id: true, atpname: true, player: true, slug: true } });
    }
  } catch (e) {
    // ignore player fetch errors
  }
  const displayName = player ? (player.atpname || player.player) : String(id);
  const heading = `${displayName} ${String(year)} ATP Season – Match Results & Stats`;
  const canonical = `https://stats.tennismylife.org/players/${encodeURIComponent(player?.slug || String(id))}/season/${encodeURIComponent(String(year))}`;

  // Compute season stats for the paragraph summary
  let totalMatches = 0;
  let wins = 0;
  let losses = 0;
  let hardMatches = 0, clayMatches = 0, grassMatches = 0;
  let hardWins = 0, clayWins = 0, grassWins = 0;
  let titles: string[] = [];
  try {
    const yNum = Number(year);
    totalMatches = await prisma.match.count({ where: { year: yNum, status: true, OR: [{ winner_id: player.id }, { loser_id: player.id }] } });
    wins = await prisma.match.count({ where: { year: yNum, status: true, winner_id: player.id } });
    losses = totalMatches - wins;

    hardMatches = await prisma.match.count({ where: { year: yNum, status: true, OR: [{ winner_id: player.id }, { loser_id: player.id }], surface: { contains: 'Hard', mode: 'insensitive' } } });
    clayMatches = await prisma.match.count({ where: { year: yNum, status: true, OR: [{ winner_id: player.id }, { loser_id: player.id }], surface: { contains: 'Clay', mode: 'insensitive' } } });
    grassMatches = await prisma.match.count({ where: { year: yNum, status: true, OR: [{ winner_id: player.id }, { loser_id: player.id }], surface: { contains: 'Grass', mode: 'insensitive' } } });

    hardWins = await prisma.match.count({ where: { year: yNum, status: true, winner_id: player.id, surface: { contains: 'Hard', mode: 'insensitive' } } });
    clayWins = await prisma.match.count({ where: { year: yNum, status: true, winner_id: player.id, surface: { contains: 'Clay', mode: 'insensitive' } } });
    grassWins = await prisma.match.count({ where: { year: yNum, status: true, winner_id: player.id, surface: { contains: 'Grass', mode: 'insensitive' } } });

    // derive titles (tournaments won in finals)
    try {
      const finals = await prisma.match.findMany({ where: { year: yNum, status: true, winner_id: player.id, round: 'F' }, select: { tourney_name: true } });
      const rawTitles = (finals || []).map((f: any) => {
        if (!f || !f.tourney_name) return null;
        if (typeof f.tourney_name === 'string') return f.tourney_name;
        if (typeof f.tourney_name === 'object') return f.tourney_name.en || Object.values(f.tourney_name)[0] || null;
        return String(f.tourney_name);
      }).filter(Boolean);
      titles = Array.from(new Set(rawTitles));
    } catch (e) {
      titles = [];
    }
  } catch (e) {
    // ignore DB errors and fall back to zeros
  }

  const pct = (w: number, m: number) => (m ? `${((w / m) * 100).toFixed(1)}%` : '0%');
  const hardPct = pct(hardWins, hardMatches);
  const clayPct = pct(clayWins, clayMatches);
  const grassPct = pct(grassWins, grassMatches);
  const overallPct = pct(wins, totalMatches);

  // Extended stats for rich narrative box
  let slamWins = 0, slamLosses = 0;
  let mastersWins = 0, mastersLosses = 0;
  let top10Wins = 0, top10Losses = 0;
  let finalsReached = 0, sfReached = 0, qfReached = 0;
  let finalsWon = 0;
  let winStreak = 0;
  try {
    const yNum2 = Number(year);
    [slamWins, slamLosses, mastersWins, mastersLosses, top10Wins, top10Losses, finalsReached, sfReached, qfReached] = await Promise.all([
      prisma.match.count({ where: { year: yNum2, status: true, winner_id: player.id, tourney_level: 'G' } }),
      prisma.match.count({ where: { year: yNum2, status: true, loser_id: player.id, tourney_level: 'G' } }),
      prisma.match.count({ where: { year: yNum2, status: true, winner_id: player.id, tourney_level: 'M' } }),
      prisma.match.count({ where: { year: yNum2, status: true, loser_id: player.id, tourney_level: 'M' } }),
      prisma.match.count({ where: { year: yNum2, status: true, winner_id: player.id, loser_rank: { lte: 10 } } }),
      prisma.match.count({ where: { year: yNum2, status: true, loser_id: player.id, winner_rank: { lte: 10 } } }),
      prisma.match.count({ where: { year: yNum2, status: true, OR: [{ winner_id: player.id }, { loser_id: player.id }], round: 'F' } }),
      prisma.match.count({ where: { year: yNum2, status: true, OR: [{ winner_id: player.id }, { loser_id: player.id }], round: 'SF' } }),
      prisma.match.count({ where: { year: yNum2, status: true, OR: [{ winner_id: player.id }, { loser_id: player.id }], round: 'QF' } }),
    ]);
    finalsWon = titles.length;
    // compute win streak in this season
    try {
      const seasonMatches = await prisma.match.findMany({
        where: { year: yNum2, status: true, OR: [{ winner_id: player.id }, { loser_id: player.id }] },
        orderBy: [{ tourney_date: 'asc' }, { match_num: 'asc' }],
        select: { winner_id: true, tourney_date: true, match_num: true },
      });
      let cur = 0, best = 0;
      for (const m of seasonMatches) {
        if (m.winner_id === player.id) { cur++; if (cur > best) best = cur; } else cur = 0;
      }
      winStreak = best;
    } catch (e) { winStreak = 0; }
  } catch (e) {
    // ignore
  }

  // Build narrative paragraphs
  const narrativeParagraphs: React.ReactNode[] = [];

  // Para 1 – overall record
  {
    const titleClause = titles.length > 0
      ? <>{' '}Throughout the {String(year)} season, {displayName} claimed{' '}
          <strong className="text-yellow-400">{titles.length}</strong> title{titles.length !== 1 ? 's' : ''}: {titles.join(', ')}.</>
      : <>{' '}{displayName} did not win a title during the {String(year)} season.</>;
    narrativeParagraphs.push(
      <p key="overall">
        In the <strong className="text-white">{String(year)} ATP season</strong>, {displayName} compiled a record of{' '}
        <strong className="text-green-400">{wins}</strong>–<strong className="text-red-400">{losses}</strong>{' '}
        across <strong className="text-yellow-400">{totalMatches}</strong> matches, translating to a win rate of{' '}
        <strong className="text-yellow-400">{overallPct}</strong>.{titleClause}
      </p>
    );
  }

  // Para 2 – surface breakdown
  {
    const parts: React.ReactNode[] = [];
    if (hardMatches > 0) parts.push(
      <span key="hard">hard courts (<strong className="text-green-400">{hardWins}</strong>–<strong className="text-red-400">{hardMatches - hardWins}</strong>, <strong className="text-yellow-400">{hardPct}</strong>)</span>
    );
    if (clayMatches > 0) parts.push(
      <span key="clay">clay courts (<strong className="text-green-400">{clayWins}</strong>–<strong className="text-red-400">{clayMatches - clayWins}</strong>, <strong className="text-yellow-400">{clayPct}</strong>)</span>
    );
    if (grassMatches > 0) parts.push(
      <span key="grass">grass courts (<strong className="text-green-400">{grassWins}</strong>–<strong className="text-red-400">{grassMatches - grassWins}</strong>, <strong className="text-yellow-400">{grassPct}</strong>)</span>
    );
    if (parts.length > 0) {
      const joined = parts.reduce<React.ReactNode[]>((acc, el, i) => {
        if (i === 0) return [el];
        if (i === parts.length - 1) return [...acc, ' and ', el];
        return [...acc, ', ', el];
      }, []);
      narrativeParagraphs.push(
        <p key="surface">
          Breaking down by surface, {displayName} played on {joined}.
        </p>
      );
    }
  }

  // Para 3 – Grand Slams
  if ((slamWins + slamLosses) > 0) {
    narrativeParagraphs.push(
      <p key="slams">
        At the <strong className="text-white">Grand Slam</strong> level, {displayName} went{' '}
        <strong className="text-green-400">{slamWins}</strong>–<strong className="text-red-400">{slamLosses}</strong>{' '}
        (<strong className="text-yellow-400">{pct(slamWins, slamWins + slamLosses)}</strong>) across{' '}
        <strong className="text-yellow-400">{slamWins + slamLosses}</strong> matches.
        {' '}The best-of-five format adds an extra layer of physical and mental endurance, making these results particularly significant.
      </p>
    );
  }

  // Para 4 – Masters 1000
  if ((mastersWins + mastersLosses) > 0) {
    narrativeParagraphs.push(
      <p key="masters">
        In <strong className="text-white">ATP Masters 1000</strong> events, {displayName} posted a record of{' '}
        <strong className="text-green-400">{mastersWins}</strong>–<strong className="text-red-400">{mastersLosses}</strong>{' '}
        (<strong className="text-yellow-400">{pct(mastersWins, mastersWins + mastersLosses)}</strong>),
        demonstrating {mastersWins > mastersLosses ? 'elite consistency at the highest level of the Tour' : "competitive play against the Tour\u2019s best"}.
      </p>
    );
  }

  // Para 5 – deep runs
  if (finalsReached > 0 || sfReached > 0 || qfReached > 0) {
    narrativeParagraphs.push(
      <p key="deep">
        When it comes to deep runs in tournaments,{' '}
        {finalsReached > 0 && (
          <>{displayName} reached <strong className="text-yellow-400">{finalsReached}</strong> final{finalsReached !== 1 ? 's' : ''} during the {String(year)} season,
          winning <strong className="text-green-400">{finalsWon}</strong> and losing <strong className="text-red-400">{finalsReached - finalsWon}</strong>.{' '}</>
        )}
        {sfReached > 0 && (
          <>Semifinal appearances total <strong className="text-yellow-400">{sfReached}</strong>,{' '}</>
        )}
        {qfReached > 0 && (
          <>and quarterfinal appearances <strong className="text-yellow-400">{qfReached}</strong>.{' '}</>
        )}
        These figures highlight the ability to consistently advance through the draw.
      </p>
    );
  }

  // Para 6 – vs Top 10
  if ((top10Wins + top10Losses) > 0) {
    narrativeParagraphs.push(
      <p key="top10">
        Against players ranked in the <strong className="text-white">ATP Top 10</strong>, {displayName}&apos;s record in {String(year)} stands at{' '}
        <strong className="text-green-400">{top10Wins}</strong>–<strong className="text-red-400">{top10Losses}</strong>{' '}
        (<strong className="text-yellow-400">{pct(top10Wins, top10Wins + top10Losses)}</strong>).
        {top10Wins > top10Losses
          ? ' This positive record against elite opponents is a testament to the ability to raise the level of play in the biggest matches.'
          : ' Facing the world\u2019s best, every result carries extra weight.'}
      </p>
    );
  }

  // Para 7 – win streak
  if (winStreak >= 3) {
    narrativeParagraphs.push(
      <p key="streak">
        {displayName} demonstrated the ability to string together victories, recording a best winning streak of{' '}
        <strong className="text-yellow-400">{winStreak}</strong> consecutive matches during the {String(year)} season.
      </p>
    );
  }

  const seasonPreviewNode = (
    <div className="rounded-xl bg-[#1e2a38] border border-yellow-400/30 p-5 mb-6 text-sm text-gray-200 space-y-3">
      <h3 className="text-lg font-semibold text-center mb-3" style={{ color: '#facc15' }}>
        {String(year)} Season Stats Overview
      </h3>
      {narrativeParagraphs}
    </div>
  );

  return (
    <>
      <h1 className="text-3xl font-bold mb-6 text-center">{heading}</h1>

      {/* Structured JSON-LD for season stats (safe for search engines) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SportsSeason",
        "name": `${displayName} ${String(year)} Season`,
        "season": String(year),
        "athlete": { "@type": "Person", "name": displayName },
        "statistics": [
          { "@type": "PropertyValue", "name": "matchesPlayed", "value": totalMatches },
          { "@type": "PropertyValue", "name": "wins", "value": wins },
          { "@type": "PropertyValue", "name": "losses", "value": losses },
          { "@type": "PropertyValue", "name": "winPercentage", "value": overallPct },
          { "@type": "PropertyValue", "name": "hardWins", "value": hardWins },
          { "@type": "PropertyValue", "name": "hardWinPct", "value": hardPct },
          { "@type": "PropertyValue", "name": "clayWins", "value": clayWins },
          { "@type": "PropertyValue", "name": "clayWinPct", "value": clayPct },
          { "@type": "PropertyValue", "name": "grassWins", "value": grassWins },
          { "@type": "PropertyValue", "name": "grassWinPct", "value": grassPct }
        ],
        "award": (typeof titles !== 'undefined' && Array.isArray(titles) ? titles : [])
      }) }} />

      {/* BreadcrumbList including season year and matches link */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Players", "item": "https://stats.tennismylife.org/players" },
          { "@type": "ListItem", "position": 2, "name": displayName, "item": `https://stats.tennismylife.org/players/${player?.slug || String(id)}` },
          { "@type": "ListItem", "position": 3, "name": "Season", "item": `https://stats.tennismylife.org/players/${player?.slug || String(id)}/season` },
          { "@type": "ListItem", "position": 4, "name": "Matches", "item": `https://stats.tennismylife.org/players/${player?.slug || String(id)}/matches?year=${String(year)}` },
          { "@type": "ListItem", "position": 5, "name": String(year), "item": canonical }
        ]
      }) }} />

      {/* FAQPage JSON-LD (Rich Snippets) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": `What are ${displayName}\u2019s ${year} season stats?`,
            "acceptedAnswer": { "@type": "Answer", "text": `${displayName}\u2019s ${year} season stats include total wins, losses, titles, surface performance, and full ATP match results from the ${year} tennis season.` }
          },
          {
            "@type": "Question",
            "name": `How many titles did ${displayName} win in the ${year} season?`,
            "acceptedAnswer": { "@type": "Answer", "text": `In ${year}, ${displayName} won ${titles.length} title${titles.length !== 1 ? 's' : ''} in official ATP events${titles.length ? (': ' + titles.join(', ')) : '.'}` }
          },
          {
            "@type": "Question",
            "name": "Does this season include Grand Slam matches?",
            "acceptedAnswer": { "@type": "Answer", "text": `Yes. ${displayName}\u2019s ${year} season stats include Grand Slam matches from the Australian Open, Roland Garros, Wimbledon, and the US Open.` }
          },
          {
            "@type": "Question",
            "name": `What surfaces are included in ${displayName}\u2019s ${year} season record?`,
            "acceptedAnswer": { "@type": "Answer", "text": `The season record is broken down by hard courts, clay courts, and grass courts, showing win percentages for each surface in ${year}.` }
          },
          {
            "@type": "Question",
            "name": "How is win percentage calculated?",
            "acceptedAnswer": { "@type": "Answer", "text": "Win percentage is calculated as: (Total Wins ÷ Total Matches Played) × 100. It measures how successful a player was during the season." }
          },
          {
            "@type": "Question",
            "name": "Are Davis Cup matches included in these stats?",
            "acceptedAnswer": { "@type": "Answer", "text": "No. This season page focuses on official ATP Tour and Grand Slam matches, excluding Davis Cup and exhibition events." }
          }
        ]
      }) }} />

      <PlayerTabPage params={Promise.resolve({ id, tab: 'season' })} searchParams={Promise.resolve({ year: String(year) })} _surfacePreviewNode={seasonPreviewNode} />
    </>
  );
}
