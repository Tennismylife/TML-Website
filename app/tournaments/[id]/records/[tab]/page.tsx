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
  const { id: param, tab } = params || {};
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

  const display = tournament.slug
    ? humanizeName(String(tournament.slug).replace(/-/g, ' '))
    : humanizeName(extractName(tournament.name) || `Tournament ${tournament.id}`);

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

  const base = tabLabels[tab] ?? humanizeName(tab || 'Records');
  const typeLabel = base;

  const site = 'https://stats.tennismylife.org';
  const ogUrl = `${site}/tournaments/${tournament.slug || param}/records/${tab || ''}`;
  const ogImage = `${site}/api/og/tournament/${tournament.slug || param}?page=records${tab ? `&tab=${tab}` : ''}`;
  const titleText = `${display} | ${typeLabel}`;

  return {
    title: titleText,
    openGraph: { title: titleText, url: ogUrl, siteName: 'TML', images: [{ url: ogImage, alt: `${display} - ${typeLabel}` }] },
    twitter: { card: 'summary_large_image', title: titleText, images: [ogImage] },
    alternates: { canonical: ogUrl },
  };
}

export default function RecordsTabPage({
  params,
}: {
  params: Promise<{ id: string; tab: string }>;
}) {
  const idPromise = params.then(p => ({ id: p.id }));
  return <RecordsPage params={idPromise} />;
}