import React from 'react';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import Flag from '@/components/Flag';
import DropdownNavSelect from '@/components/DropdownNavSelect';
import ServerPagination from '@/components/ServerPagination';
import { notFound } from 'next/navigation';

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const top = Number((Array.isArray(sp.top) ? sp.top[0] : sp.top) ?? 2);
  const page = Number((sp.page as string) ?? '1');
  const SITE = 'https://stats.tennismylife.org';
  const OG_IMAGE = `${SITE}/og/site-preview.png`;
  const title = `Longest Consecutive Weeks in ATP Top ${top} – All-Time`;
  const description = `Which players stayed inside the ATP Top ${top} for the most consecutive weeks? Complete all-time streak records.`;
  const canonical = `${SITE}/recordsranking/streak/consecutiveweeksattop/${top}`;
  return {
    title,
    description,
    keywords: [`consecutive weeks ATP Top ${top}`, 'ATP streak Top 10', 'longest streak Top 10', 'consecutive weeks Top 10', 'ATP history', 'tennis records'],
    alternates: { canonical },
    openGraph: { type: 'website', url: canonical, siteName: 'TennisMyLife', title, description, images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', site: '@TennisMyLife68', creator: '@TennisMyLife68', title, description, images: [OG_IMAGE] },
    robots: page > 1 ? { index: false, follow: true } : { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
    authors: [{ name: 'TennisMyLife' }],
  };
}

function formatDate(d: Date) { return d.toISOString().slice(0,10); }

export default async function StreakTop({ searchParams }: { searchParams?: Promise<Record<string,string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const top = Number((sp.top as string) ?? 2);
  const perPage = 20;
  const page = Number((sp.page as string) ?? 1);
  if (!Number.isInteger(page) || page < 1) notFound();

  // Compute consecutive ranking streaks in PostgreSQL; never materialize the full ranking history in Node.
  type StreakRow = {
    id: string;
    name: string;
    ioc: string | null;
    weeks: bigint;
    start_date: Date;
    end_date: Date;
  };

  const streakRows = await prisma.$queryRaw<StreakRow[]>(Prisma.sql`
    WITH filtered AS (
      SELECT
        r."playerId" AS player_id,
        r."rankingDateId" AS ranking_date_id,
        rd.date,
        r."rankingDateId" - (ROW_NUMBER() OVER (PARTITION BY r."playerId" ORDER BY r."rankingDateId"))::integer AS grp
      FROM "Ranking" r
      JOIN "RankingDate" rd ON rd.id = r."rankingDateId"
      WHERE r.rank <= ${top}
    ), streaks AS (
      SELECT player_id, grp, COUNT(*) AS weeks, MIN(date) AS start_date, MAX(date) AS end_date
      FROM filtered
      GROUP BY player_id, grp
    )
    SELECT
      s.player_id AS id,
      COALESCE(p.atpname, s.player_id) AS name,
      p.ioc,
      s.weeks,
      s.start_date,
      s.end_date
    FROM streaks s
    LEFT JOIN "Player" p ON p.id = s.player_id
    ORDER BY s.weeks DESC, s.end_date DESC, name ASC
    LIMIT 100
  `);

  const cappedResult = streakRows.map(r => ({
    id: String(r.id),
    name: r.name,
    ioc: r.ioc ?? undefined,
    weeks: Number(r.weeks),
    startDate: formatDate(r.start_date),
    endDate: formatDate(r.end_date),
  }));

  // Enrich with slugs for JSON-LD
  const slugIds = cappedResult.slice(0, 10).map(r => r.id).filter(Boolean) as string[];
  let slugMap = new Map<string, string | null>();
  if (slugIds.length > 0) {
    const slugRows = await prisma.player.findMany({ where: { id: { in: slugIds } }, select: { id: true, slug: true } });
    slugMap = new Map(slugRows.map(r => [r.id as string, r.slug as string | null]));
  }

  const totalPages = Math.ceil(cappedResult.length / perPage);
  if (cappedResult.length > 0 && page > totalPages) notFound();
  const start = (page - 1) * perPage;
  const pageRows = cappedResult.slice(start, start + perPage);

  return (
    <section className="mb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'ItemList',
        'url': `https://stats.tennismylife.org/recordsranking/streak/consecutiveweeksattop/${top}`,
        'inLanguage': 'en-US',
        'isPartOf': { '@type': 'WebSite', 'name': 'TennisMyLife', 'url': 'https://stats.tennismylife.org' },
        'dateModified': new Date().toISOString(),
        'name': `Longest Consecutive Weeks in ATP Top ${top} – All-Time`,
        'description': `Longest consecutive week streaks inside the ATP Top ${top} in history.`,
        'numberOfItems': Math.min(cappedResult.length, 10),
        'itemListElement': cappedResult.slice(0, 10).map((r, idx) => ({
          '@type': 'ListItem', 'position': idx + 1,
          'item': { '@type': 'SportsStatistic', 'name': r.name, ...(r.id && slugMap.get(String(r.id)) ? { 'url': `https://stats.tennismylife.org/players/${slugMap.get(String(r.id))}/ranking` } : {}), 'additionalProperty': [
            { '@type': 'PropertyValue', 'name': 'Consecutive Weeks', 'value': r.weeks },
            ...(r.startDate ? [{ '@type': 'PropertyValue', 'name': 'Start', 'value': r.startDate }] : []),
            ...(r.endDate ? [{ '@type': 'PropertyValue', 'name': 'End', 'value': r.endDate }] : []),
          ]},
        })),
      }) }} />
      <div className="flex items-center gap-4 mb-4">
        <label className="text-gray-200 font-medium">Top:</label>
        <DropdownNavSelect name="top" value={String(top)} options={[2,3,4,5,6,7,8,9,10,20,30,50,100].map(n => ({ value: String(n), label: `Top ${n}`}))} pathMode />
      </div>

      {/* Descriptive paragraph — page 1 only */}
      {page === 1 && cappedResult.length > 0 && (() => {
        const leader = cappedResult[0];
        const second = cappedResult[1];
        const third  = cappedResult[2];
        const withAtLeast4 = cappedResult.filter(p => p.weeks >= 4).length;
        return (
          <div className="mb-6 px-5 py-4 rounded-xl bg-gray-800/50 border border-white/10 text-gray-400 text-sm leading-relaxed max-w-3xl mx-auto">
            <p>
              The all-time record for consecutive weeks inside the ATP Top{' '}
              <span className="text-white font-medium">{top}</span> belongs to{' '}
              <span className="text-indigo-300 font-medium">{leader.name}</span>{' '}
              with <span className="text-white font-medium">{leader.weeks} consecutive week{leader.weeks !== 1 ? 's' : ''}</span>
              {leader.startDate && leader.endDate ? (
                <> (from{' '}
                  <span className="text-white font-medium">{leader.startDate}</span> to{' '}
                  <span className="text-white font-medium">{leader.endDate}</span>)
                </>
              ) : null}.
              {second ? (
                <> The second-longest streak is held by{' '}
                  <span className="text-indigo-300 font-medium">{second.name}</span>{' '}
                  ({second.weeks} weeks)
                  {third ? (
                    <>, followed by{' '}
                      <span className="text-indigo-300 font-medium">{third.name}</span>{' '}
                      ({third.weeks} weeks)
                    </>
                  ) : null}.
                </>
              ) : null}
              {withAtLeast4 > 0 && (
                <> A total of <span className="text-white font-medium">{withAtLeast4}</span>{' '}
                  player{withAtLeast4 !== 1 ? 's have' : ' has'} remained inside the Top {top} consecutively for at least one month.
                </>
              )}
            </p>
          </div>
        );
      })()}

      {pageRows.length === 0 ? (<div className="text-gray-400 py-4 text-center">No data available.</div>) : (
        <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
          <table className="min-w-full border-collapse">
            <caption className="py-2 text-sm font-semibold text-gray-400 uppercase tracking-wide">Record leaderboard</caption>
            <thead>
              <tr className="bg-black"><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Top</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Weeks</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Start</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">End</th></tr>
            </thead>
            <tbody>
              {pageRows.map((p, idx)=> (
                <tr key={`${p.id ?? p.name}-${start + idx}`} className="hover:bg-gray-800 border-b border-white/10"><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{start + idx + 1}</td><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200"><div className="flex items-center justify-center gap-2">{p.ioc && <Flag ioc={p.ioc} className="w-4 h-3" />}<span>{p.name}</span></div></td><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.weeks}</td><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.startDate}</td><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.endDate}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <ServerPagination page={page} totalPages={totalPages} getHref={(p) => (sp as any)._numericInPath === '1' ? `?page=${p}` : `?top=${top}&page=${p}`} />
      )} 
    </section>
  );
} 