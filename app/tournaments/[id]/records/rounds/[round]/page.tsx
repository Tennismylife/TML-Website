export const dynamic = 'force-dynamic';
import RoundFull from '../_components/RoundFull';
import { getTournamentName, makeTitle, humanize } from '@/lib/recordMetadata';
import ViewRecordsCTA from '../../ViewRecordsCTA';
import { getRoundFullName } from '@/lib/utils';
import { prisma } from '@/lib/prisma';
import { resolveCanonicalTourneyId } from '@/lib/tournament';
import { metadataBase } from '@/lib/site';
import { fetchTournamentHeaderCached } from '@/lib/tournamentHeaderCache';

function extractFirst(value: any): string {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(extractFirst).find(Boolean) || '';
  if (typeof value === 'object') return Object.values(value).map(extractFirst).find(Boolean) || '';
  return '';
}
function humanizeName(name: string) {
  return name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: { params: { id: string; round: string } }) {
  const { id, round } = params;
  const tournamentName = await getTournamentName(id);
  const label = `Reaches of ${humanize(String(round))}`;
  return { title: makeTitle(label, tournamentName) };
}

export default async function Page({ params }: any) {
  const { id, round } = params;

  // fetch full list via internal API (server-side)
  const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || metadataBase?.origin || '').replace(/\/+$/,'');
  if (!origin) throw new Error('Missing site origin to call internal API');
  const res = await fetch(`${origin}/api/tournaments/${encodeURIComponent(id)}/records/rounds?round=${encodeURIComponent(round)}&full=true`, { cache: 'no-store' });
  const data = await res.json();
  const list = data?.roundItems?.[0]?.fullList ?? [];

  // Resolve tournament name server-side; prefer header cache humanized slug for display consistency
  let tourneyName = humanizeName(String(id).replace(/-/g, ' '));
  try {
    const header = await fetchTournamentHeaderCached(id);
    const rawHeader = extractFirst(header?.name);
    if (rawHeader) {
      tourneyName = humanizeName(rawHeader);
    } else {
      const canonicalId = await resolveCanonicalTourneyId(id);
      const lookupId = canonicalId ? parseInt(canonicalId, 10) : (isNaN(Number(id)) ? undefined : Number(id));
      const tournament = lookupId ? await prisma.tournament.findUnique({ where: { id: lookupId } }) : await prisma.tournament.findUnique({ where: { slug: id } });
      const rawName = extractFirst(tournament?.name) || `Tournament ${tournament?.id ?? id}`;
      // only override if DB provides something distinguishable
      if (rawName && rawName.toLowerCase().indexOf(tourneyName.toLowerCase()) === -1) {
        tourneyName = humanizeName(rawName);
      }
    }
  } catch (e) {
    // ignore
  }

  const tournamentName = await getTournamentName(id);
  const label = `Most ${getRoundFullName(String(round))} Appearances at ${tournamentName}`;

  return (
    <div>
      <main className="w-full mx-auto text-white relative">
        <ViewRecordsCTA id={id} />
        <h1 className="text-3xl font-extrabold mb-4 text-center mx-0">{label}</h1>
        <RoundFull list={list} round={round} tourneyName={tourneyName} />
      </main>
    </div>
  );
}
