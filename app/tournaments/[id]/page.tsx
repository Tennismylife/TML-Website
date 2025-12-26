import type { Metadata } from 'next';
import React from 'react';
import TournamentClient from './TournamentClient';
import { prisma } from '../../../lib/prisma';
import { redirect } from 'next/navigation';

// Function to create URL-friendly slug from text
function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Function to extract name from Json field
function extractName(nameField: any): string {
  if (typeof nameField === 'string') return nameField;
  if (nameField && typeof nameField === 'object') {
    // Try to get English name first, then any available name
    return nameField.en || nameField.default || Object.values(nameField)[0] || '';
  }
  return '';
}

function humanizeName(name: string) {
  return name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const resolvedParams = await params;
  const param = resolvedParams.id;

  // Find tournament by ID or slug
  let tournament;
  if (!param.includes('-')) {
    // It's an ID (no hyphens) - find by ID
    tournament = await prisma.tournament.findUnique({
      where: { id: param },
      select: { id: true, name: true },
    });
  } else {
    // It's a slug (contains hyphens) - find by slug
    const allTournaments = await prisma.tournament.findMany({
      select: { id: true, name: true },
    });
    tournament = allTournaments.find(t => {
      const name = extractName(t.name);
      return name && createSlug(name) === param;
    });
  }

  if (!tournament) {
    return {
      title: 'Tournament Not Found | TML',
      description: 'Tournament not found.',
    };
  }

  const name = extractName(tournament.name) || `Tournament ${tournament.id}`;
  const humanizedName = humanizeName(name);
  const slug = createSlug(name);
  const title = `${humanizedName} — Tournament | TML`;
  const description = `Tournament page for ${humanizedName} — results, past champions and records.`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = `${siteUrl}/tournaments/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'website',
    },
    alternates: { canonical: url },
  };
}

export default async function TournamentPage(props: any) {
  const params = (await props.params) ?? {};
  const param = params.id;

  // Find tournament by ID or slug
  let tournament;
  if (!param.includes('-')) {
    // It's an ID (no hyphens) - find by ID and redirect to slug
    tournament = await prisma.tournament.findUnique({
      where: { id: param },
      select: { id: true, name: true },
    });

    if (tournament) {
      const name = extractName(tournament.name);
      const slug = createSlug(name);
      redirect(`/tournaments/${slug}`);
    }
  } else {
    // It's a slug (contains hyphens) - find by slug
    const allTournaments = await prisma.tournament.findMany({
      select: { id: true, name: true },
    });
    tournament = allTournaments.find(t => {
      const name = extractName(t.name);
      return name && createSlug(name) === param;
    });
  }

  if (!tournament) {
    return <div>Tournament not found</div>;
  }

  const name = extractName(tournament.name) || `Tournament ${tournament.id}`;
  const humanizedName = humanizeName(name);
  const slug = createSlug(name);
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
      <TournamentClient id={tournament.id} />
    </>
  );
}
