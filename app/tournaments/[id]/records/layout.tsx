import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import React from 'react';
import { resolveCanonicalTourneyId } from '@/lib/tournament';
import CountModalOutlet from '@/components/CountModalOutlet';
import AgesModalOutlet from '@/components/AgesModalOutlet';
import PercentageModalOutlet from '@/components/PercentageModalOutlet';
import TimespanModalOutlet from '@/components/TimespanModalOutlet';
import RoundOnEntriesModalOutlet from '@/components/RoundOnEntriesModalOutlet';
import LeastModalOutlet from '@/components/LeastModalOutlet';

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

// Convert slug or param to human-readable title
function humanizeName(name: any) {
  const s = String(name || '');
  return s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Generate JSON-LD for Discover / SEO
function generateJsonLd(title: string, description: string, url: string, image: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": title,
    "description": description,
    "url": url,
    "image": image,
  };
}

// Generate keywords dynamically
function generateKeywords(displayName: string, tab: string | null, sub: string | null) {
  const baseKeywords = ['tennis', 'records', 'stats', 'tournament', displayName];
  if (tab) baseKeywords.push(tab);
  if (sub) baseKeywords.push(sub);
  return baseKeywords.join(', ');
}

// ---------------- METADATA ----------------
async function getTournament(param: string) {
  if (/^\d+$/.test(param)) {
    const canonicalId = await resolveCanonicalTourneyId(param);
    if (!canonicalId) return null;
    return prisma.tournament.findUnique({ where: { id: parseInt(canonicalId, 10) } });
  }
  return prisma.tournament.findUnique({ where: { slug: param } });
}

export async function generateMetadata({ params, searchParams }: any): Promise<Metadata> {
  const { id: param, segments } = await params;
  const sp = (await searchParams) ?? {};
  const site = process.env.SITE_URL || 'https://stats.tennismylife.org';

  // Resolve canonical tournament slug and prefer it for canonical URLs
  const tournament = await getTournament(String(param));
  const canonicalTournamentSlug = tournament?.slug ?? String(param);

  const segs = Array.isArray(segments) ? segments : (segments ? [segments] : []);
  const tab = segs.length > 0 ? segs[0] : null;
  const sub = segs.length > 1 ? segs[1] : null;

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
  const subLabel = sub ? ` — ${humanizeName(sub)}` : '';

  let titleFromParam = `${displayFromParam} | ${typeLabelFromParam}${subLabel}`;
  let ogUrlFromParam = `${site}/tournaments/${canonicalTournamentSlug}/records${tab ? `/${tab}` : ''}${sub ? `/${sub}` : ''}`;
  const ogImageFromParam = `${site}/og/site-preview.png`;
  const fallbackDescription = `A curated collection of records at ${displayFromParam}. Explore Titles, Wins, Matches Played and Appearances, and discover historical trends in tournament history.`;
  const keywords = generateKeywords(displayFromParam, tab, sub);

  // Build canonical query string from common filters so filtered variants can be canonicalized when necessary
  function canonicalizeParamsObj(p: Record<string, any> | undefined) {
    if (!p) return '';
    const map = new Map<string, string[]>();

    for (const [k, v] of Object.entries(p)) {
      if (v === undefined) continue;
      const normalizeVal = (val: string) => {
        if (k === 'level') return val.toUpperCase();
        if (k === 'surface') return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
        if (k === 'round') return val.toUpperCase();
        if (k === 'subtab') return val.toLowerCase();
        return val;
      };

      const values = Array.isArray(v)
        ? v.map(String).map(normalizeVal)
        : [normalizeVal(String(v))];

      map.set(k, (map.get(k) ?? []).concat(values));
    }

    return Array.from(map.keys())
      .sort()
      .flatMap(k =>
        Array.from(new Set(map.get(k)!))
          .sort()
          .map(v => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      )
      .join('&');
  }

  const canonicalParams: Record<string, any> = {};
  ['surface','level','round','bestOf'].forEach(k => {
    const v = sp[k] ?? sp[`${k}[]`];
    if (v !== undefined) canonicalParams[k] = v;
  });

  const query = canonicalizeParamsObj(canonicalParams);
  const canonicalFull = ogUrlFromParam + (query ? `?${query}` : '');

  // Special-case: Youngest Title
  if (tab === 'ages' && sub === 'titles' && segs[2] === 'youngest') {
    const siteTitle = `Youngest Title Winners at ${displayFromParam} | Tennis Records`;
    const ogUrl = `${site}/tournaments/${canonicalTournamentSlug}/records/${tab}/${sub}/${segs[2]}`;
    return {
      title: siteTitle,
      description: fallbackDescription,
      keywords,
      openGraph: {
        title: siteTitle,
        url: ogUrl + (query ? `?${query}` : ''),
        siteName: 'Tennis My Life',
        description: fallbackDescription,
        images: [{ url: ogImageFromParam, alt: `${displayFromParam} - Youngest Title Winners`, width: 1200, height: 630, type: 'image/png' }],
      },
      twitter: { card: 'summary_large_image', title: siteTitle, description: fallbackDescription, images: [ogImageFromParam] },
      alternates: { canonical: ogUrl + (query ? `?${query}` : '') },
    };
  }

  // Special-case: Oldest Title
  if (tab === 'ages' && sub === 'titles' && segs[2] === 'oldest') {
    const siteTitle = `Oldest Title Winners at ${displayFromParam} | Tennis Records`;
    const ogUrl = `${site}/tournaments/${canonicalTournamentSlug}/records/${tab}/${sub}/${segs[2]}`;
    return {
      title: siteTitle,
      description: fallbackDescription,
      keywords,
      openGraph: {
        title: siteTitle,
        url: ogUrl + (query ? `?${query}` : ''),
        siteName: 'Tennis My Life',
        description: fallbackDescription,
        images: [{ url: ogImageFromParam, alt: `${displayFromParam} - Oldest Title Winners`, width: 1200, height: 630, type: 'image/png' }],
      },
      twitter: { card: 'summary_large_image', title: siteTitle, description: fallbackDescription, images: [ogImageFromParam] },
      alternates: { canonical: ogUrl + (query ? `?${query}` : '') },
    };
  }

  // Special-case: Least root (tournament-specific phrasing)
  if (tab === 'least' && !sub) {
    const siteTitle = `${displayFromParam} Least Games Lost to Reach a Round | Tennis Records`;
    const ogUrl = `${site}/tournaments/${canonicalTournamentSlug}/records/least`;
    return {
      title: siteTitle,
      description: fallbackDescription,
      keywords,
      openGraph: {
        title: siteTitle,
        url: ogUrl + (query ? `?${query}` : ''),
        siteName: 'Tennis My Life',
        description: fallbackDescription,
        images: [{ url: ogImageFromParam, alt: `${displayFromParam} - Least Games Lost`, width: 1200, height: 630, type: 'image/png' }],
      },
      twitter: { card: 'summary_large_image', title: siteTitle, description: fallbackDescription, images: [ogImageFromParam] },
      alternates: { canonical: ogUrl + (query ? `?${query}` : '') },
    };
  }

  // Default metadata for other pages
  const baseMeta: Metadata = {
    title: titleFromParam,
    description: fallbackDescription,
    keywords,
    openGraph: {
      title: titleFromParam,
      url: canonicalFull,
      siteName: 'Tennis My Life',
      description: fallbackDescription,
      images: [{ url: ogImageFromParam, alt: `${displayFromParam} - ${typeLabelFromParam}`, width: 1200, height: 630, type: 'image/png' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: titleFromParam,
      description: fallbackDescription,
      images: [ogImageFromParam],
    },
    alternates: { canonical: canonicalFull },
  };

  return baseMeta;
}

// ---------------- RECORDS LAYOUT ----------------
export default async function RecordsLayout({
  children,
  params,
}: {
  children?: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      {children}

      {/* Global client-side modal outlets */}
      <CountModalOutlet id={id} />
      <AgesModalOutlet id={id} />
      <PercentageModalOutlet id={id} />
      <TimespanModalOutlet id={id} />
      <RoundOnEntriesModalOutlet id={id} />
      <LeastModalOutlet id={id} />
    </>
  );
}
