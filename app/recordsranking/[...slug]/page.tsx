import React from 'react';
import Link from 'next/link';
import RecordsRankingClient from '../RecordsRankingClient';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params, searchParams }: { params?: Promise<{ slug?: string | string[] }>, searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params ?? {});
  const slugParam = (resolvedParams as any)?.slug;
  const slug = Array.isArray(slugParam) ? slugParam : (slugParam ? [slugParam] : []);
  const tabRaw = String(slug[0] ?? 'weeksatno');
  // Last slug segment is numeric → it is the rank/top value in the path
  const lastSlugSegMeta = String(slug[slug.length - 1] ?? '');
  const lastIsNumericMeta = /^\d+$/.test(lastSlugSegMeta) && slug.length > 1;
  const pathValNumMeta = lastIsNumericMeta ? parseInt(lastSlugSegMeta, 10) : null;
  const subRaw = (() => {
    if (!lastIsNumericMeta) return slug[1] ? String(slug[1]) : null;
    if (slug.length >= 3) return String(slug[1]);
    return null;
  })();
  const tab = tabRaw.toLowerCase();
  const sub = subRaw ? subRaw.toLowerCase().replace(/[^a-z0-9]/g, '') : null;

  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const rank = pathValNumMeta ?? Number((sp.rank as string) ?? 1);
  const top = pathValNumMeta ?? Number((sp.top as string) ?? 2);

  let title = 'Records Ranking | ATP Ranking Records';
  switch (tab) {
    case 'weeksatno': title = `Most Weeks at No. ${rank} | ATP Ranking Records`; break;
    case 'weeksattop': title = `Most Weeks in Top ${top} | ATP Ranking Records`; break;
    case 'streak': title = sub === 'consecutiveweeksattop' ? `Most Consecutive Weeks in Top ${top} | ATP Ranking Records` : `Most Consecutive Weeks at No. ${rank} | ATP Ranking Records`; break;
    case 'endoftheseason':
      if (sub === 'consecutivesatno') title = `Consecutive Seasons at Year-End No. ${rank} | ATP Ranking Records`;
      else if (sub === 'consecutivesattop') title = `Consecutive Seasons at Year-End Top ${top} | ATP Ranking Records`;
      else title = sub === 'attop' ? `Seasons at Year-End Top ${top} | ATP Ranking Records` : `Seasons at Year-End No. ${rank} | ATP Ranking Records`; 
      break;
    case 'ages':
      if (sub === 'youngestattop') title = `Youngest Players at Top ${top} | ATP Ranking Records`;
      else if (sub === 'oldestattop') title = `Oldest Players at Top ${top} | ATP Ranking Records`;
      else if (sub === 'youngestsatno') title = `Youngest Players to Reach No. ${rank} | ATP Ranking Records`;
      else title = `Oldest Players to Reach No. ${rank} | ATP Ranking Records`; 
      break;
    case 'agesendoftheseason':
      if (sub === 'youngestattop') title = `Youngest Players to Finish Year-End in the Top ${top} | ATP Ranking Records`;
      else if (sub === 'oldestattop') title = `Oldest Players to Finish Year-End in the Top ${top} | ATP Ranking Records`;
      else if (sub === 'youngestsatno') title = `Youngest Players at Year-End No. ${rank} | ATP Ranking Records`;
      else title = `Oldest Players at Year-End No. ${rank} | ATP Ranking Records`; 
      break;
    case 'timespan':
      if (sub === 'weeksattop') title = `Timespan between first and last time ranked at Top ${top} | ATP Ranking Records`;
      else title = `Timespan between first and last time ranked No. ${rank} | ATP Ranking Records`; 
      break;
    case 'timespanendoftheseason':
      if (sub === 'weeksattop') title = `Timespan between first and last time ranked at Year-End Top ${top} | ATP Ranking Records`;
      else title = `Timespan between first and last time ranked at Year-End No. ${rank} | ATP Ranking Records`; 
      break;
    case 'mostpoints': title = (sub === 'endoftheseason' || (sp.subtab as string) === 'EndOfTheSeason') ? 'Most ATP Points at the End of The Season | ATP Ranking Records' : 'Most ATP Points | ATP Ranking Records'; break;
    case 'diffpoints': title = (sub === 'endoftheseason' || (sp.subtab as string) === 'EndOfTheSeason') ? 'Maximum Difference Between No. 1 and No. 2 at the End of The Season | ATP Ranking Records' : 'Maximum Difference Between No. 1 and No. 2 | ATP Ranking Records'; break; 
    default: title = 'Records Ranking - TennisMyLife';
  }

  const description = (() => {
    switch (tab) {
      case 'weeksatno': return `All-time leaderboard: who spent the most weeks ranked at No. ${rank} in ATP history.`;
      case 'weeksattop': return `All-time leaderboard: who spent the most weeks inside the Top ${top} in ATP history.`;
      case 'streak':
        return sub === 'consecutiveweeksattop'
          ? `Longest consecutive week streaks inside the Top ${top} in ATP history.`
          : `Longest consecutive week streaks at No. ${rank} in ATP history.`;
      case 'endoftheseason':
        if (sub === 'consecutivesatno') return `Most consecutive year-end finishes at No. ${rank} in ATP history.`;
        if (sub === 'consecutivesattop') return `Most consecutive year-end finishes in the Top ${top} in ATP history.`;
        return sub === 'attop'
          ? `Year-end finishes in the Top ${top}: all-time leaderboard.`
          : `Year-end finishes at No. ${rank}: all-time leaderboard.`;
      case 'ages':
        if (sub === 'youngestattop') return `Youngest players ever ranked in the Top ${top} in ATP history.`;
        if (sub === 'oldestattop') return `Oldest players ever ranked in the Top ${top} in ATP history.`;
        if (sub === 'youngestsatno') return `Youngest players ever to reach No. ${rank} in ATP history.`;
        return `Oldest players ever to reach No. ${rank} in ATP history.`;
      case 'agesendoftheseason':
        if (sub === 'youngestattop') return `Youngest players to finish the year in the Top ${top} in ATP history.`;
        if (sub === 'oldestattop') return `Oldest players to finish the year in the Top ${top} in ATP history.`;
        if (sub === 'youngestsatno') return `Youngest players to finish the year at No. ${rank} in ATP history.`;
        return `Oldest players to finish the year at No. ${rank} in ATP history.`;
      case 'timespan':
        return sub === 'attop'
          ? `Longest career span between first and last time ranked in the Top ${top}.`
          : `Longest career span between first and last time ranked No. ${rank}.`;
      case 'timespanendoftheseason':
        return sub === 'attop'
          ? `Longest career span between first and last year-end finish in the Top ${top}.`
          : `Longest career span between first and last year-end finish at No. ${rank}.`;
      case 'mostpoints':
        return (sub === 'endoftheseason' || (sp.subtab as string) === 'EndOfTheSeason')
          ? 'Highest ATP ranking points recorded at year-end in history.'
          : 'Highest ATP ranking points ever recorded in history.';
      case 'diffpoints':
        return (sub === 'endoftheseason' || (sp.subtab as string) === 'EndOfTheSeason')
          ? 'Largest margin between No. 1 and No. 2 in ATP year-end rankings.'
          : 'Largest margin between No. 1 and No. 2 in ATP ranking history.';
      default: return 'Historical ATP ranking records and leaderboards.';
    }
  })();

  const site = process.env.SITE_URL?.replace(/\/+$/, '') || process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';
  // Build canonical: always include the numeric value so each rank/top has a unique canonical URL
  const numericDefaultsMeta: Record<string, number> = {
    'weeksatno': 1, 'weeksattop': 2,
    'streak/consecutiveweeksatno': 1, 'streak/consecutiveweeksattop': 2,
    'endoftheseason/no': 1, 'endoftheseason/attop': 2,
    'endoftheseason/consecutivesatno': 1, 'endoftheseason/consecutivesattop': 2,
    'ages/youngestsatno': 1, 'ages/oldestsatno': 1,
    'ages/youngestattop': 2, 'ages/oldestattop': 2,
    'agesendoftheseason/youngestsatno': 1, 'agesendoftheseason/oldestsatno': 1,
    'agesendoftheseason/youngestattop': 2, 'agesendoftheseason/oldestattop': 2,
    'timespan/atno': 1, 'timespan/attop': 2,
    'timespanendoftheseason/atno': 1, 'timespanendoftheseason/attop': 2,
  };
  const routeKeyMeta = sub ? `${tab}/${sub}` : tab;
  const canonicalSegments = slug.length ? [...slug] : ['weeksatno'];
  if (pathValNumMeta === null && numericDefaultsMeta[routeKeyMeta] !== undefined) {
    canonicalSegments.push(String(numericDefaultsMeta[routeKeyMeta]));
  }
  const canonical = `${site}/recordsranking/${canonicalSegments.join('/')}`;
  const OG_IMAGE = `${site}/og/site-preview.png`;
  const keywords: string[] = (() => {
    const base = ['ATP ranking records', 'tennis records', 'open era records'];
    switch (tab) {
      case 'weeksatno': return [`weeks at No. ${rank} ATP`, `most weeks at No. ${rank}`, `No. ${rank} all-time record`, ...base];
      case 'weeksattop': return [`weeks in Top ${top} ATP`, `most weeks Top ${top}`, `Top ${top} all-time record`, ...base];
      case 'streak':
        return sub === 'consecutiveweeksattop'
          ? [`consecutive weeks Top ${top}`, `longest streak Top ${top} ATP`, 'ATP streak records', ...base]
          : [`consecutive weeks No. ${rank}`, `longest streak No. ${rank} ATP`, 'ATP streak records', ...base];
      case 'endoftheseason':
        if (sub === 'consecutivesatno') return [`consecutive year-end No. ${rank}`, `year-end streak No. ${rank}`, 'ATP year-end records', ...base];
        if (sub === 'consecutivesattop') return [`consecutive year-end Top ${top}`, `year-end streak Top ${top}`, 'ATP year-end records', ...base];
        return sub === 'attop'
          ? [`year-end Top ${top} ATP`, `seasons in Top ${top}`, 'ATP year-end ranking records', ...base]
          : [`year-end No. ${rank} ATP`, `seasons at No. ${rank}`, 'ATP year-end ranking records', ...base];
      case 'ages':
        if (sub === 'youngestattop') return [`youngest Top ${top} ATP`, `youngest ever in Top ${top}`, 'ATP age records', ...base];
        if (sub === 'oldestattop') return [`oldest Top ${top} ATP`, `oldest ever in Top ${top}`, 'ATP age records', ...base];
        if (sub === 'youngestsatno') return [`youngest No. ${rank} ATP`, `youngest ever at No. ${rank}`, 'ATP age records', ...base];
        return [`oldest No. ${rank} ATP`, `oldest ever at No. ${rank}`, 'ATP age records', ...base];
      case 'agesendoftheseason':
        if (sub === 'youngestattop') return [`youngest year-end Top ${top}`, 'ATP year-end age records', ...base];
        if (sub === 'oldestattop') return [`oldest year-end Top ${top}`, 'ATP year-end age records', ...base];
        if (sub === 'youngestsatno') return [`youngest year-end No. ${rank}`, 'ATP year-end age records', ...base];
        return [`oldest year-end No. ${rank}`, 'ATP year-end age records', ...base];
      case 'timespan':
        return sub === 'attop'
          ? [`career span Top ${top} ATP`, `timespan in Top ${top}`, 'ATP career timespan records', ...base]
          : [`career span No. ${rank} ATP`, `timespan at No. ${rank}`, 'ATP career timespan records', ...base];
      case 'timespanendoftheseason':
        return sub === 'attop'
          ? [`year-end span Top ${top} ATP`, 'ATP year-end timespan records', ...base]
          : [`year-end span No. ${rank} ATP`, 'ATP year-end timespan records', ...base];
      case 'mostpoints': return ['most ATP ranking points', 'highest ATP points all-time', 'ATP points record', ...base];
      case 'diffpoints': return ['ATP No 1 No 2 points gap', 'largest margin No 1 No 2', 'ATP ranking gap record', ...base];
      default: return base;
    }
  })();

  return {
    title: { absolute: title },
    description,
    keywords,
    alternates: { canonical },
    openGraph: {
      type: 'website' as const,
      url: canonical,
      siteName: 'TennisMyLife',
      title,
      description,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image' as const,
      site: '@TennisMyLife68',
      creator: '@TennisMyLife68',
      title,
      description,
      images: [OG_IMAGE],
    },
    robots: (() => {
      // Any explicit pagination query (e.g. ?page=2 or ?page=1) is treated as duplicate and noindex.
      const pageRaw = sp.page;
      const pageParamPresent = Array.isArray(pageRaw)
        ? pageRaw.some((v) => String(v ?? '').trim() !== '')
        : pageRaw !== undefined && String(pageRaw).trim() !== '';
      if (pageParamPresent) return { index: false, follow: true };
      // Pages not linked from /recordsranking landing are noindex
      const LANDING_RANK = new Set([1,2,3,4,5,6,7,8,9,10]);
      const LANDING_TOP  = new Set([2,3,4,5,6,7,8,9,10,20,30,50,100]);
      const routeKey = sub ? `${tab}/${sub}` : tab;
      const TOP_ROUTES = new Set([
        'weeksattop', 'streak/consecutiveweeksattop',
        'endoftheseason/attop', 'endoftheseason/consecutivesattop',
        'ages/youngestattop', 'ages/oldestattop',
        'agesendoftheseason/youngestattop', 'agesendoftheseason/oldestattop',
        'timespan/attop', 'timespanendoftheseason/attop',
      ]);
      const POINTS_ROUTES = new Set(['mostpoints', 'diffpoints']);
      let linked = true;
      if (!POINTS_ROUTES.has(tab)) {
        linked = TOP_ROUTES.has(routeKey) ? LANDING_TOP.has(top) : LANDING_RANK.has(rank);
      }
      return linked
        ? { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' as const, 'max-video-preview': -1 }
        : { index: false, follow: true };
    })(),
  };
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
  const rawSearchParams = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;

  // Next should provide catch-all params as `string[]`, but in some environments
  // (custom server / edge cases) it can surface as a single `string`.
  const slugParam = (resolvedParams as any)?.slug;
  const slug = Array.isArray(slugParam) ? slugParam : (slugParam ? [slugParam] : []);

  const tabSegRaw = slug[0] ?? 'weeksatno';

  // Normalization helper for comparing segments in a case-insensitive, punctuation-agnostic way
  const normalizeSeg = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Last slug segment is numeric → it is the rank/top value encoded in the path
  const lastSlugSeg = String(slug[slug.length - 1] ?? '');
  const lastIsNumeric = /^\d+$/.test(lastSlugSeg) && slug.length > 1;
  const pathValStr = lastIsNumeric ? String(parseInt(lastSlugSeg, 10)) : null;

  // subSeg is slug[1] only when it is NOT the numeric value segment
  const subSegRaw = (() => {
    if (!lastIsNumeric) return slug[1] ?? null;
    if (slug.length >= 3) return String(slug[1]);
    return null;
  })();

  // normalized segments used for routing logic
  const tabSeg = normalizeSeg(tabSegRaw);
  const subSeg = subSegRaw ? normalizeSeg(subSegRaw) : null;

  // Inject path value (if present) as both rank and top so each sub-component reads the right one
  const resolvedSearchParams: Record<string, string | string[]> = pathValStr
    ? { ...rawSearchParams, rank: pathValStr, top: pathValStr, _numericInPath: '1' }
    : rawSearchParams;

  // Debug: log incoming params when RANKING_DEBUG=1
  if (process.env.RANKING_DEBUG === '1') {
    // Avoid logging PII; only log structure
    console.debug('[records-ranking] params', { slug, tabSegRaw, subSegRaw, tabSeg, subSeg, pathValStr });
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

  // map segment to server component using inline dynamic imports (only the needed module is loaded per request)
  let content: React.ReactNode = null;
  switch (tabSeg) {
    case 'weeksatno': {
      const { default: Count } = await import("../Count/page");
      content = await render(Count);
      break;
    }
    case 'weeksattop': {
      const { default: Top } = await import("../Top/page");
      content = await render(Top);
      break;
    }
    case 'streak': {
      if (subSeg === 'consecutiveweeksattop') {
        const { default: StreakTop } = await import("../Streak/Top/page");
        content = await render(StreakTop);
      } else {
        const { default: StreakCount } = await import("../Streak/Count/page");
        content = await render(StreakCount);
      }
      break;
    }
    case 'endoftheseason': {
      if (subSeg === 'attop') {
        const { default: EndSeasonTop } = await import("../EndOfTheSeason/Top/page");
        content = await render(EndSeasonTop);
      } else if (subSeg === 'consecutivesattop') {
        const { default: EndSeasonStreakTop } = await import("../EndOfTheSeason/StreakTop/page");
        content = await render(EndSeasonStreakTop);
      } else if (subSeg === 'consecutivesatno') {
        const { default: EndSeasonStreakCount } = await import("../EndOfTheSeason/StreakCount/page");
        content = await render(EndSeasonStreakCount);
      } else {
        const { default: EndSeasonCount } = await import("../EndOfTheSeason/Count/page");
        content = await render(EndSeasonCount);
      }
      break;
    }
    case 'ages': {
      if (subSeg === 'youngestattop') {
        const { default: AgesYoungestTop } = await import("../Ages/YoungestTop/page");
        content = await render(AgesYoungestTop);
      } else if (subSeg === 'oldestattop') {
        const { default: AgesOldestTop } = await import("../Ages/OldestTop/page");
        content = await render(AgesOldestTop);
      } else if (subSeg === 'oldestsatno') {
        const { default: AgesOldestCount } = await import("../Ages/OldestCount/page");
        content = await render(AgesOldestCount);
      } else {
        const { default: AgesYoungestCount } = await import("../Ages/YoungestCount/page");
        content = await render(AgesYoungestCount); // default: youngestcount
      }
      break;
    }
    case 'agesendoftheseason': {
      if (subSeg === 'youngestattop') {
        const { default: AgesEoyYoungestTop } = await import("../AgesEndOfTheSeason/YoungestTop/page");
        content = await render(AgesEoyYoungestTop);
      } else if (subSeg === 'oldestattop') {
        const { default: AgesEoyOldestTop } = await import("../AgesEndOfTheSeason/OldestTop/page");
        content = await render(AgesEoyOldestTop);
      } else if (subSeg === 'oldestsatno') {
        const { default: AgesEoyOldestCount } = await import("../AgesEndOfTheSeason/OldestCount/page");
        content = await render(AgesEoyOldestCount);
      } else {
        const { default: AgesEoyYoungestCount } = await import("../AgesEndOfTheSeason/YoungestCount/page");
        content = await render(AgesEoyYoungestCount); // default: youngestcount
      }
      break;
    }
    case 'timespan': {
      if (subSeg === 'attop') {
        const { default: TimespanTop } = await import("../Timespan/TimespanTop/page");
        content = await render(TimespanTop);
      } else {
        const { default: TimespanCount } = await import("../Timespan/TimespanCount/page");
        content = await render(TimespanCount);
      }
      break;
    }
    case 'timespanendoftheseason': {
      if (subSeg === 'attop') {
        const { default: TimespanEoyTop } = await import("../TimespanEndOfTheSeason/TimespanTopEndOfTheSeason/page");
        content = await render(TimespanEoyTop);
      } else {
        const { default: TimespanEoyCount } = await import("../TimespanEndOfTheSeason/TimespanCountEndOfTheSeason/page");
        content = await render(TimespanEoyCount);
      }
      break;
    }
    case 'mostpoints': {
      const { default: MostPoints } = await import("../MostPoints/page");
      const mostPointsSearchParams = { ...(resolvedSearchParams ?? {}), ...(subSeg ? { subtab: (subSeg === 'overall' ? 'Overall' : (subSeg === 'endoftheseason' ? 'EndOfTheSeason' : subSeg)) } : {}) };
      content = await render(MostPoints, { searchParams: mostPointsSearchParams });
      break;
    }
    case 'diffpoints': {
      const diffPointsSearchParams = { ...(resolvedSearchParams ?? {}), ...(subSeg ? { subtab: (subSeg === 'overall' ? 'Overall' : (subSeg === 'endoftheseason' ? 'EndOfTheSeason' : subSeg)) } : {}) };
      if ((subSeg ?? '') === 'endoftheseason') {
        const { default: DiffPointsEoy } = await import("../DiffPoints/EndOfTheSeason/page");
        content = await render(DiffPointsEoy, { searchParams: diffPointsSearchParams });
      } else {
        const { default: DiffPointsOverall } = await import("../DiffPoints/Overall/page");
        content = await render(DiffPointsOverall, { searchParams: diffPointsSearchParams });
      }
      break;
    }
    default: {
      const { default: Count } = await import("../Count/page");
      content = await render(Count);
    }
  }

  // compute a canonical heading (same text used in metadata but without site suffix)
  const heading = (() => {
    const sp = resolvedSearchParams ?? {} as Record<string, string | string[]>;
    const rank = Number((sp.rank as string) ?? 1);
    const top = Number((sp.top as string) ?? 2);
    switch (tabSeg) {
      case 'weeksatno': return `Most Weeks at No. ${rank}`;
      case 'weeksattop': return `Most Weeks in Top ${top}`;
      case 'streak': return subSeg === 'consecutiveweeksattop' ? `Most Consecutive Weeks in Top ${top}` : `Most Consecutive Weeks at No. ${rank}`;
      case 'endoftheseason':
        if (subSeg === 'consecutivesatno') return `Consecutive Seasons at Year-End No. ${rank}`;
        if (subSeg === 'consecutivesattop') return `Consecutive Seasons at Year-End Top ${top}`;
        return subSeg === 'attop' ? `Seasons at Year-End Top ${top}` : `Seasons at Year-End No. ${rank}`;
      case 'ages':
        if (subSeg === 'youngestattop') return `Youngest Players at Top ${top}`;
        if (subSeg === 'oldestattop') return `Oldest Players at Top ${top}`;
        if (subSeg === 'youngestsatno') return `Youngest Players to Reach No. ${rank}`;
        return `Oldest Players to Reach No. ${rank}`;
      case 'agesendoftheseason':
        if (subSeg === 'youngestattop') return `Youngest Players to Finish Year-End in the Top ${top}`;
        if (subSeg === 'oldestattop') return `Oldest Players to Finish Year-End in the Top ${top}`;
        if (subSeg === 'youngestsatno') return `Youngest Players at Year-End No. ${rank}`;
        return `Oldest Players at Year-End No. ${rank}`;
      case 'timespan':
        if (subSeg === 'attop') return `Timespan between first and last time ranked at Top ${top}`;
        return `Timespan between first and last time ranked No. ${rank}`;
      case 'timespanendoftheseason':
        if (subSeg === 'attop') return `Timespan between first and last time ranked at Year-End Top ${top}`;
        return `Timespan between first and last time ranked at Year-End No. ${rank}`;
      case 'mostpoints': return (subSeg === 'endoftheseason' || (resolvedSearchParams as any).subtab === 'EndOfTheSeason') ? 'Most ATP Points at the End of The Season' : 'Most ATP Points';
      case 'diffpoints': return (subSeg === 'endoftheseason' || (resolvedSearchParams as any).subtab === 'EndOfTheSeason') ? 'Maximum Difference Between No. 1 and No. 2 at the End of The Season' : 'Maximum Difference Between No. 1 and No. 2';
      default: return 'Records Ranking';
    }
  })();

  const SITE_BASE = 'https://stats.tennismylife.org';
  const pageUrl = `${SITE_BASE}/recordsranking/${slug.length ? slug.join('/') : 'weeksatno/1'}`;
  const jsonLdSlug = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': pageUrl,
        name: `${heading} | ATP Ranking Records`,
        description: `${heading} – ATP ranking all-time leaderboard.`,
        url: pageUrl,
        inLanguage: 'en-US',
        isPartOf: { '@type': 'WebSite', name: 'TennisMyLife', url: SITE_BASE },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_BASE },
          { '@type': 'ListItem', position: 2, name: 'ATP Ranking Records', item: `${SITE_BASE}/recordsranking` },
          { '@type': 'ListItem', position: 3, name: heading, item: pageUrl },
        ],
      },
    ],
  };
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSlug) }} />
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

      {/* ── Related leaderboards ── */}
      {(() => {
        const RANK_LANDING = [1,2,3,4,5,6,7,8,9,10];
        const TOP_LANDING  = [1,2,3,4,5,6,7,8,9,10,20,30,50,100];
        const POINTS_TABS  = new Set(['mostpoints','diffpoints']);
        if (POINTS_TABS.has(tabSeg)) return null;
        const currentVal = pathValStr ? parseInt(pathValStr, 10) : null;
        if (currentVal === null) return null;

        const TOP_ROUTE_KEYS = new Set([
          'weeksattop','streak/consecutiveweeksattop',
          'endoftheseason/attop','endoftheseason/consecutivesattop',
          'ages/youngestattop','ages/oldestattop',
          'agesendoftheseason/youngestattop','agesendoftheseason/oldestattop',
          'timespan/attop','timespanendoftheseason/attop',
        ]);
        const routeKey     = subSeg ? `${tabSeg}/${subSeg}` : tabSeg;
        const isTopRoute   = TOP_ROUTE_KEYS.has(routeKey);
        const currentPrefix = `/recordsranking/${routeKey}`;
        const landingVals  = isTopRoute ? TOP_LANDING : RANK_LANDING;

        type RouteItem = { label: string; href: (n: number) => string };
        const RANK_ROUTES: RouteItem[] = [
          { label: n => `Weeks at No. ${n}`,                       href: n => `/recordsranking/weeksatno/${n}` },
          { label: n => `Consec. Weeks at No. ${n}`,              href: n => `/recordsranking/streak/consecutiveweeksatno/${n}` },
          { label: n => `Year-End Finishes at No. ${n}`,          href: n => `/recordsranking/endoftheseason/no/${n}` },
          { label: n => `Consec. Year-End at No. ${n}`,           href: n => `/recordsranking/endoftheseason/consecutivesatno/${n}` },
          { label: n => `Youngest to Reach No. ${n}`,             href: n => `/recordsranking/ages/youngestsatno/${n}` },
          { label: n => `Oldest to Reach No. ${n}`,               href: n => `/recordsranking/ages/oldestsatno/${n}` },
          { label: n => `Youngest Year-End at No. ${n}`,          href: n => `/recordsranking/agesendoftheseason/youngestsatno/${n}` },
          { label: n => `Oldest Year-End at No. ${n}`,            href: n => `/recordsranking/agesendoftheseason/oldestsatno/${n}` },
          { label: n => `Career Span at No. ${n}`,                href: n => `/recordsranking/timespan/atno/${n}` },
          { label: n => `Year-End Career Span at No. ${n}`,       href: n => `/recordsranking/timespanendoftheseason/atno/${n}` },
        ] as any;
        const TOP_ROUTES: RouteItem[] = [
          { label: n => `Weeks in Top ${n}`,                      href: n => `/recordsranking/weeksattop/${n}` },
          { label: n => `Consec. Weeks in Top ${n}`,              href: n => `/recordsranking/streak/consecutiveweeksattop/${n}` },
          { label: n => `Year-End in Top ${n}`,                   href: n => `/recordsranking/endoftheseason/attop/${n}` },
          { label: n => `Consec. Year-End in Top ${n}`,           href: n => `/recordsranking/endoftheseason/consecutivesattop/${n}` },
          { label: n => `Youngest in Top ${n}`,                   href: n => `/recordsranking/ages/youngestattop/${n}` },
          { label: n => `Oldest in Top ${n}`,                     href: n => `/recordsranking/ages/oldestattop/${n}` },
          { label: n => `Youngest Year-End Top ${n}`,             href: n => `/recordsranking/agesendoftheseason/youngestattop/${n}` },
          { label: n => `Oldest Year-End Top ${n}`,               href: n => `/recordsranking/agesendoftheseason/oldestattop/${n}` },
          { label: n => `Career Span in Top ${n}`,                href: n => `/recordsranking/timespan/attop/${n}` },
          { label: n => `Year-End Career Span in Top ${n}`,       href: n => `/recordsranking/timespanendoftheseason/attop/${n}` },
        ] as any;

        const crossRoutes: RouteItem[] = isTopRoute ? TOP_ROUTES : RANK_ROUTES;
        const crossLinks = crossRoutes
          .map((r: any) => ({ label: r.label(currentVal), href: r.href(currentVal) }))
          .filter((r: any) => r.href !== `${currentPrefix}/${currentVal}`);

        const otherVals = landingVals.filter(v => v !== currentVal);

        return (
          <div className="mt-10 px-4 sm:px-8 pb-10">
            <div className="mb-6">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                Other {isTopRoute ? 'Top' : 'Rank'} values — same record
              </h2>
              <div className="flex flex-wrap gap-2">
                {otherVals.map(v => (
                  <Link
                    key={v}
                    href={`${currentPrefix}/${v}`}
                    className="px-3 py-1 rounded-lg text-sm bg-gray-800 text-gray-300 hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    {isTopRoute ? `Top ${v}` : `No. ${v}`}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                Related records — {isTopRoute ? `Top ${currentVal}` : `No. ${currentVal}`}
              </h2>
              <div className="flex flex-wrap gap-2">
                {crossLinks.map((r: any) => (
                  <Link
                    key={r.href}
                    href={r.href}
                    className="px-3 py-1 rounded-lg text-sm bg-gray-800 text-gray-300 hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    {r.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}
