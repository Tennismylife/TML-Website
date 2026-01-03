import type { Metadata } from 'next';
import React from 'react';
import TournamentClient from './TournamentClient';
import TournamentHeader from './TournamentHeader';
import { prisma } from '../../../lib/prisma';
import { redirect } from 'next/navigation';
import { resolveCanonicalTourneyId } from '@/lib/tournament';

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
export async function generateMetadata({ params }: any) {
  const { id: param } = await params;
  if (!param) return { title: 'Tournament | Tournament Stats, History, Match Results & Winners' };
  const tournament = await getTournament(param);
  const name = tournament ? (extractFirst(tournament.name) || `Tournament ${tournament.id}`) : String(param);
  const humanized = humanizeName(name);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const ogUrl = `${siteUrl}/tournaments/${tournament.slug || param}`;
  return { title: `${humanized} | Tournament Stats, History, Match Results & Winners`, openGraph: { url: ogUrl } };
}

export default async function TournamentPage({ params }: TournamentPageProps) {
  const { id: param } = await params;

  const tournament = await getTournament(param);
  if (!tournament) return <div>Tournament not found</div>;

  // Redirect se l’ID numerico ha uno slug canonico
  if (/^\d+$/.test(param) && tournament.slug) {
    redirect(`/tournaments/${tournament.slug}`);
  }

  // Estrazione valori dai campi JSON
  const name = extractFirst(tournament.name) || `Tournament ${tournament.id}`;
  const humanizedName = humanizeName(name);

  const locationName = extractFirst(tournament.city) || "TBD";
  const country = extractFirst(tournament.country) || "TBD";

  const category = extractAll(tournament.category) || "TBD";
  const surfaces = extractAll(tournament.surfaces) || "TBD";
  const indoor = extractFirst(tournament.indoor) || "TBD";

  const startDate = tournament.startDate ? tournament.startDate.toISOString() : new Date().toISOString();
  const endDate = tournament.endDate ? tournament.endDate.toISOString() : new Date().toISOString();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = `${siteUrl}/tournaments/${tournament.slug}`;

  const description = `Tournament page for ${humanizedName} – results, past champions and records.`;

  return (
    <>
      {/* JSON-LD per Google Rich Results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsEvent",
            name: humanizedName,
            sport: "Tennis",
            url,
            mainEntityOfPage: url,
            description,
            startDate,
            endDate,
            eventStatus: "https://schema.org/EventScheduled",
            image: "https://example.com/default-tournament.jpg",
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

      {/* Componenti UI */}
      <TournamentHeader id={tournament.id} />
      <TournamentClient id={tournament.id} />
    </>
  );
}
