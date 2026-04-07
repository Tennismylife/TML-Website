import React from 'react';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

export async function generateMetadata({ params, searchParams }: any): Promise<Metadata> {
  // `params` can be a Promise in this Next.js version, await it first
  const resolvedParams = await params;
  const { id, year: paramYear } = resolvedParams ?? {};
  const resolvedSearch = await searchParams;
  const year = paramYear ?? (resolvedSearch && (resolvedSearch.year || (resolvedSearch.get && resolvedSearch.get('year'))));

  // Resolve player name & slug
  let player: any = null;
  try {
    const isSlug = !/^\d+$/.test(String(id));
    if (isSlug) {
      player = await prisma.player.findUnique({ where: { slug: String(id).toLowerCase() }, select: { atpname: true, player: true, slug: true } });
    } else {
      player = await prisma.player.findUnique({ where: { id: String(id) }, select: { atpname: true, player: true, slug: true } });
    }
  } catch (e) {
    // ignore
  }

  const name = player ? (player.atpname || player.player) : String(id);
  const slug = player?.slug ?? String(id);

  let title: string;
  let description: string;
  let canonical: string;

  if (year) {
    const y = String(year);
    title = `${name} ${y} Season Stats | Wins, Titles & Match Results | TennisMyLife`;
    description = `Complete ${name} ${y} season stats: match results, win-loss record, titles won, surface performance (hard, clay, grass) and detailed ATP breakdown on TennisMyLife.`;
    canonical = `https://stats.tennismylife.org/players/${encodeURIComponent(slug)}/season/${encodeURIComponent(y)}`;
  } else {
    title = `${name} — Seasons | TennisMyLife`;
    description = `Season-by-season statistics for ${name}: wins, titles, results, and seasonal performance.`;
    canonical = `https://stats.tennismylife.org/players/${encodeURIComponent(slug)}/season`;
  }

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
      images: [{ url: imageUrl }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [imageUrl] },
    robots: { index: true, follow: true },
  } as Metadata;
}

export default async function SeasonLayout({ children, searchParams }: any) {
  return <>{children}</>;
}
