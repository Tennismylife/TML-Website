import React from 'react';
import Link from 'next/link';
import ViewRecordsCTA from '../../ViewRecordsCTA';
import CountFull from '../_components/CountFull';
import TournamentHeader from '../../../TournamentHeader';
import { fetchTournamentHeaderCached } from '@/lib/tournamentHeaderCache';
import { getCountSection } from '@/lib/records/count';
import { prisma } from '@/lib/prisma';
import { resolveCanonicalTourneyId } from '@/lib/tournament';
import { shouldIndexRecords } from '@/lib/getTournamentName';
import RecordsWebPageJsonLd from '../../RecordsWebPageJsonLd';
import RecordsBreadcrumb from '../../RecordsBreadcrumb';

export const dynamic = 'force-dynamic';

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

function humanize(s: string) {
  return String(s || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // default to a humanized version of the id
  let tournamentName = humanize(String(id).replace(/-/g, ' '));
  try {
    const header = await fetchTournamentHeaderCached(id);
    const raw = extractName(header?.name);
    if (raw) tournamentName = humanize(raw);
  } catch (e) {}

  // Match the requested phrasing (lowercase 'matches') and include brand suffix
  const title = `Most matches played at ${tournamentName} | Tennis Records`;
  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';

  const description = `A list of players with the most matches played at ${tournamentName} (men's singles main draw), aggregated across tournament editions.`;
  // Resolve canonical tournament slug (prefer slug for URLs)
  let canonicalSlug = String(id);
  if (/^\d+$/.test(String(id))) {
    const canonicalId = await resolveCanonicalTourneyId(String(id));
    if (canonicalId) {
      const t = await prisma.tournament.findUnique({ where: { id: parseInt(canonicalId, 10) }, select: { slug: true, category: true, years: true } });
      canonicalSlug = t?.slug ?? canonicalId;
      const canonical = `${site}/tournaments/${canonicalSlug}/records/count/played`;
      return {
        title,
        description,
        openGraph: { title, description, url: canonical, images: [{ url: `${site}/og/site-preview.png`, alt: `${tournamentName} - Most matches played`, width: 1200, height: 630 }] },
        alternates: { canonical },
        robots: { index: shouldIndexRecords(t?.category, t?.years ?? null), follow: true },
        other: { 'script[type="application/ld+json"]': undefined as any },
      };
    }
  } else {
    const t = await prisma.tournament.findUnique({ where: { slug: String(id) }, select: { slug: true, category: true, years: true } });
    canonicalSlug = t?.slug ?? String(id);
    const canonical = `${site}/tournaments/${canonicalSlug}/records/count/played`;
    return {
      title,
      description,
      openGraph: { title, description, url: canonical, images: [{ url: `${site}/og/site-preview.png`, alt: `${tournamentName} - Most matches played`, width: 1200, height: 630 }] },
      alternates: { canonical },
      robots: { index: shouldIndexRecords(t?.category, t?.years ?? null), follow: true },
      other: { 'script[type="application/ld+json"]': undefined as any },
    };
  }

  return {
    title,
    description,
    openGraph: { title, description, url: `${site}/tournaments/${canonicalSlug}/records/count/played`, images: [{ url: `${site}/og/site-preview.png`, alt: `${tournamentName} - Most matches played`, width: 1200, height: 630 }] },
    alternates: { canonical: `${site}/tournaments/${canonicalSlug}/records/count/played` },
    other: { 'script[type="application/ld+json"]': undefined as any },
  };
}

export default async function PlayedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const tournamentName = await fetchTournamentHeaderCached(id).then((t: any) => {
    const raw = extractName(t?.name);
    if (raw) return humanize(raw);
    return humanize(String(id).replace(/-/g, ' '));
  }).catch(() => humanize(String(id).replace(/-/g, ' ')));

  const list = await getCountSection(id, 'played');

  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';
  const canonical = `${site}/tournaments/${id}/records/count/played`;

  const pageDescription = `A list of players with the most matches played at ${tournamentName} (men's singles main draw).`;

  const faqJson = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', 'name': `What does "Most matches played" at ${tournamentName} mean?`, 'acceptedAnswer': { '@type': 'Answer', 'text': `It indicates the total number of matches played by each player in the men's singles main draw at ${tournamentName}, summed across all editions they participated in.` } },
      { '@type': 'Question', 'name': 'Does the list cover the Open Era?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'Yes — the list covers the Open Era; any pre‑Open inclusions (if present) will be noted on the tournament\'s page.' } },
      { '@type': 'Question', 'name': 'How do you handle ties (same number of matches)?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'In case of a tie we show players with the same count at the same rank, then order by name or by most recent year played (consistent with the table behavior).' } },
      { '@type': 'Question', 'name': 'Does the page include qualifying matches or only the main draw?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'It includes only the men\'s singles main draw, not qualifying matches.' } },
      { '@type': 'Question', 'name': 'How frequently is the data updated?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'Data is updated after each tournament edition and whenever historical dataset corrections are applied.' } },
      { '@type': 'Question', 'name': 'Why do some big names have fewer matches than others?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'Totals depend on how many editions a player has entered and how deep they went in each edition (i.e., run depth).' } },
      { '@type': 'Question', 'name': 'Where can I verify player profiles or full match lists?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'Each name in the table links to the player profile with matches, seasons and detailed records.' } },
      { '@type': 'Question', 'name': 'Can I see the same ranking for other Grand Slams?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'Yes — from the tournaments page you can navigate to other events and their corresponding record pages.' } },
    ],
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: site + '/' },
      { '@type': 'ListItem', position: 2, name: 'Tournaments', item: site + '/tournaments' },
      { '@type': 'ListItem', position: 3, name: tournamentName, item: site + `/tournaments/${id}` },
      { '@type': 'ListItem', position: 4, name: 'Records', item: site + `/tournaments/${id}/records` },
      { '@type': 'ListItem', position: 5, name: 'Most matches played', item: canonical },
    ],
  };

  return (
    <div className="w-full mx-auto text-white relative">
      <ViewRecordsCTA id={id} />

      <div className="mb-6">
        <TournamentHeader id={Number(id)} />
      </div>

      {/* Server-rendered JSON-LD scripts (WebPage, FAQPage, BreadcrumbList) */}
      <RecordsWebPageJsonLd
        pageTitle={`Most Matches Played At ${tournamentName} | Tennis Records`}
        pageDescription={pageDescription}
        canonical={canonical}
        keywords={`${tournamentName}, most matches played, tennis records, open era, men's singles`}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <main>
        <RecordsBreadcrumb slugId={String(id)} tournamentName={tournamentName} crumbs={[{ label: 'Matches Played' }]} />
        <h1 className="text-3xl font-extrabold mb-4 text-center mx-0">{`Most matches played at ${tournamentName}`}</h1>
        <CountFull id={id} section="played" list={list} tourneyName={tournamentName} />
      </main>
    </div>
  );
}
