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

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params, searchParams }: { params?: Promise<{ slug?: string | string[] }>, searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params ?? {});
  const slugParam = (resolvedParams as any)?.slug;
  const slug = Array.isArray(slugParam) ? slugParam : (slugParam ? [slugParam] : []);
  const tabRaw = String(slug[0] ?? 'count');
  const subRaw = slug[1] ? String(slug[1]) : null;
  const tab = tabRaw.toLowerCase();
  const sub = subRaw ? subRaw.toLowerCase() : null;

  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const rank = Number((sp.rank as string) ?? 1);
  const top = Number((sp.top as string) ?? 2);

  let title = 'Records Ranking | ATP Ranking Records';
  switch (tab) {
    case 'count': title = `Weeks at No. ${rank} | ATP Ranking Records`; break;
    case 'top': title = `Weeks at Top ${top} | ATP Ranking Records`; break;
    case 'streak': title = sub === 'top' ? `Consecutive Weeks at Top ${top} | ATP Ranking Records` : `Consecutive Weeks at No. ${rank} | ATP Ranking Records`; break;
    case 'endoftheseason':
      if (sub === 'streakcount') title = `Consecutive Seasons at Year-End No. ${rank} | ATP Ranking Records`;
      else if (sub === 'streaktop') title = `Consecutive Seasons at Year-End Top ${top} | ATP Ranking Records`;
      else title = sub === 'top' ? `Seasons at Year-End Top ${top} | ATP Ranking Records` : `Seasons at Year-End No. ${rank} | ATP Ranking Records`; 
      break;
    case 'ages':
      if (sub === 'youngesttop') title = `Youngest Players at Top ${top} | ATP Ranking Records`;
      else if (sub === 'oldesttop') title = `Oldest Players at Top ${top} | ATP Ranking Records`;
      else if (sub === 'youngestcount') title = `Youngest Players to Reach No. ${rank} | ATP Ranking Records`;
      else title = `Oldest Players to Reach No. ${rank} | ATP Ranking Records`; 
      break;
    case 'agesendoftheseason':
      if (sub === 'youngesttop') title = `Youngest Players to Finish Year-End in the Top ${top} | ATP Ranking Records`;
      else if (sub === 'oldesttop') title = `Oldest Players to Finish Year-End in the Top ${top} | ATP Ranking Records`;
      else if (sub === 'youngestcount') title = `Youngest Players at Year-End No. ${rank} | ATP Ranking Records`;
      else title = `Oldest Players at Year-End No. ${rank} | ATP Ranking Records`; 
      break;
    case 'timespan':
      if (sub === 'top') title = `Timespan between first and last time ranked at Top ${top} | ATP Ranking Records`;
      else title = `Timespan between first and last time ranked No. ${rank} | ATP Ranking Records`; 
      break;
    case 'timespanendoftheseason':
      if (sub === 'top') title = `Timespan between first and last time ranked at Year-End Top ${top} | ATP Ranking Records`;
      else title = `Timespan between first and last time ranked at Year-End No. ${rank} | ATP Ranking Records`; 
      break;
    case 'mostpoints': title = (sub === 'endoftheseason' || (sp.subtab as string) === 'EndOfTheSeason') ? 'Most ATP Points at the End of The Season | ATP Ranking Records' : 'Most ATP Points | ATP Ranking Records'; break;
    case 'diffpoints': title = (sub === 'endoftheseason' || (sp.subtab as string) === 'EndOfTheSeason') ? 'Maximum Difference Between No. 1 and No. 2 at the End of The Season | ATP Ranking Records' : 'Maximum Difference Between No. 1 and No. 2 | ATP Ranking Records'; break; 
    default: title = 'Records Ranking — TML';
  }

  return { title };
}

export default async function RecordsRankingSlugPage({
  params,
  searchParams,
}: {
  // Next (v15+) provides these as Promises.
  params?: Promise<{ slug?: string | string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await Promise.resolve(params ?? {});
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;

  // Next should provide catch-all params as `string[]`, but in some environments
  // (custom server / edge cases) it can surface as a single `string`.
  const slugParam = (resolvedParams as any)?.slug;
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

  // NOTE: The tab implementations live in other route modules (page.tsx files).
  // In production, rendering those modules as JSX can occasionally lead to
  // unexpected reuse of the same module output. Calling them as async functions
  // (and awaiting) is deterministic and also allows us to pass `searchParams`.
  // We default to telling sub-pages not to render their own H1 (the parent
  // component will render a single H1 above the tabs).
  const render = async (Comp: any, extraProps?: Record<string, any>) => {
    if (!Comp) return null;
    return await Comp({ searchParams: resolvedSearchParams, showHeading: false, ...(extraProps ?? {}) });
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

  // compute a canonical heading (same text used in metadata but without site suffix)
  const heading = (() => {
    const sp = resolvedSearchParams ?? {} as Record<string, string | string[]>;
    const rank = Number((sp.rank as string) ?? 1);
    const top = Number((sp.top as string) ?? 2);
    switch (tabSeg) {
      case 'count': return `Weeks at No. ${rank}`;
      case 'top': return `Weeks at Top ${top}`;
      case 'streak': return subSeg === 'top' ? `Consecutive Weeks at Top ${top}` : `Consecutive Weeks at No. ${rank}`;
      case 'endoftheseason':
        if (subSeg === 'streakcount') return `Consecutive Seasons at Year-End No. ${rank}`;
        if (subSeg === 'streaktop') return `Consecutive Seasons at Year-End Top ${top}`;
        return subSeg === 'top' ? `Seasons at Year-End Top ${top}` : `Seasons at Year-End No. ${rank}`;
      case 'ages':
        if (subSeg === 'youngesttop') return `Youngest Players at Top ${top}`;
        if (subSeg === 'oldesttop') return `Oldest Players at Top ${top}`;
        if (subSeg === 'youngestcount') return `Youngest Players to Reach No. ${rank}`;
        return `Oldest Players to Reach No. ${rank}`;
      case 'agesendoftheseason':
        if (subSeg === 'youngesttop') return `Youngest Players to Finish Year-End in the Top ${top}`;
        if (subSeg === 'oldesttop') return `Oldest Players to Finish Year-End in the Top ${top}`;
        if (subSeg === 'youngestcount') return `Youngest Players at Year-End No. ${rank}`;
        return `Oldest Players at Year-End No. ${rank}`;
      case 'timespan':
        if (subSeg === 'top') return `Timespan between first and last time ranked at Top ${top}`;
        return `Timespan between first and last time ranked No. ${rank}`;
      case 'timespanendoftheseason':
        if (subSeg === 'top') return `Timespan between first and last time ranked at Year-End Top ${top}`;
        return `Timespan between first and last time ranked at Year-End No. ${rank}`;
      case 'mostpoints': return (subSeg === 'endoftheseason' || (resolvedSearchParams as any).subtab === 'EndOfTheSeason') ? 'Most ATP Points at the End of The Season' : 'Most ATP Points';
      case 'diffpoints': return (subSeg === 'endoftheseason' || (resolvedSearchParams as any).subtab === 'EndOfTheSeason') ? 'Maximum Difference Between No. 1 and No. 2 at the End of The Season' : 'Maximum Difference Between No. 1 and No. 2';
      default: return 'Records Ranking';
    }
  })();

  return (
    <main>
      <h1 className="mb-8 text-3xl font-bold text-center text-gray-100">{heading}</h1>
      <RecordsRankingClient currentTabSeg={tabSeg} currentSubSeg={subSeg} />
      {process.env.RANKING_DEBUG === '1' ? (
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
      ) : null}
      <div className="mt-6 w-full">{content}</div>
    </main>
  );
}
