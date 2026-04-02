import LeastFull from '@/app/tournaments/[id]/records/least/_components/LeastFull';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import TournamentHeader from '../../../../TournamentHeader';
import { getTournamentName, getTournamentSlug } from '@/lib/getTournamentName';
import { makeTitle, makeLeastLabel } from '@/lib/recordMetadata';
import { prisma } from '@/lib/prisma';
import { resolveCanonicalTourneyId } from '@/lib/tournament';
import RecordsWebPageJsonLd from '../../../RecordsWebPageJsonLd';
import RecordsBreadcrumb from '../../../RecordsBreadcrumb';

export async function generateMetadata({ params }: { params: Promise<{ id: string; title: string }> }) {
  const p = await params;
  const { id, title } = p;
  const tournamentName = await getTournamentName(id);
  const label = makeLeastLabel(String(title));
  const titleText = makeTitle(label, tournamentName);

  const site = process.env.SITE_URL || 'https://stats.tennismylife.org';

  // Resolve canonical tournament slug (prefer slug for URLs)
  let canonicalSlug = String(id);
  if (/^\d+$/.test(String(id))) {
    const canonicalId = await resolveCanonicalTourneyId(String(id));
    if (canonicalId) {
      const t = await prisma.tournament.findUnique({ where: { id: parseInt(canonicalId, 10) }, select: { slug: true } });
      canonicalSlug = t?.slug ?? canonicalId;
    }
  } else {
    const t = await prisma.tournament.findUnique({ where: { slug: String(id) }, select: { slug: true } });
    canonicalSlug = t?.slug ?? String(id);
  }

  const ogUrl = `${site}/tournaments/${canonicalSlug}/records/least/rounds/${encodeURIComponent(String(title))}`;
  const ogImage = `${site}/og/site-preview.png`;

  return {
    title: titleText,
    openGraph: {
      title: titleText,
      url: ogUrl,
      siteName: 'Tennis My Life',
      description: `${label} at ${tournamentName}`,
      images: [{ url: ogImage, alt: `${tournamentName} - ${label}`, width: 1200, height: 630, type: 'image/png' }],
    },
    twitter: { card: 'summary_large_image', title: titleText, images: [ogImage] },
    alternates: { canonical: ogUrl },
  };
}

export default async function Page({ params }: any) {
  const p = await params;
  const { id, title } = p;
  const slugId = await getTournamentSlug(id);
  const tournamentName = await getTournamentName(id);
  const label = makeLeastLabel(String(title));
  const pageTitle = makeTitle(label, tournamentName);
  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';
  const canonical = `${site}/tournaments/${slugId}/records/least/rounds/${encodeURIComponent(String(title))}`;
  return (
    <div className="w-full mx-auto text-white relative">
      <RecordsWebPageJsonLd
        pageTitle={pageTitle}
        pageDescription={`${label} at ${tournamentName}`}
        canonical={canonical}
        keywords={`${tournamentName}, least games lost, ${label}, tennis records`}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${site}/` }, { '@type': 'ListItem', position: 2, name: 'Tournaments', item: `${site}/tournaments` }, { '@type': 'ListItem', position: 3, name: tournamentName, item: `${site}/tournaments/${slugId}` }, { '@type': 'ListItem', position: 4, name: 'Records', item: `${site}/tournaments/${slugId}/records` }, { '@type': 'ListItem', position: 5, name: 'Fewest Games Lost', item: `${site}/tournaments/${slugId}/records/least` }, { '@type': 'ListItem', position: 6, name: label, item: canonical }] }) }} />
      <Link
        href={`/tournaments/${slugId}/records`}
        className="group relative inline-flex items-center gap-3 px-5 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black text-sm md:text-base rounded-full shadow-2xl hover:shadow-yellow-500/50 transform hover:scale-105 transition-all duration-300 overflow-hidden absolute top-4 left-4"
        title="View Records of the Tournament"
        aria-label="View Records of the Tournament"
      >
        <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-1000" />
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-2 transition-transform" />
        <span className="uppercase">VIEW RECORDS</span>
      </Link>

      <div className="mb-6">
        <TournamentHeader id={Number(id)} />
      </div>

      <main>
        <RecordsBreadcrumb slugId={slugId} tournamentName={tournamentName} crumbs={[{ label: 'Fewest Games Lost', href: `/tournaments/${slugId}/records/least` }, { label: label }]} />
        <LeastFull id={id} title={title} />
      </main>
    </div>
  );
}