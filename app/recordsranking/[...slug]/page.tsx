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

export default async function RecordsRankingSlugPage(props: any) {
  // Next can pass `props` as a Promise for dynamic route params; await it before accessing `params`.
  const { params, searchParams } = (await props) as { params?: { slug?: string[] }, searchParams?: Record<string, string | string[]> };
  const slug = params?.slug ?? [];
  const tabSeg = slug[0] ?? 'count';
  const subSeg = slug[1] ?? null;

  // Normalization helper for comparing segments in a case-insensitive, punctuation-agnostic way
  const normalizeSeg = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Debug: log incoming params when RANKING_DEBUG=1
  if (process.env.RANKING_DEBUG === '1') {
    // Avoid logging PII; only log structure
    console.debug('[records-ranking] params', { slug, tabSeg, subSeg });
  }

  // Ensure searchParams is awaited (avoid sync dynamic API usage)
  const resolvedSearchParams = await (searchParams as unknown as Promise<Record<string, string | string[]>>);

  // map segment to server component
  let content: React.ReactNode = null;
  switch (tabSeg) {
    case 'count':
      content = <Count />;
      break;
    case 'top':
      content = <Top />;
      break;
    case 'streak':
      if (subSeg === 'top') content = <StreakTop />;
      else content = <StreakCount />;
      break;
    case 'endoftheseason':
      if (subSeg === 'top') content = <EndSeasonTop />;
      else if (subSeg === 'streaktop') content = <EndSeasonStreakTop />;
      else if (subSeg === 'streakcount') content = <EndSeasonStreakCount />;
      else content = <EndSeasonCount />;
      break;
    case 'ages':
      if (subSeg === 'youngesttop') content = <AgesYoungestTop />;
      if (subSeg === 'oldesttop') content = <AgesOldestTop />;
      if (subSeg === 'youngestcount') content = <AgesYoungestCount />;
      if (subSeg === 'oldestcount') content = <AgesOldestCount />;
      break;
    case 'agesendoftheseason':
      if (subSeg === 'youngesttop') content = <AgesEoyYoungestTop />;
      if (subSeg === 'oldesttop') content = <AgesEoyOldestTop />;
      if (subSeg === 'youngestcount') content = <AgesEoyYoungestCount />;
      if (subSeg === 'oldestcount') content = <AgesEoyOldestCount />;
      break;
    case 'timespan':
      if (subSeg === 'top') content = <TimespanTop />;
      else content = <TimespanCount />;
      break;
    case 'timespanendoftheseason':
      if (subSeg === 'top') content = <TimespanEoyTop />;
      else content = <TimespanEoyCount />;
      break;
    case 'mostpoints':
      // When we navigate via path (/mostpoints/<sub>), the sub segment is in subSeg.
      // MostPoints expects a query param `subtab` with values like 'Overall' or 'EndOfTheSeason'.
      const mostPointsSearchParams = { ...(resolvedSearchParams ?? {}), ...(subSeg ? { subtab: (subSeg === 'overall' ? 'Overall' : (subSeg === 'endoftheseason' ? 'EndOfTheSeason' : subSeg)) } : {}) };
      content = <MostPoints searchParams={mostPointsSearchParams} />;
      break;
    case 'diffpoints':
      // Map path segment to DiffPoints subtab names and pass via searchParams
      const diffPointsSearchParams = { ...(resolvedSearchParams ?? {}), ...(subSeg ? { subtab: (subSeg === 'overall' ? 'Overall' : (subSeg === 'endoftheseason' ? 'EndOfTheSeason' : subSeg)) } : {}) };
      if ((subSeg ?? '') === 'endoftheseason') content = <DiffPointsEoy searchParams={diffPointsSearchParams} />; else content = <DiffPointsOverall searchParams={diffPointsSearchParams} />;
      break;
    default:
      content = <Count />;
  }

  return (
    <main>
      <RecordsRankingClient currentTabSeg={tabSeg} currentSubSeg={subSeg} />
      <div className="mt-6 w-full">{content}</div>
    </main>
  );
}
