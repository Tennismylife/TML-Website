import React from 'react';
import RecordsPage from "../page";
import { getTournamentName } from '@/lib/recordMetadata';
import { prisma } from '@/lib/prisma';
import { resolveCanonicalTourneyId } from '@/lib/tournament';
import type { Metadata } from 'next';

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
  const { id: param, tab } = await params;

  const site = process.env.SITE_URL || 'https://stats.tennismylife.org';
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

  const typeLabelFromParam = tab ? (tabLabels[tab] ?? humanizeName(tab || 'Records')) : 'Records';
  const titleFromParam = `${displayFromParam} | ${typeLabelFromParam}`;
  const ogUrlFromParam = `${site}/tournaments/${param}/records${tab ? `/${tab}` : ''}`;
  // Simpler: always use the static CTA image for records previews
  const ogImageFromParam = `${site}/og/site-preview.png`;

  // Special-case: when viewing the 'rounds' tab root, return the requested title
  if (tab === 'rounds') {
    const siteTitle = `${displayFromParam} Records by Round | Tennis Records`;
    return {
      title: siteTitle,
      openGraph: { title: siteTitle, url: ogUrlFromParam, siteName: 'TML', images: [{ url: ogImageFromParam, alt: `${displayFromParam} - Rounds`, width: 1200, height: 630, type: 'image/png' }] },
      twitter: { card: 'summary_large_image', title: siteTitle, images: [ogImageFromParam] },
      alternates: { canonical: ogUrlFromParam },
    };
  }

  // Special-case: when viewing the 'count' tab root, return the site-specific SEO title
  if (tab === 'count') {
    const siteTitle = `${displayFromParam} Open Era Records | Tennis My Life`;
    return {
      title: siteTitle,
      openGraph: { title: siteTitle, url: ogUrlFromParam, siteName: 'TML', images: [{ url: ogImageFromParam, alt: `${displayFromParam} - Counts`, width: 1200, height: 630, type: 'image/png' }] },
      twitter: { card: 'summary_large_image', title: siteTitle, images: [ogImageFromParam] },
      alternates: { canonical: ogUrlFromParam },
    };
  }

  // Special-case: when viewing the 'rounds-on-entries' tab root, return the site-specific Round Efficiency title
  if (tab === 'rounds-on-entries') {
    const siteTitle = `${displayFromParam} Round Efficiency by Entries | Tennis Records`;
    return {
      title: siteTitle,
      openGraph: { title: siteTitle, url: ogUrlFromParam, siteName: 'TML', images: [{ url: ogImageFromParam, alt: `${displayFromParam} - Round Efficiency`, width: 1200, height: 630, type: 'image/png' }] },
      twitter: { card: 'summary_large_image', title: siteTitle, images: [ogImageFromParam] },
      alternates: { canonical: ogUrlFromParam },
    };
  }

  // Special-case: when viewing the 'least' tab root, return the site-specific Least Games title
  if (tab === 'least') {
    const siteTitle = `${displayFromParam} Least Games Lost to Reach a Round | Tennis Records`;
    return {
      title: siteTitle,
      openGraph: { title: siteTitle, url: ogUrlFromParam, siteName: 'TML', images: [{ url: ogImageFromParam, alt: `${displayFromParam} - Least Games`, width: 1200, height: 630, type: 'image/png' }] },
      twitter: { card: 'summary_large_image', title: siteTitle, images: [ogImageFromParam] },
      alternates: { canonical: ogUrlFromParam },
    };
  }

  // Special-case: when viewing the 'average-age' tab root, return the site-specific Average Age title
  if (tab === 'average-age') {
    const siteTitle = `${displayFromParam} Average Age Records | Tennis Statistics`;
    return {
      title: siteTitle,
      openGraph: { title: siteTitle, url: ogUrlFromParam, siteName: 'TML', images: [{ url: ogImageFromParam, alt: `${displayFromParam} - Average Age`, width: 1200, height: 630, type: 'image/png' }] },
      twitter: { card: 'summary_large_image', title: siteTitle, images: [ogImageFromParam] },
      alternates: { canonical: ogUrlFromParam },
    };
  }

  // Special-case: when viewing the 'timespan' tab root, return the site-specific Timespan title
  if (tab === 'timespan') {
    const siteTitle = `${displayFromParam} Timespan Records | Tennis My Life`;
    return {
      title: siteTitle,
      openGraph: { title: siteTitle, url: ogUrlFromParam, siteName: 'TML', images: [{ url: ogImageFromParam, alt: `${displayFromParam} - Timespan`, width: 1200, height: 630, type: 'image/png' }] },
      twitter: { card: 'summary_large_image', title: siteTitle, images: [ogImageFromParam] },
      alternates: { canonical: ogUrlFromParam },
    };
  }

  // Return deterministic metadata based on the path (fast and reliable)
  const baseMeta: Metadata = {
    title: titleFromParam,
    openGraph: { title: titleFromParam, url: ogUrlFromParam, siteName: 'TML', images: [{ url: ogImageFromParam, alt: `${displayFromParam} - ${typeLabelFromParam}`, width: 1200, height: 630, type: 'image/png' }] },
    twitter: { card: 'summary_large_image', title: titleFromParam, images: [ogImageFromParam] },
    alternates: { canonical: ogUrlFromParam },
  };

  // Best-effort DB lookup (do not block metadata)
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
    } catch (err) {
      // ignore
    }
  })();

  return baseMeta;
}

export default async function RecordsTabPage({ params }: { params: Promise<{ id: string; tab?: string }> }) {
  const { id, tab } = await params;
  // server-rendered tournament name for authoritative H1
  const tournamentName = await getTournamentName(id);
  // DEBUG: log server invocation in tests to help diagnose missing H1s
  if (process.env.NODE_ENV === 'test') {
    // eslint-disable-next-line no-console
    console.log('RecordsTabPage server render', { id, tab });
  }

  const tabLabels: Record<string, string> = {
    count: 'Open Era Records',
    rounds: 'Records by Round',
    ages: 'Ages',
    percentage: 'Percentages',
    timespan: 'Timespans',
    'rounds-on-entries': 'Round Efficiency by Entries',
    least: 'Least Games Lost to Reach a Round',
    'average-age': 'Average Age Records',
  };

  function humanizeName(name: string) {
    return String(name || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const recordTitle = tab ? (tabLabels[tab] ?? humanizeName(tab)) : 'Records';

  // H1 should be: "{tournamentName} | {recordTitle}" (server-rendered)

  // H2 headings for each section (anchors)
  const sectionOrder = [
    { key: 'count', label: 'Counts' },
    { key: 'rounds', label: 'Rounds' },
    { key: 'ages', label: 'Ages' },
    { key: 'percentage', label: 'Percentages' },
    { key: 'timespan', label: 'Timespans' },
    { key: 'rounds-on-entries', label: 'Round Efficiency by Entries' },
    { key: 'least', label: 'Least' },
    { key: 'average-age', label: 'Average Age' },
  ];

  // For server-rendering contexts, normalize to a Promise that resolves to { id }
  const idPromise = Promise.resolve({ id });

  return (
    <div>
      <main className="w-full mx-auto p-8 text-white" style={{ backgroundColor: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(6px)', minHeight: '100vh' }}>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-6">{`${tournamentName} | ${recordTitle}`}</h1>



        {/* Client-side interactive page (keeps existing loading/fallback logic for data tables) */}
        <RecordsPage params={idPromise} />
      </main>
    </div>
  );
}