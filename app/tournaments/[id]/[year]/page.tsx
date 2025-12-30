import { redirect } from 'next/navigation';
import { prisma } from "@/lib/prisma";
import { resolveTourneyIds } from '@/lib/tournament';
import TournamentEditionClient from './TournamentEditionClient';

const roundOrder: Record<string, number> = {
  "R256": 1,
  "R128": 2,
  "R64": 3,
  "R32": 4,
  "R16": 5,
  "QF": 6,
  "SF": 7,
  "F": 8,
};

// Funzione per rendere il nome leggibile
function humanizeName(name: any) {
  const s = String(name || '');
  return s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Funzione per estrarre il primo nome dal JSON
function extractName(nameField: any): string {
  if (!nameField) return '';
  if (typeof nameField === 'string') return nameField;
  if (typeof nameField === 'number' || typeof nameField === 'boolean') return String(nameField);
  if (Array.isArray(nameField)) {
    for (const v of nameField) {
      const r = extractName(v);
      if (r) return r;
    }
    return '';
  }
  if (typeof nameField === 'object') {
    for (const v of Object.values(nameField)) {
      const r = extractName(v);
      if (r) return r;
    }
    return '';
  }
  return '';
}

type PageProps = {
  params: Promise<{ id: string; year: string }>;
};

export default async function TournamentEditionPage({ params }: PageProps) {
  const { id, year: yearRaw } = await params;
  const year = Number.parseInt(yearRaw, 10);

  if (isNaN(year)) {
    return <div>Invalid year</div>;
  }

  // Handle numeric ID redirect to slug
  if (/^\d+$/.test(id)) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/tournaments/${id}/header`, {
        cache: 'no-store' // Don't cache this fetch
      });
      if (res.ok) {
        const data = await res.json();
        const slug = data?.slug;
        if (slug) {
          redirect(`/tournaments/${slug}/${year}`);
        }
      }
    } catch (e) {
      // ignore and continue
    }
  }

  // Resolve tournament IDs
  const tourneyIds = await resolveTourneyIds(id);
  if (!tourneyIds) {
    return <div>Tournament not found</div>;
  }

  // Fetch tournament data
  const tournament = await prisma.tournament.findUnique({
    where: { slug: id },
    select: {
      id: true,
      name: true,
      city: true,
      country: true,
      ioc: true,
      atp_category: true,
    },
  });

  if (!tournament) {
    return <div>Tournament not found</div>;
  }

  // Fetch matches for the year
  const tourneyIdFilters = tourneyIds.flatMap((tid: string) => [{ tourney_id: tid }, { tourney_id: { endsWith: `-${tid}` } }]);

  const matches = await prisma.match.findMany({
    where: {
      OR: tourneyIdFilters,
      year: year,
    },
  });

  // Sort matches
  matches.sort((a, b) => {
    const orderA = roundOrder[a.round] ?? 999;
    const orderB = roundOrder[b.round] ?? 999;
    return orderA - orderB;
  });

  if (matches.length === 0) {
    return <div>No matches found for {year}.</div>;
  }

  // Get tournament name and start date
  const tourneyName = extractName(tournament.name) || `Tournament ${tournament.id}`;
  const humanizedName = humanizeName(tourneyName);
  const startDate = matches[0]?.tourney_date;
  const endDate = matches[matches.length - 1]?.tourney_date; // Last match date

  // Build location string
  const city = extractName(tournament.city);
  const country = extractName(tournament.country);
  const location = [city, country].filter(Boolean).join(', ') || 'Unknown Location';

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = `${siteUrl}/tournaments/${id}/${year}`;

  // Build description
  const description = `${humanizedName} ${year} - Tennis tournament with ${matches.length} matches. ${tournament.atp_category ? `ATP ${extractName(tournament.atp_category)} level tournament.` : ''} Held in ${location}.`;

  return (
    <>
      {/* JSON-LD for SportsEvent */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SportsEvent',
            name: `${humanizedName} ${year}`,
            description,
            startDate: startDate ? new Date(startDate).toISOString().split('T')[0] : undefined,
            endDate: endDate ? new Date(endDate).toISOString().split('T')[0] : undefined,
            eventStatus: 'https://schema.org/EventScheduled',
            location: {
              '@type': 'Place',
              name: location,
            },
            organizer: {
              '@type': 'Organization',
              name: 'ATP Tour',
              url: 'https://www.atptour.com',
            },
            performer: {
              '@type': 'SportsTeam',
              name: 'ATP Tour Players',
            },
            image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop',
            offers: {
              '@type': 'Offer',
              name: 'Watch Live',
              url: 'https://www.atptour.com/en/watch',
              availability: 'https://schema.org/InStock',
            },
            url,
          }),
        }}
      />

      <TournamentEditionClient
        id={id}
        year={year.toString()}
        initialMatches={matches}
        tournamentName={humanizedName}
        startDate={startDate}
        location={location}
      />
    </>
  );
}
