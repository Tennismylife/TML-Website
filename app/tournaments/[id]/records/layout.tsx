import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import React from 'react';
import { resolveCanonicalTourneyId } from '@/lib/tournament';

// Helper to extract name (server-side)
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
function humanizeName(name: any) {
  const s = String(name || '');
  return s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { id: param, segments } = params || {};
  if (!param) return { title: 'Tournament Records | TML' };

  let tournament: any = null;
  if (/^\d+$/.test(param)) {
    const canonicalId = await resolveCanonicalTourneyId(param);
    if (!canonicalId) return { title: 'Tournament Records | TML' };
    const idNum = parseInt(canonicalId, 10);
    tournament = await prisma.tournament.findUnique({ where: { id: idNum }, select: { id: true, name: true, slug: true } });
  } else {
    tournament = await prisma.tournament.findUnique({ where: { slug: param }, select: { id: true, name: true, slug: true } });
  }

  if (!tournament) return { title: 'Tournament Records | TML' };

  // Prefer humanized DB slug for the browser tab when available, fall back to stored name
  const display = tournament.slug
    ? humanizeName(String(tournament.slug).replace(/-/g, ' '))
    : humanizeName(extractName(tournament.name) || `Tournament ${tournament.id}`);

  // derive tab/subtab from catch-all segments (if present)
  const segs = Array.isArray(segments) ? segments : (segments ? [segments] : []);
  const tab = segs.length > 0 ? segs[0] : null;
  const sub = segs.length > 1 ? segs[1] : null;

  // mapping for human-friendly tab/sub labels
  const tabLabels: Record<string, string> = {
    count: 'Counts',
    rounds: 'Rounds',
    ages: 'Ages',
    percentage: 'Percentages',
    timespan: 'Timespans',
    'rounds-on-entries': 'Rounds on Entries',
    least: 'Least',
    'average-age': 'Average Age',
  };

  const agesSub: Record<string, string> = {
    main: 'Main',
    winners: 'Winners',
    titles: 'Titles',
    youngestrounds: 'Youngest Rounds',
    oldestrounds: 'Oldest Rounds',
  };

  const percSub: Record<string, string> = {
    overall: 'Overall',
    'per-round': 'Per Round',
    rounds: 'Per Round',
  };

  let typeLabel = 'Records';
  if (tab) {
    const base = tabLabels[tab] ?? humanizeName(tab);
    if (tab === 'ages' && sub) typeLabel = `${base} — ${(agesSub[sub] ?? humanizeName(sub))}`;
    else if (tab === 'percentage' && sub) typeLabel = `${base} — ${(percSub[sub] ?? humanizeName(sub))}`;
    else typeLabel = base;
  }

  const site = 'https://stats.tennismylife.org';
  const ogUrl = `${site}/tournaments/${tournament.slug || param}/records${tab ? `/${tab}` : ''}${sub ? `/${sub}` : ''}`;

  const titleText = `${display} | ${typeLabel}`;

  // Primary social image: dynamic OG generator with page/tab/sub info
  const ogImage = `${site}/api/og/tournament/${tournament.slug || param}?page=records${tab ? `&tab=${tab}` : ''}${sub ? `&sub=${sub}` : ''}`;

  return {
    title: titleText,
    openGraph: {
      title: titleText,
      url: ogUrl,
      siteName: 'TML',
      images: [
        { url: ogImage, alt: `${display} - ${typeLabel}` },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: titleText,
      images: [ogImage],
    },
    alternates: { canonical: ogUrl },
  };
}

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  // layout just renders children; metadata is handled by generateMetadata
  return <>{children}</>;
}
