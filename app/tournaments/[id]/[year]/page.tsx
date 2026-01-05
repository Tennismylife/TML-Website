import { prisma } from '@/lib/prisma';
import { resolveCanonicalTourneyId } from '@/lib/tournament';
import TournamentEditionClient from './EditionClient';

// Local helpers
function humanizeName(name: string) {
  return name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function firstString(value: any): string {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    for (let i = value.length - 1; i >= 0; i--) {
      const v = value[i];
      if (v) return firstString(v);
    }
    return '';
  }
  if (typeof value === 'object') {
    const vals = Object.values(value);
    for (const v of vals) {
      if (v) return firstString(v);
    }
    return '';
  }
  return '';
}

// Server metadata for edition pages
export async function generateMetadata({ params }: any) {
  const { id, year } = await params;
  if (!id || !year) return { title: 'Tournament Edition' };

  // Resolve canonical numeric id if needed
  let tourneyRow: any = null;
  if (/^\d+$/.test(id)) {
    const canonicalId = await resolveCanonicalTourneyId(id);
    if (!canonicalId) return { title: `Tournament ${year}` };
    tourneyRow = await prisma.tournament.findUnique({ where: { id: parseInt(canonicalId, 10) } });
  } else {
    tourneyRow = await prisma.tournament.findUnique({ where: { slug: id } });
  }

  const name = tourneyRow ? (Array.isArray(tourneyRow.name) ? firstString(tourneyRow.name) : firstString(tourneyRow.name)) : id;
  const display = `${humanizeName(firstString(name))} ${year}`;
  const site = 'https://stats.tennismylife.org';
  const ogUrl = `${site}/tournaments/${tourneyRow?.slug || id}/${year}`;
  return {
    title: `${display} | Tournament Stats, History, Match Results & Winners`,
    openGraph: { url: ogUrl },
    alternates: { canonical: ogUrl },
  }; 
}

// Server component: render client edition component
export default function Page(props: any) {
  return <TournamentEditionClient {...props} />;
}
