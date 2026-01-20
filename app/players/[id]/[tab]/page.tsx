import React from 'react';
import PlayerClient from '../PlayerClient';
import SEOPlayer from '../SEOPlayer';
import SEOBreadcrumb from '../SEOBreadcrumb';
import { prisma } from '../../../../lib/prisma';
import { redirect } from 'next/navigation';
import { getPlayerHref } from '@/lib/utils';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

/**
 * Server-side helper to get a player by slug or id.
 * TODO: Replace with the project-wide `getPlayerBySlug` server helper when available.
 */
async function getPlayerBySlug(id: string): Promise<{ name: string; slug: string } | null> {
  const isSlug = !/^\d+$/.test(String(id));
  try {
    const p = isSlug
      ? await prisma.player.findUnique({ where: { slug: String(id).toLowerCase() }, select: { player: true, atpname: true, slug: true } })
      : await prisma.player.findUnique({ where: { id: String(id) }, select: { player: true, atpname: true, slug: true } });
    if (!p) return null;
    const name = (p.atpname || p.player) as string;
    return { name, slug: p.slug || String(id) };
  } catch (e) {
    return null;
  }
}

export async function generateMetadata(
  props: { params: Promise<{ id: string; tab?: string }> }
): Promise<Metadata> {
  const { params } = props;
  const { id, tab } = (await params) as { id: string; tab?: string };
  if (!id) return { title: 'Player | Tennis Statistics, Match Results & Rankings' } as Metadata; 

  const player = await getPlayerBySlug(id);
  const name = player?.name ?? String(id);
  const slug = player?.slug ?? String(id);

  // Build canonical URL using path segments (no query params)
  const base = 'https://stats.tennismylife.org';
  const isOverview = !tab || tab === 'overview';
  const canonical = isOverview ? `${base}/players/${encodeURIComponent(slug)}` : `${base}/players/${encodeURIComponent(slug)}/${encodeURIComponent(tab as string)}`;

  const parts = tab === 'matches'
    ? ['Stats', 'Matches', 'Results', 'Records & Rankings']
    : ['Stats', 'Overview', 'Records & Rankings'];
  const title = `${name} – ${parts.join(', ')} | TennisMyLife`;
  const description = `Statistiche complete di ${name}: risultati ATP, ${tab === 'matches' ? 'match 2026, ' : ''}record carriera, ranking, titoli, head‑to‑head e performance per superficie. Aggiornato al 2026.`;
  const imageUrl = `${base}/og/${encodeURIComponent(slug)}.png`;

  // Derive profile fields for Open Graph profile (if available)
  const nameParts = String(name).split(/\s+/).filter(Boolean);
  const firstName = nameParts.length ? nameParts[0] : undefined;
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : undefined;
  const profile: { firstName?: string; lastName?: string; username?: string } = {};
  if (firstName) profile.firstName = firstName;
  if (lastName) profile.lastName = lastName;
  if (slug) profile.username = slug;

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
      images: [{ url: imageUrl }],
      ...(Object.keys(profile).length ? { profile } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
      site: '@TennisMyLife68',
      creator: '@TennisMyLife68',
    },
    robots: { index: true, follow: true },
  } as Metadata;
}

export default async function PlayerTabPage({ params }: any) {
  const { id: slugParam, tab: tabParam } = await params;
  if (!slugParam) return <div>Player ID not provided</div>;

  const isSlug = !/^\d+$/.test(String(slugParam));

  // PLAYER
  const player = !isSlug
    ? await prisma.player.findUnique({ where: { id: String(slugParam) }, select: { id: true, player: true, atpname: true, slug: true, birthdate: true, ioc: true, birthplace: true } })
    : await prisma.player.findUnique({ where: { slug: String(slugParam).toLowerCase() }, select: { id: true, player: true, atpname: true, slug: true, birthdate: true, ioc: true, birthplace: true } });

  if (!player) return <div>Player not found: {slugParam}</div>;

  // Redirect numeric ID to slug while preserving requested tab
  if (!isSlug && player.slug) {
    redirect(`${getPlayerHref(player.slug)}/${encodeURIComponent(String(tabParam || 'matches'))}`);
  }

  // Determine tab for SEO (use 'overview' when missing) and fetch matches server-side for JSON-LD
  const tab = tabParam ?? 'overview';
  const matches = await prisma.match.findMany({
    where: { OR: [{ winner_id: player.id }, { loser_id: player.id }] },
    select: { status: true, winner_id: true, loser_id: true, surface: true },
  });

  // Render SEO script BEFORE the client component (must be server-rendered)
  return (
    <>
      <SEOPlayer
        playerId={player.id}
        slug={player.slug}
        name={player.atpname || player.player}
        atpname={player.atpname}
        birthdate={player.birthdate ? (player.birthdate instanceof Date ? player.birthdate.toISOString() : String(player.birthdate)) : undefined}
        ioc={player.ioc}
        birthplace={player.birthplace}
        tab={tab}
        matches={matches}
      />

      <SEOBreadcrumb slug={player.slug} name={player.atpname || player.player} tab={tab} />

      <PlayerClient params={{ id: player.id, tab: tabParam ?? 'matches' }} />
    </>
  );
}
