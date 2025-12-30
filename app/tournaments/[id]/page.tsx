import type { Metadata } from 'next';
import React from 'react';
import TournamentClient from './TournamentClient';
import TournamentHeader from './TournamentHeader';
import { prisma } from '../../../lib/prisma';
import { redirect } from 'next/navigation';
import { resolveCanonicalTourneyId } from '@/lib/tournament';


// Funzione per rendere il nome leggibile (accetta qualsiasi valore e lo converte in stringa)
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

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { id: param } = await params;

  // Trova torneo per ID o slug
  let tournament = null;
  if (/^\d+$/.test(param)) {
    // ID numerico → trova torneo (uso ID canonical se presente)
    const canonicalId = await resolveCanonicalTourneyId(param);
    if (!canonicalId) {
      return {
        title: 'Tournament Not Found | TML',
        description: 'Tournament not found.',
      };
    }
    const idNum = parseInt(canonicalId, 10);
    // fetch full row to access DB slug
    tournament = await prisma.tournament.findUnique({
      where: { id: idNum },
    });
  } else {
    // Treat param as slug: find by DB slug
    tournament = await prisma.tournament.findUnique({
      where: { slug: param },
    });
  }

  if (!tournament) {
    return {
      title: 'Tournament Not Found | TML',
      description: 'Tournament not found.',
    };
  }

  const humanizedName = humanizeName(tournament.slug);
  const slug = tournament.slug;
  if (!slug) {
    return {
      title: 'Tournament Not Found | TML',
      description: 'Tournament slug missing.',
    };
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = `${siteUrl}/tournaments/${slug}`;

  return {
    title: `${humanizedName} — Tournament | TML`,
    description: `Tournament page for ${humanizedName} — results, past champions and records.`,
    openGraph: {
      title: `${humanizedName} — Tournament | TML`,
      description: `Tournament page for ${humanizedName} — results, past champions and records.`,
      url,
      type: 'website',
    },
    alternates: { canonical: url },
  };
}



export default async function TournamentPage({ params }: any) {
  const { id: param } = await params;

  // Trova torneo per ID o slug
  let tournament = null;
  if (/^\d+$/.test(param)) {
    // ID numerico → resolve canonical DB id and always redirect to slug-based URL when available
    const canonicalId = await resolveCanonicalTourneyId(param);
    if (!canonicalId) return <div>Tournament not found</div>;
    const idNum = parseInt(canonicalId, 10);
    tournament = await prisma.tournament.findUnique({
      where: { id: idNum },
    });

    // If we have a DB slug, prefer canonical slug URL for SEO and consistency
    if (tournament && tournament.slug) {
      redirect(`/tournaments/${tournament.slug}`);
    } else if (tournament && !tournament.slug) {
      return <div>Tournament not found</div>;
    }
  } else {
    // Treat param as slug: find by DB slug
    tournament = await prisma.tournament.findUnique({
      where: { slug: param },
    });
  }

  if (!tournament) return <div>Tournament not found</div>;

  const name = extractName(tournament.name) || `Tournament ${tournament.id}`;
  const humanizedName = humanizeName(name);
  const slug = tournament.slug;
  if (!slug) return <div>Tournament not found</div>;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = `${siteUrl}/tournaments/${slug}`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SportsEvent',
            name: humanizedName,
            url,
          }),
        }}
      />

      <TournamentHeader id={tournament.id} />
      <TournamentClient id={tournament.id} />
    </>
  );
}
