import type { Metadata } from 'next';
import React from 'react';
import TournamentClient from './TournamentClient';
import TournamentHeader from './TournamentHeader';
import { prisma } from '../../../lib/prisma';
import { redirect } from 'next/navigation';
import { resolveCanonicalTourneyId } from '@/lib/tournament';

// Funzione per rendere il nome leggibile
function humanizeName(name: any) {
  const s = String(name || '');
  return s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Funzione per estrarre il primo nome dal JSON (solo per visualizzazione)
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

export default async function TournamentPage({ params }: any) {
  const { id: param } = await params;

  // Trova torneo per ID o slug
  let tournament = null;
  if (/^\d+$/.test(param)) {
    const canonicalId = await resolveCanonicalTourneyId(param);
    if (!canonicalId) return <div>Tournament not found</div>;
    const idNum = parseInt(canonicalId, 10);
    tournament = await prisma.tournament.findUnique({ where: { id: idNum } });

    if (tournament?.slug) {
      redirect(`/tournaments/${tournament.slug}`);
    } else if (tournament && !tournament.slug) {
      return <div>Tournament not found</div>;
    }
  } else {
    tournament = await prisma.tournament.findUnique({ where: { slug: param } });
  }

  if (!tournament) return <div>Tournament not found</div>;

  const name = extractName(tournament.name) || `Tournament ${tournament.id}`;
  const humanizedName = humanizeName(name);
  const slug = tournament.slug;
  if (!slug) return <div>Tournament not found</div>;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = `${siteUrl}/tournaments/${slug}`;

  // Fallback automatici per campi obbligatori
  const locationName = tournament.city || "TBD";
  const country = tournament.country || "TBD";
  const startDate = tournament.startDate?.toISOString() || "2025-01-01";
  const endDate = tournament.endDate?.toISOString() || "2025-01-14";
  const image = tournament.image || "https://example.com/default-tournament.jpg";
  const description = `Tournament page for ${humanizedName} – results, past champions and records.`;
  const winnerName = tournament.winner || "TBD";

  return (
    <>
      {/* JSON-LD per Google Rich Results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsEvent",
            "name": humanizedName,
            "sport": "Tennis",
            "url": url,
            "mainEntityOfPage": url,
            "description": description,
            "image": image,
            "startDate": startDate,
            "endDate": endDate,
            "eventStatus": "https://schema.org/EventScheduled",
            "location": {
              "@type": "Place",
              "name": locationName,
              "address": {
                "@type": "PostalAddress",
                "addressCountry": country
              }
            },
            "performer": [
              {
                "@type": "Person",
                "name": winnerName
              }
            ],
            "organizer": {
              "@type": "SportsOrganization",
              "name": "ATP Tour"
            }
            // "offers" può essere aggiunto se gestisci biglietti
          })
        }}
      />

      {/* Componenti UI */}
      <TournamentHeader id={tournament.id} />
      <TournamentClient id={tournament.id} />
    </>
  );
}
