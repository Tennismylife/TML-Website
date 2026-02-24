import React from 'react';
import type { Metadata } from 'next';
import H2HClient from '../H2HClient';
import H2HContentClient from '../H2HContentClient';
import H2HPreviewServer from '../H2HPreviewServer';
import H2HCareerOverviewServer from '../H2HCareerOverviewServer';
import { prisma } from '@/lib/prisma';
import { metadataBase } from '@/lib/site';
import { getPlayerHrefWithTab, IOC_TO_ISO, createSlug } from '@/lib/utils';
import { mapIdsToSlugs } from '@/lib/player-slugs';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';

const canonicalOrigin = new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'https://stats.tennismylife.org');

export async function generateMetadata({ params }: { params?: Promise<{ slugs?: string[] }> | { slugs?: string[] } }): Promise<Metadata> {
  // Next.js 16+ params can be a Promise
  const resolvedParams = params instanceof Promise ? await params : params;
  const slugArr = resolvedParams?.slugs;
  const slug = Array.isArray(slugArr) ? slugArr.join('/') : slugArr?.[0] || '';

  let player1Name: string | null = null;
  let player2Name: string | null = null;

  const match = slug.match(/^(.+)-vs-(.+)$/);
  if (match) {
    const p1slug = match[1].replace(/-/g, ' ');
    const p2slug = match[2].replace(/-/g, ' ');
    try {
      const [p1, p2] = await Promise.all([
        prisma.player.findFirst({ where: { atpname: { equals: p1slug, mode: 'insensitive' } }, select: { atpname: true } }),
        prisma.player.findFirst({ where: { atpname: { equals: p2slug, mode: 'insensitive' } }, select: { atpname: true } })
      ]);
      player1Name = p1?.atpname ?? null;
      player2Name = p2?.atpname ?? null;
    } catch (err) {
      // ignore and fallback to generic metadata
    }
  }

  const siteTitle = player1Name && player2Name ? `${player1Name} vs ${player2Name} H2H - Tennis  Head to Head, Matches, Stats` : 'Head-to-Head - Tennis  Head to Head, Matches, Stats';
  const description = player1Name && player2Name ? `${player1Name} vs ${player2Name} head-to-head: H2H record, match stats and analysis. Compare ATP players.` : 'Head-to-head statistics between players.'; 
  const path = `/h2h/${slug}`;
  const ogImage = new URL('/og/site-preview.png', canonicalOrigin).toString();
  const canonicalBase = new URL(path, canonicalOrigin).toString();
  // Use canonical with trailing '?' for H2H slugs to match requested format
  const canonical = slug ? `${canonicalBase}?` : canonicalBase;

  return {
    title: siteTitle,
    description,
    authors: [{ name: 'TennisMyLife' }],
    robots: { index: true, follow: true },
    openGraph: {
      title: siteTitle,
      description,
      url: canonical,
      siteName: 'TennisMyLife',
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title: siteTitle, description, images: [ogImage] },
    alternates: { canonical },
  };
}

export default async function Page({ params, searchParams }: { params?: Promise<{ slugs?: string[] }> | { slugs?: string[] }, searchParams?: Record<string, string | string[]> }) {
  // Next.js 16+ params can be a Promise
  const resolvedParams = params instanceof Promise ? await params : params;
  const slugArr = resolvedParams?.slugs;
  const slug = Array.isArray(slugArr) ? slugArr.join('/') : slugArr?.[0] || '';

  const qBestOf = (() => {
    if (!searchParams) return undefined;
    const v = (searchParams as any).best_of ?? (searchParams as any).bestOf;
    if (!v) return undefined;
    return Array.isArray(v) ? v[0] : v;
  })();

  console.log('[H2H Page] Received slug:', slug, 'slugArr:', slugArr, 'best_of:', qBestOf);

  let player1: any = null;
  let player2: any = null;
  let initialMatches: any[] = [];
  let availableOpponents: string[] = [];
  let rank1: number | null = null;
  let rank2: number | null = null;
  let points1: number | null = null;
  let points2: number | null = null;

  const match = slug.match(/^(.+)-vs-(.+)$/);
  if (match) {
    const p1slug = match[1].replace(/-/g, ' ');
    const p2slug = match[2].replace(/-/g, ' ');
    try {
        // Prefer lookup by slug (from URL) and fallback to atpname search for robustness
      const [p1BySlug, p2BySlug] = await Promise.all([
        prisma.player.findUnique({ where: { slug: match[1] } }),
        prisma.player.findUnique({ where: { slug: match[2] } }),
      ]);

      const [p1ByName, p2ByName] = await Promise.all([
        prisma.player.findFirst({ where: { atpname: { equals: p1slug, mode: 'insensitive' } } }),
        prisma.player.findFirst({ where: { atpname: { equals: p2slug, mode: 'insensitive' } } }),
      ]);

      const p1 = p1BySlug ?? p1ByName ?? null;
      const p2 = p2BySlug ?? p2ByName ?? null;

      player1 = p1 ?? null;
      player2 = p2 ?? null;

      // Fetch H2H matches server-side if both players found
      if (player1 && player2) {
        try {
          const where: any = {
            OR: [
              { winner_id: player1.id, loser_id: player2.id },
              { winner_id: player2.id, loser_id: player1.id },
            ],
          };

          if (qBestOf && String(qBestOf).toLowerCase() !== 'all') {
            const bof = Number(qBestOf);
            if (!Number.isNaN(bof)) where.best_of = bof;
          }

          const matches = await prisma.match.findMany({
            where,
            orderBy: { tourney_date: 'asc' },
          });

          // Normalize date and then enrich matches with player slugs for reliable slug links
          const normalized = matches.map((m: any) => ({
            ...m,
            tourney_date: m.tourney_date ? (m.tourney_date instanceof Date ? m.tourney_date.toISOString().split('T')[0] : String(m.tourney_date)) : null,
          }));

          // Map unique player ids to slugs
          const playerIds = new Set<string>();
          for (const m of normalized) {
            if (m.winner_id) playerIds.add(String(m.winner_id));
            if (m.loser_id) playerIds.add(String(m.loser_id));
          }
          const slugMap = await mapIdsToSlugs(Array.from(playerIds));

          // Resolve tourney slugs for matches so clients can link to canonical slug URLs
          const tourneyIdParts = Array.from(new Set(normalized.map((m: any) => {
            const s = String(m.tourney_id || '');
            const parts = s.split('-').filter(Boolean);
            return parts.length === 2 ? parts[1] : s;
          }).filter(Boolean)));

          let tourneyMap: Record<string, string | null> = {};
          try {
            if (tourneyIdParts.length > 0) {
              const tours = await prisma.tournament.findMany({ where: { id: { in: tourneyIdParts.map((v) => Number(v)) } }, select: { id: true, slug: true } });
              tourneyMap = tours.reduce((acc: Record<string, string | null>, t: any) => { acc[String(t.id)] = t.slug ?? null; return acc; }, {});
            }
          } catch (err) {
            // best-effort: if lookup fails, continue without tourney_slug
            tourneyMap = {};
          }

          initialMatches = normalized.map((m: any) => ({
            ...m,
            winner_slug: slugMap[String(m.winner_id)] ?? undefined,
            loser_slug: slugMap[String(m.loser_id)] ?? undefined,
            tourney_slug: (() => {
              const s = String(m.tourney_id || '');
              const parts = s.split('-').filter(Boolean);
              const idPart = parts.length === 2 ? parts[1] : s;
              return idPart ? (tourneyMap[String(idPart)] ?? undefined) : undefined;
            })(),
          }));
        } catch (matchErr) {
          console.error('Error fetching matches:', matchErr);
          initialMatches = [];
        }
      }

      // Skip opponents fetch for now to avoid query complexity
      availableOpponents = [];

      // Fetch ranking from the single latest ranking snapshot
      // Both players must be in the same snapshot; if absent → null (empty)
      const latestRankingDate = await prisma.rankingDate.findFirst({
        orderBy: { date: 'desc' },
        select: { id: true },
      });
      if (latestRankingDate) {
        const [r1, r2] = await Promise.all([
          player1 ? prisma.ranking.findFirst({
            where: { playerId: String(player1.id), rankingDateId: latestRankingDate.id },
            select: { rank: true, points: true },
          }) : null,
          player2 ? prisma.ranking.findFirst({
            where: { playerId: String(player2.id), rankingDateId: latestRankingDate.id },
            select: { rank: true, points: true },
          }) : null,
        ]);
        rank1 = r1?.rank ?? null;
        rank2 = r2?.rank ?? null;
        points1 = r1?.points ?? null;
        points2 = r2?.points ?? null;
      }
    } catch (err) {
      console.error('Error in H2H page:', err);
      player1 = null;
      player2 = null;
      initialMatches = [];
      availableOpponents = [];
    }
  }

  // Build JSON-LD structured data for the page
  const pageTitle = player1 && player2 ? `${player1.atpname} vs ${player2.atpname} H2H - Tennis  Head to Head, Matches, Stats` : 'Head-to-Head - Tennis  Head to Head, Matches, Stats';
  const pageDescription = player1 && player2 ? `${player1.atpname} vs ${player2.atpname} head-to-head: H2H record, match stats and analysis. Compare ATP players.` : 'Head-to-head statistics between players.';
  const path = slug ? `/h2h/${slug}` : '/h2h';
  const canonicalBase = new URL(path, canonicalOrigin).toString();
  const canonical = slug ? `${canonicalBase}?` : canonicalBase;

  const playersAsPersons = [] as any[];
  if (player1) {
    playersAsPersons.push({
      "@type": "Person",
      name: player1.atpname,
      sameAs: new URL(getPlayerHrefWithTab(player1.slug ?? (player1.id ? String(player1.id) : player1.atpname), 'matches'), canonicalOrigin).toString(),
    });
  }
  if (player2) {
    playersAsPersons.push({
      "@type": "Person",
      name: player2.atpname,
      sameAs: new URL(getPlayerHrefWithTab(player2.slug ?? (player2.id ? String(player2.id) : player2.atpname), 'matches'), canonicalOrigin).toString(),
    });
  }

  const jsonLd: any = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: pageTitle,
    description: pageDescription,
    url: canonical,
  };

  if (playersAsPersons.length) {
    // include as mainEntity and about
    jsonLd.mainEntity = {
      "@type": "ItemList",
      itemListElement: playersAsPersons.map((p, i) => ({ "@type": "ListItem", position: i + 1, item: p })),
    };
    jsonLd.about = playersAsPersons;
  }

  // Build BreadcrumbList JSON-LD
  const breadcrumbJson = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: canonicalOrigin.toString() },
      { "@type": "ListItem", position: 2, name: "Head-to-Head", item: new URL('/h2h', canonicalOrigin).toString() },
      { "@type": "ListItem", position: 3, name: pageTitle, item: canonical },
    ],
  };

  // Ensure country names are registered
  try { countries.registerLocale(enLocale as any); } catch {}

  function buildPersonJson(player: any) {
    if (!player) return null;

    const ioc = player.ioc ?? '';
    const iso = (ioc && IOC_TO_ISO[ioc.toUpperCase()]) || undefined;
    const countryName = iso ? countries.getName(iso, 'en') : undefined;

    const additionalProperty: any[] = [];
    const keys = ['id','player','atpname','coaches','ioc','hand','backhand','birthdate','height','weight','turnedpro','birthplace','slug'];
    for (const k of keys) {
      const v = player[k];
      if (v !== undefined && v !== null && v !== '') {
        let val = v;
        if (v instanceof Date) val = v.toISOString().split('T')[0];
        additionalProperty.push({ "@type": "PropertyValue", name: String(k), value: String(val) });
      }
    }

    return {
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": new URL(getPlayerHrefWithTab(player.slug ?? (player.id ? String(player.id) : String(player.atpname)), 'matches'), canonicalOrigin).toString(),
      name: player.atpname || player.player || '',
      givenName: player.player || player.atpname || '',
      jobTitle: 'Tennis Player',
      birthDate: player.birthdate ? (player.birthdate instanceof Date ? player.birthdate.toISOString().split('T')[0] : String(player.birthdate)) : undefined,
      nationality: countryName ? { "@type": "Country", name: countryName } : undefined,
      affiliation: { "@type": "SportsOrganization", name: 'ATP' },
      url: new URL(getPlayerHrefWithTab(player.slug ?? (player.id ? String(player.id) : String(player.atpname)), 'matches'), canonicalOrigin).toString(),
      additionalProperty: additionalProperty.length ? additionalProperty : undefined,
    };
  }

  const personJson1 = buildPersonJson(player1);
  const personJson2 = buildPersonJson(player2);

  // Build WebPage JSON-LD for the H2H comparison (if both players present)
  let webpageJson: any = null;
  if (player1 && player2) {
    const slug1 = createSlug(player1.atpname ?? player1.player ?? String(player1.id ?? ''));
    const slug2 = createSlug(player2.atpname ?? player2.player ?? String(player2.id ?? ''));
    // Use canonical URL for the WebPage JSON-LD
    const pageUrl = canonical;

    const aboutArr = [
      { "@id": (new URL(getPlayerHrefWithTab(player1.slug ?? (player1.id ? String(player1.id) : String(player1.atpname)), 'matches'), canonicalOrigin).toString()) },
      { "@id": (new URL(getPlayerHrefWithTab(player2.slug ?? (player2.id ? String(player2.id) : String(player2.atpname)), 'matches'), canonicalOrigin).toString()) },
    ];

    const keywords = `${player1.atpname} vs ${player2.atpname}, ${player1.atpname} ${player2.atpname} h2h, ${player1.atpname} ${player2.atpname} head to head, tennis h2h stats, ${player1.atpname} ${player2.atpname} matches, ${player1.atpname} ${player2.atpname} comparison, ATP h2h`;

    webpageJson = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `${player1.atpname} vs ${player2.atpname} Head to Head Tennis Statistics`,
      description: `${player1.atpname} vs ${player2.atpname} head-to-head: H2H record, match stats analysis. Compare ATP players.`,
      url: pageUrl,
      inLanguage: 'en-US',
      isPartOf: { "@type": "WebSite", name: 'TennisMyLife', url: canonicalOrigin.toString() },

      about: aboutArr,
      keywords,
      dateModified: new Date().toISOString(),
      mainEntity: {
        "@type": "Dataset",
        name: `${player1.atpname} vs ${player2.atpname} Head to Head Statistics`,
        description: 'Comprehensive statistical comparison including match history, pressure points analysis, and performance metrics',
        creator: { "@type": "Organization", name: 'TennisMyLife' },
        keywords: 'tennis h2h, head to head stats, player comparison',
      },
    };
  }

  // Calculate H2H stats for server-side rendering
  const heading = (() => {
    if (player1 && player2) {
      const s1 = createSlug(player1.atpname ?? player1.player ?? String(player1.id ?? ''));
      const s2 = createSlug(player2.atpname ?? player2.player ?? String(player2.id ?? ''));
      const [first, second] = s1 <= s2 ? [player1.atpname ?? '', player2.atpname ?? ''] : [player2.atpname ?? '', player1.atpname ?? ''];
      return `${first} vs ${second} Head to Head Tennis Stats and Match Analysis`;
    }
    return 'Head-to-Head';
  })();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJson) }} />
      {personJson1 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJson1) }} />}
      {personJson2 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJson2) }} />}
      {webpageJson && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageJson) }} />}

      <h1 className="page-title text-3xl font-bold mb-8 text-center">{heading}</h1>
      {player1 && player2 ? (
        <div className="container mx-auto px-4 py-8">
          <H2HContentClient
            matches={initialMatches}
            player1={player1}
            player2={player2}
            rank1={rank1}
            rank2={rank2}
            points1={points1}
            points2={points2}
            careerOverview={
              <H2HCareerOverviewServer
                player1={player1}
                player2={player2}
              />
            }
          >
            <H2HPreviewServer
              player1={player1}
              player2={player2}
              matches={initialMatches}
            />
          </H2HContentClient>
        </div>
      ) : (
        <H2HClient 
          initialPlayer1={player1} 
          initialPlayer2={player2} 
          initialMatches={initialMatches}
          initialOpponents={availableOpponents}
        />
      )}
    </>
  );
}
