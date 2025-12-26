import type { Metadata } from 'next';
import React from 'react';
import PlayerClient from './PlayerClient';
import { prisma } from '../../../lib/prisma';
import { redirect } from 'next/navigation';

// Funzione per rendere il nome leggibile
function humanizeName(name: string) {
  return name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params, searchParams }: any): Promise<Metadata> {
  const { id: slugParam } = await params;
  const sp = await searchParams;
  const tab = sp?.tab || 'overview';

  // Trova il giocatore
  let player = null;
  if (!slugParam.includes('-')) {
    player = await prisma.player.findUnique({
      where: { id: String(slugParam) },
      select: { id: true, player: true, atpname: true, slug: true },
    });
  } else {
    player = await prisma.player.findUnique({
      where: { slug: slugParam },
      select: { id: true, player: true, atpname: true, slug: true },
    });
  }

  if (!player) {
    return {
      title: 'Player Not Found | TML',
      description: 'Player not found.',
    };
  }

  const name = player.atpname || player.player || `Player ${player.id}`;
  const humanizedName = humanizeName(name);
  const slug = player.slug;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = `${siteUrl}/players/${slug}${tab !== 'overview' ? `?tab=${tab}` : ''}`;

  return {
    title: `${humanizedName} — ${tab.charAt(0).toUpperCase() + tab.slice(1)} | TML`,
    description: `Player profile and statistics for ${humanizedName} — ${tab} tab on TML.`,
    openGraph: {
      title: `${humanizedName} — ${tab.charAt(0).toUpperCase() + tab.slice(1)} | TML`,
      description: `Player profile and statistics for ${humanizedName} — ${tab} tab on TML.`,
      url,
      type: 'profile',
    },
    alternates: { canonical: url },
  };
}

export default async function PlayerPage({ params, searchParams }: any) {
  const { id: slugParam } = await params;
  const sp = await searchParams;
  const tab = sp?.tab || 'overview';

  // Trova il giocatore
  let player = null;
  if (!slugParam.includes('-')) {
    player = await prisma.player.findUnique({
      where: { id: String(slugParam) },
      select: { id: true, player: true, atpname: true, slug: true },
    });
    if (player) {
      redirect(`/players/${player.slug}${tab !== 'overview' ? `?tab=${tab}` : ''}`);
    }
  } else {
    player = await prisma.player.findUnique({
      where: { slug: slugParam },
      select: { id: true, player: true, atpname: true, slug: true },
    });
  }

  if (!player) return <div>Player not found</div>;

  const name = player.atpname || player.player || `Player ${player.id}`;
  const humanizedName = humanizeName(name);
  const slug = player.slug;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = `${siteUrl}/players/${slug}${tab !== 'overview' ? `?tab=${tab}` : ''}`;

  return (
    <>
      {/* JSON-LD per SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: humanizedName,
            url,
          }),
        }}
      />
      {/* Componente client con gestione dei tab */}
      <PlayerClient params={{ id: player.id, tab }} />
    </>
  );
}
