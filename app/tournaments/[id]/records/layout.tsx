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
  const { id: param, segments } = await params;
  const site = process.env.SITE_URL || 'https://stats.tennismylife.org';

  // derive tab/subtab from catch-all segments (if present) up front
  const segs = Array.isArray(segments) ? segments : (segments ? [segments] : []);
  const tab = segs.length > 0 ? segs[0] : null;
  const sub = segs.length > 1 ? segs[1] : null;

  // Build deterministic metadata based on the path immediately so we have specific
  // titles and OG images even if DB access is slow or unavailable.
  const displayFromParam = humanizeName(String(param ?? 'Tournament').replace(/-/g, ' '));
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

  const typeLabelFromParam = tab ? (tab === 'ages' ? 'Ages' : (tabLabels[tab] ?? humanizeName(tab))) : 'Records';
  const titleFromParam = `${displayFromParam} | ${typeLabelFromParam}`;
  const ogUrlFromParam = `${site}/tournaments/${param}/records${tab ? `/${tab}` : ''}${sub ? `/${sub}` : ''}`;
  const ogImageFromParam = `${site}/api/og/tournament/${param}?page=records${tab ? `&tab=${tab}` : ''}${sub ? `&sub=${sub}` : ''}`;

  // Return the deterministic metadata immediately.
  // We keep the DB lookup below (best-effort) but do not block the metadata on it.
  // If you later want enriched metadata (e.g., different display name from DB),
  // we can update to use that, but this guarantees consistent previews now.
  const baseMeta: Metadata = {
    title: titleFromParam,
    openGraph: {
      title: titleFromParam,
      url: ogUrlFromParam,
      siteName: 'TML',
      images: [{ url: ogImageFromParam, alt: `${displayFromParam} - ${typeLabelFromParam}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: titleFromParam,
      images: [ogImageFromParam],
    },
    alternates: { canonical: ogUrlFromParam },
  };

  // Best-effort DB lookup (do not change behavior if it fails)
  (async () => {
    try {
      let tournament: any = null;
      if (/^\d+$/.test(param)) {
        const canonicalId = await resolveCanonicalTourneyId(param);
        if (canonicalId) {
          const idNum = parseInt(canonicalId, 10);
          tournament = await prisma.tournament.findUnique({ where: { id: idNum }, select: { id: true, name: true, slug: true } });
        }
      } else {
        tournament = await prisma.tournament.findUnique({ where: { slug: param }, select: { id: true, name: true, slug: true } });
      }

      // We're intentionally not returning a different metadata object here to keep
      // metadata deterministic and fast. This async lookup is only for potential
      // future improvements (logging/metrics), not to delay metadata.
    } catch (err) {
      // ignore
    }
  })();

  return baseMeta;
}


export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  // layout just renders children; metadata is handled by generateMetadata
  return <>{children}</>;
}
