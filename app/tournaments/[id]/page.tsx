import type { Metadata } from 'next';
import React from 'react';
import TournamentServer from './TournamentServer';
import TournamentHeaderServer from './TournamentHeaderServer';
import { prisma } from '../../../lib/prisma';
import { redirect, permanentRedirect } from 'next/navigation';
import { resolveCanonicalTourneyId, resolveTourneyIds } from '@/lib/tournament';
import { extractUniqueSurfaces, extractNames } from '@/lib/utils';

interface TournamentPageProps {
  params: Promise<{ id: string }>;
}

// Funzione per rendere il nome leggibile
function humanizeName(name: string) {
  return name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Estrae il primo valore valido (per name, city, country)
function extractFirst(value: any): string {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(extractFirst).find(Boolean) || '';
  if (typeof value === 'object') return Object.values(value).map(extractFirst).find(Boolean) || '';
  return '';
}

// Estrae tutti i valori validi e li unisce (per category, surfaces, ecc.)
function extractAll(value: any): string {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(extractAll).filter(Boolean).join(', ');
  if (typeof value === 'object') return Object.values(value).map(extractAll).filter(Boolean).join(', ');
  return '';
}

// Helper per recuperare il torneo dal DB
async function getTournament(param: string) {
  if (/^\d+$/.test(param)) {
    const canonicalId = await resolveCanonicalTourneyId(param);
    if (!canonicalId) return null;
    return prisma.tournament.findUnique({ where: { id: parseInt(canonicalId, 10) } });
  } else {
    return prisma.tournament.findUnique({ where: { slug: param } });
  }
}

// Metadata dinamica per il torneo
export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { id: param } = await params;
  if (!param) return { title: 'Tournament | Tournament Stats, History, Match Results & Winners' };
  const tournament = await getTournament(param);

  // Prefer the canonical display name when `tournament.name` is an array (use the last item)
  let name: string;
  if (!tournament) {
    name = String(param);
  } else if (Array.isArray(tournament.name)) {
    const last = (tournament.name as any[]).map((n) => extractFirst(n)).filter(Boolean).pop();
    name = last || extractFirst(tournament.name) || `Tournament ${tournament.id}`;
  } else {
    name = extractFirst(tournament.name) || `Tournament ${tournament.id}`;
  }

  const humanized = humanizeName(name);
  const site = 'https://stats.tennismylife.org';
  const ogUrl = `${site}/tournaments/${tournament?.slug || param}`;

  // Use our dynamic OG generator API as primary social image (server-side falls back to a default)
  const ogImage = `${site}/api/og/tournament/${tournament?.slug || param}`;

  const metaTitle = `${humanized} | Tournament Stats, History, Match Results & Winners`;
  const metaDescription = `Comprehensive results, champions, schedules and match statistics for ${humanized} — browse past winners, draws, player records and historical data.`;

  return {
    title: metaTitle,
    description: metaDescription,
    openGraph: {
      type: 'article',
      title: metaTitle,
      description: metaDescription,
      url: ogUrl,
      images: [
        {
          url: ogImage,
          alt: metaTitle,
          width: 1200,
          height: 630,
        },
      ],
      siteName: 'TennisMyLife',
    },
    twitter: {
      card: 'summary_large_image',
      title: metaTitle,
      description: metaDescription,
      images: [{ url: ogImage, alt: metaTitle }],
    },
    alternates: { canonical: ogUrl },
  };
}

export default async function TournamentPage({ params }: TournamentPageProps) {
  const { id: param } = await params;

  const tournament = await getTournament(param);
  if (!tournament) return <div>Tournament not found</div>;

  // Redirect se l’ID numerico ha uno slug canonico
  if (/^\d+$/.test(param) && tournament.slug) {
    permanentRedirect(`/tournaments/${tournament.slug}`);
  }

  // Estrazione valori dai campi JSON - usa l'ultimo nome (più recente) per H1
  const name = Array.isArray(tournament.name)
    ? (tournament.name as any[]).map((n) => extractFirst(n)).filter(Boolean).pop() || extractFirst(tournament.name) || `Tournament ${tournament.id}`
    : extractFirst(tournament.name) || `Tournament ${tournament.id}`;
  const humanizedName = humanizeName(name);

  const locationName = extractFirst(tournament.city) || "TBD";
  const country = extractFirst(tournament.country) || "TBD";

  // Deduplicate categories (preserve order) and produce a single readable string
  const _catNames = extractNames(tournament.category);
  const seenCat = new Set<string>();
  const uniqueCategories: string[] = [];
  for (const c of _catNames) {
    const s = String(c || '').trim();
    if (!s) continue;
    if (seenCat.has(s)) continue;
    seenCat.add(s);
    uniqueCategories.push(s);
  }
  const category = uniqueCategories.join(', ') || "TBD";

  // Use extractUniqueSurfaces which already normalizes and deduplicates
  const surfacesArr = extractUniqueSurfaces(tournament.surfaces);
  const surfaces = surfacesArr.join(', ') || "TBD";

  const indoor = extractFirst(tournament.indoor) || "TBD";

  const url = `https://stats.tennismylife.org/tournaments/${tournament.slug}`;

  const description = `Tournament page for ${humanizedName} – results, past champions and records.`;
  const ogImage = `https://stats.tennismylife.org/api/og/tournament/${tournament?.slug || param}`;

  // Server-side: resolve tourney ids and find first/last edition dates + most recent edition info
  let winner = "TBD";
  let topSeed = "TBD";
  let matchCount = 0;
  let startDate = tournament.startDate ? tournament.startDate.toISOString() : new Date().toISOString();
  let endDate = tournament.endDate ? tournament.endDate.toISOString() : new Date().toISOString();

  try {
    const tourneyIds = (await resolveTourneyIds(param)) ?? [String(tournament.id)];

    // Get first and last edition dates
    const firstEdition = await prisma.match.findFirst({
      where: { tourney_id: { in: tourneyIds } },
      orderBy: { tourney_date: 'asc' },
      select: { tourney_date: true },
    });

    const lastEdition = await prisma.match.findFirst({
      where: { tourney_id: { in: tourneyIds } },
      orderBy: { tourney_date: 'desc' },
      select: { tourney_date: true },
    });

    if (firstEdition?.tourney_date) {
      startDate = new Date(firstEdition.tourney_date).toISOString().split('T')[0];
    }
    if (lastEdition?.tourney_date) {
      endDate = new Date(lastEdition.tourney_date).toISOString().split('T')[0];
    }

    const years = await prisma.match.findMany({
      where: { tourney_id: { in: tourneyIds } },
      distinct: ['year'],
      select: { year: true },
      orderBy: { year: 'desc' },
    });

    const latestYear = years[0]?.year ?? null;

    if (latestYear) {
      const finalMatch = await prisma.match.findFirst({
        where: {
          tourney_id: { in: tourneyIds },
          year: latestYear,
          OR: [{ round: 'F' }, { round: 'Final' }],
        },
        orderBy: { tourney_date: 'desc' },
        select: { winner_name: true, winner_seed: true, loser_seed: true, loser_name: true },
      });

      if (finalMatch?.winner_name) winner = extractFirst(finalMatch.winner_name);

      // Try to find the top seed (seed 1) in the same edition
      const seedMatch = await prisma.match.findFirst({
        where: {
          tourney_id: { in: tourneyIds },
          year: latestYear,
          OR: [{ winner_seed: 1 }, { loser_seed: 1 }],
        },
        select: { winner_seed: true, winner_name: true, loser_seed: true, loser_name: true },
      });

      if (seedMatch) {
        if (seedMatch.winner_seed === 1 && seedMatch.winner_name) topSeed = extractFirst(seedMatch.winner_name);
        else if (seedMatch.loser_seed === 1 && seedMatch.loser_name) topSeed = extractFirst(seedMatch.loser_name);
      }

      matchCount = await prisma.match.count({ where: { tourney_id: { in: tourneyIds }, year: latestYear } });
    }
  } catch (err) {
    // ignore: fall back to defaults
  }

  const startDateReadable = new Date(startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Build FAQ items dynamically and avoid duplicates / placeholders
  const faqItems: { question: string; answer: string }[] = [];
  const pushFaq = (question: string, answer: string | number | null | undefined) => {
    const text = (answer ?? '').toString().trim();
    if (!text) return; // skip empty
    if (text === 'TBD') return; // skip placeholder
    // avoid duplicate answers
    if (faqItems.some((i) => i.answer === text)) return;
    faqItems.push({ question, answer: text });
  };

  pushFaq(`When does ${humanizedName} start?`, startDateReadable);
  pushFaq(`Where does ${humanizedName} take place?`, `${locationName}, ${country}`);
  pushFaq(`Who won the most recent edition of ${humanizedName}?`, winner);
  pushFaq(`Who was the top seed in the most recent edition?`, topSeed);
  pushFaq(`How many matches were played in the most recent edition?`, matchCount);

  const faqJson = faqItems.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map((it) => ({
          '@type': 'Question',
          name: it.question,
          acceptedAnswer: { '@type': 'Answer', text: it.answer },
        })),
      }
    : null;

  return (
    <>
      {/* FAQ JSON-LD for Google Rich Snippet (render only if we have items) */}
      {faqJson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJson),
          }}
        />
      )}

      {/* JSON-LD per Google Rich Results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsEvent",
            "@id": url,
            name: humanizedName,
            sport: "Tennis",
            url,
            mainEntityOfPage: url,
            description,
            startDate,
            endDate,
            eventStatus: "https://schema.org/EventScheduled",
            image: { "@type": "ImageObject", url: ogImage },
            location: {
              "@type": "Place",
              name: locationName,
              address: {
                "@type": "PostalAddress",
                addressCountry: country,
              },
            },
            organizer: {
              "@type": "SportsOrganization",
              name: "ATP Tour",
            },
            // Optional: categorie e superfici
            tournamentCategory: category,
            surfaces,
            indoor
          }),
        }}
      />

      {/* Breadcrumb JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://stats.tennismylife.org/" },
              { "@type": "ListItem", position: 2, name: "Tournaments", item: "https://stats.tennismylife.org/tournaments" },
              { "@type": "ListItem", position: 3, name: humanizedName, item: url }
            ]
          }),
        }}
      />

      {/* Componenti UI */}
      <h1 className="sr-only">{humanizedName}</h1>
      <TournamentHeaderServer id={tournament.id} />
      <TournamentServer id={tournament.id} />
    </>
  );
}
