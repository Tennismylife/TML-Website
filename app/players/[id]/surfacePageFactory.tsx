import React from 'react';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import PlayerTabPage from './[tab]/page';

async function resolvePlayer(id: string) {
  const isSlug = !/^\d+$/.test(String(id));
  if (isSlug) {
    return prisma.player.findUnique({
      where: { slug: String(id).toLowerCase() },
      select: { id: true, atpname: true, player: true, slug: true },
    });
  }
  return prisma.player.findUnique({
    where: { id: String(id) },
    select: { id: true, atpname: true, player: true, slug: true },
  });
}

export type SurfaceKey = 'Clay' | 'Hard' | 'Grass';

const SURFACE_META: Record<SurfaceKey, { label: string; adjective: string }> = {
  Clay:  { label: 'Clay Court',  adjective: 'clay'  },
  Hard:  { label: 'Hard Court',  adjective: 'hard'  },
  Grass: { label: 'Grass Court', adjective: 'grass' },
};

export async function generateSurfaceMetadata(id: string, surface: SurfaceKey): Promise<Metadata> {
  let player: any = null;
  try { player = await resolvePlayer(id); } catch (e) {}
  const name = player ? (player.atpname || player.player) : String(id);
  const slug = player?.slug || String(id);
  const surfPath = surface.toLowerCase();
  const { label, adjective } = SURFACE_META[surface];
  const title = `${name} ${label.replace(' Court', '')} – Match Results & Stats`;
  const description = `${name} career ${adjective} court stats: win-loss record by year, categories, ranking performance, rounds, sets and complete match history. Full ATP data on TennisMyLife.`;
  const canonical = `https://stats.tennismylife.org/players/${encodeURIComponent(slug)}/${surfPath}`;
  const imageUrl = `https://stats.tennismylife.org/og/${encodeURIComponent(slug)}.png`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'profile',
      url: canonical,
      siteName: 'TennisMyLife',
      title,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: `${name} ${adjective} court stats` }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [{ url: imageUrl, alt: `${name} ${adjective} stats` }] },
    robots: { index: true, follow: true },
  } as Metadata;
}

interface SurfacePageContentProps {
  id: string;
  surface: SurfaceKey;
}

export default async function SurfacePageContent({ id, surface }: SurfacePageContentProps) {
  let player: any = null;
  try { player = await resolvePlayer(id); } catch (e) {}
  if (!player) return <div className="text-red-500 font-bold">Player not found</div>;

  const displayName = player.atpname || player.player;
  const slug = player.slug || String(id);
  const surfPath = surface.toLowerCase();
  const { label, adjective } = SURFACE_META[surface];
  const canonical = `https://stats.tennismylife.org/players/${encodeURIComponent(slug)}/${surfPath}`;

  // SSR aggregate counts for SEO paragraph and JSON-LD
  let totalMatches = 0, wins = 0, losses = 0;
  let titles: string[] = [];
  let totalTitles = 0;
  try {
    totalMatches = await prisma.match.count({
      where: {
        status: true,
        surface: { contains: surface, mode: 'insensitive' },
        OR: [{ winner_id: player.id }, { loser_id: player.id }],
      },
    });
    wins = await prisma.match.count({
      where: { status: true, winner_id: player.id, surface: { contains: surface, mode: 'insensitive' } },
    });
    losses = totalMatches - wins;

    const finals = await prisma.match.findMany({
      where: {
        status: true,
        winner_id: player.id,
        round: 'F',
        surface: { contains: surface, mode: 'insensitive' },
        team_event: { not: true },
        NOT: { score: { contains: 'WEA' } },
      },
      select: { tourney_name: true },
    });
    totalTitles = finals.length;
    const rawTitles = (finals || []).map((f: any) => {
      if (!f?.tourney_name) return null;
      if (typeof f.tourney_name === 'string') return f.tourney_name;
      if (typeof f.tourney_name === 'object') return f.tourney_name.en || Object.values(f.tourney_name)[0] || null;
      return String(f.tourney_name);
    }).filter(Boolean) as string[];
    titles = Array.from(new Set(rawTitles));
  } catch (e) {}

  const winPct = totalMatches > 0 ? `${((wins / totalMatches) * 100).toFixed(1)}%` : '0%';
  const heading = `${displayName} ${label.replace(' Court', '')} – Match Results & Stats`;

  return (
    <>
      <h1 className="text-3xl font-bold mb-6 text-center">{heading}</h1>
      <p className="text-center mb-6">
        {displayName} has played {totalMatches} matches on {adjective} courts, winning {wins} and losing {losses} (win percentage: {winPct}).
        {' '}Career {adjective} titles: {totalTitles}.
        {titles.length > 0 && <>{' '}Titles: {titles.join(', ')}.</>}
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "name": heading,
        "description": `${displayName} career ${adjective} court stats: ${wins}-${losses} (${winPct}) with ${totalTitles} title${totalTitles !== 1 ? 's' : ''}.`,
        "about": { "@type": "Person", "name": displayName },
        "statistics": [
          { "@type": "PropertyValue", "name": "matchesPlayed",      "value": totalMatches },
          { "@type": "PropertyValue", "name": "wins",               "value": wins },
          { "@type": "PropertyValue", "name": "losses",             "value": losses },
          { "@type": "PropertyValue", "name": "winPercentage",      "value": winPct },
          { "@type": "PropertyValue", "name": `${adjective}Titles`, "value": totalTitles },
        ],
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Players",        "item": "https://stats.tennismylife.org/players" },
          { "@type": "ListItem", "position": 2, "name": displayName,      "item": `https://stats.tennismylife.org/players/${slug}` },
          { "@type": "ListItem", "position": 3, "name": "Surface Stats",  "item": `https://stats.tennismylife.org/players/${slug}/clay` },
          { "@type": "ListItem", "position": 4, "name": `${label} Stats`, "item": canonical },
        ],
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": `What are ${displayName}'s ${adjective} court stats?`,
            "acceptedAnswer": { "@type": "Answer", "text": `${displayName} has played ${totalMatches} matches on ${adjective}, winning ${wins} and losing ${losses} for a career win percentage of ${winPct}.` },
          },
          {
            "@type": "Question",
            "name": `How many ${adjective} court titles has ${displayName} won?`,
            "acceptedAnswer": { "@type": "Answer", "text": `${displayName} has won ${totalTitles} ATP title${totalTitles !== 1 ? 's' : ''} on ${adjective} courts${titles.length > 0 ? ': ' + titles.join(', ') : '.'}` },
          },
          {
            "@type": "Question",
            "name": `What is ${displayName}'s win percentage on ${adjective}?`,
            "acceptedAnswer": { "@type": "Answer", "text": `${displayName}'s career win percentage on ${adjective} courts is ${winPct} (${wins} wins out of ${totalMatches} matches).` },
          },
          {
            "@type": "Question",
            "name": `Does this page include Grand Slam matches on ${adjective}?`,
            "acceptedAnswer": { "@type": "Answer", "text": `Yes. ${displayName}'s ${adjective} court stats include all Grand Slam matches played on ${adjective}, such as Roland Garros (clay), the Australian Open and US Open (hard), or Wimbledon (grass).` },
          },
          {
            "@type": "Question",
            "name": `How is win percentage on ${adjective} calculated?`,
            "acceptedAnswer": { "@type": "Answer", "text": `Win percentage is calculated as (Total Wins ÷ Total Matches Played) × 100. It measures how successful ${displayName} has been specifically on ${adjective} courts throughout their career.` },
          },
          {
            "@type": "Question",
            "name": `Are Davis Cup matches included in ${displayName}'s ${adjective} court stats?`,
            "acceptedAnswer": { "@type": "Answer", "text": `No. This page focuses on official ATP Tour and Grand Slam matches on ${adjective} courts, excluding Davis Cup and other team events.` },
          },
        ],
      }) }} />

      {/* Delegate to the full player page shell with surface tab active */}
      <PlayerTabPage
        params={Promise.resolve({ id, tab: surfPath })}
        searchParams={Promise.resolve({})}
      />
    </>
  );
}
