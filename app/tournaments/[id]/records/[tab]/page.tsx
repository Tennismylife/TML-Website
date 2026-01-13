import RecordsPage from "../page";
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
  const ogImageFromParam = `${site}/api/og/tournament/${param}?page=records${tab ? `&tab=${tab}` : ''}`;

  // Return deterministic metadata based on the path (fast and reliable)
  const baseMeta: Metadata = {
    title: titleFromParam,
    openGraph: { title: titleFromParam, url: ogUrlFromParam, siteName: 'TML', images: [{ url: ogImageFromParam, alt: `${displayFromParam} - ${typeLabelFromParam}` }] },
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

export default function RecordsTabPage({
  params,
}: {
  params: Promise<{ id: string; tab: string }>;
}) {
  const idPromise = params.then(p => ({ id: p.id }));
  return <RecordsPage params={idPromise} />;
}