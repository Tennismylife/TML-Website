import React from 'react';
import RecordsRankingClient from '../RecordsRankingClient';

import Count from "../Count/page";
import Top from "../Top/page";
import StreakCount from "../Streak/Count/page";
import StreakTop from "../Streak/Top/page";
import EndSeasonCount from "../EndOfTheSeason/Count/page";
import EndSeasonTop from "../EndOfTheSeason/Top/page";
import EndSeasonStreakCount from "../EndOfTheSeason/StreakCount/page";
import EndSeasonStreakTop from "../EndOfTheSeason/StreakTop/page";
import AgesYoungestCount from "../Ages/YoungestCount/page";
import AgesYoungestTop from "../Ages/YoungestTop/page";
import AgesOldestCount from "../Ages/OldestCount/page";
import AgesOldestTop from "../Ages/OldestTop/page";
import AgesEoyYoungestCount from "../AgesEndOfTheSeason/YoungestCount/page";
import AgesEoyYoungestTop from "../AgesEndOfTheSeason/YoungestTop/page";
import AgesEoyOldestCount from "../AgesEndOfTheSeason/OldestCount/page";
import AgesEoyOldestTop from "../AgesEndOfTheSeason/OldestTop/page";
import TimespanCount from "../Timespan/TimespanCount/page";
import TimespanTop from "../Timespan/TimespanTop/page";
import MostPoints from "../MostPoints/page";
import DiffPointsOverall from "../DiffPoints/Overall/page";
import DiffPointsEoy from "../DiffPoints/EndOfTheSeason/page";
import TimespanEoyCount from "../TimespanEndOfTheSeason/TimespanCountEndOfTheSeason/page";
import TimespanEoyTop from "../TimespanEndOfTheSeason/TimespanTopEndOfTheSeason/page";

export const dynamic = 'force-dynamic';

export default async function RecordsRankingSlugPage({
  params,
  searchParams,
}: {
  params?: { slug?: string | string[] };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  // Next should provide catch-all params as `string[]`, but in some environments
  // (custom server / edge cases) it can surface as a single `string`.
  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam) ? slugParam : (slugParam ? [slugParam] : []);

  const tabSegRaw = slug[0] ?? 'count';
  const subSegRaw = slug[1] ?? null;

  // Normalization helper for comparing segments in a case-insensitive, punctuation-agnostic way
  const normalizeSeg = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // normalized segments used for routing logic
  const tabSeg = normalizeSeg(tabSegRaw);
  const subSeg = subSegRaw ? normalizeSeg(subSegRaw) : null;

  // Debug: log incoming params when RANKING_DEBUG=1
  if (process.env.RANKING_DEBUG === '1') {
    // Avoid logging PII; only log structure
    console.debug('[records-ranking] params', { slug, tabSegRaw, subSegRaw, tabSeg, subSeg });
  }

  const resolvedSearchParams = searchParams ?? {};

  // NOTE: The tab implementations live in other route modules (page.tsx files).
  // In production, rendering those modules as JSX can occasionally lead to
  // unexpected reuse of the same module output. Calling them as async functions
  // (and awaiting) is deterministic and also allows us to pass `searchParams`.
  const render = async (Comp: any, extraProps?: Record<string, any>) => {
    if (!Comp) return null;
    return await Comp({ searchParams: resolvedSearchParams, ...(extraProps ?? {}) });
  };

  // map segment to server component
  let content: React.ReactNode = null;
  switch (tabSeg) {
    case 'count':
      content = await render(Count);
      break;
    case 'top':
      content = await render(Top);
      break;
    case 'streak':
      if (subSeg === 'top') content = await render(StreakTop);
      else content = await render(StreakCount);
      break;
    case 'endoftheseason':
      if (subSeg === 'top') content = await render(EndSeasonTop);
      else if (subSeg === 'streaktop') content = await render(EndSeasonStreakTop);
      else if (subSeg === 'streakcount') content = await render(EndSeasonStreakCount);
      else content = await render(EndSeasonCount);
      break;
    case 'ages':
      if (subSeg === 'youngesttop') content = await render(AgesYoungestTop);
      if (subSeg === 'oldesttop') content = await render(AgesOldestTop);
      if (subSeg === 'youngestcount') content = await render(AgesYoungestCount);
      if (subSeg === 'oldestcount') content = await render(AgesOldestCount);
      break;
    case 'agesendoftheseason':
      if (subSeg === 'youngesttop') content = await render(AgesEoyYoungestTop);
      if (subSeg === 'oldesttop') content = await render(AgesEoyOldestTop);
      if (subSeg === 'youngestcount') content = await render(AgesEoyYoungestCount);
      if (subSeg === 'oldestcount') content = await render(AgesEoyOldestCount);
      break;
    case 'timespan':
      if (subSeg === 'top') content = await render(TimespanTop);
      else content = await render(TimespanCount);
      break;
    case 'timespanendoftheseason':
      if (subSeg === 'top') content = await render(TimespanEoyTop);
      else content = await render(TimespanEoyCount);
      break;
    case 'mostpoints':
      // When we navigate via path (/mostpoints/<sub>), the sub segment is in subSeg.
      // MostPoints expects a query param `subtab` with values like 'Overall' or 'EndOfTheSeason'.
      const mostPointsSearchParams = { ...(resolvedSearchParams ?? {}), ...(subSeg ? { subtab: (subSeg === 'overall' ? 'Overall' : (subSeg === 'endoftheseason' ? 'EndOfTheSeason' : subSeg)) } : {}) };
      content = await render(MostPoints, { searchParams: mostPointsSearchParams });
      break;
    case 'diffpoints':
      // Map path segment to DiffPoints subtab names and pass via searchParams
      const diffPointsSearchParams = { ...(resolvedSearchParams ?? {}), ...(subSeg ? { subtab: (subSeg === 'overall' ? 'Overall' : (subSeg === 'endoftheseason' ? 'EndOfTheSeason' : subSeg)) } : {}) };
      if ((subSeg ?? '') === 'endoftheseason') content = await render(DiffPointsEoy, { searchParams: diffPointsSearchParams }); else content = await render(DiffPointsOverall, { searchParams: diffPointsSearchParams });
      break;
    default:
      content = await render(Count);
  }

  return (
    <main>
      <RecordsRankingClient currentTabSeg={tabSeg} currentSubSeg={subSeg} />
      <div
        id="rr-debug"
        aria-hidden="true"
        style={{ display: 'none' }}
        data-rr-slug-param={String(slugParam ?? '')}
        data-rr-slug-is-array={Array.isArray(slugParam) ? '1' : '0'}
        data-rr-tab-raw={String(tabSegRaw)}
        data-rr-tab={String(tabSeg)}
        data-rr-sub={String(subSeg ?? '')}
      />
      <div className="mt-6 w-full">{content}</div>
    </main>
  );
}
