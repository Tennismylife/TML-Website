import AgesFull from '@/app/tournaments/[id]/records/ages/_components/AgesFull';
import { getTournamentName, getTournamentSlug } from '@/lib/getTournamentName';
import ViewRecordsCTA from '../../../ViewRecordsCTA';
import RecordsBreadcrumb from '../../../RecordsBreadcrumb';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const { id } = p;
  const tournamentName = await getTournamentName(id);
  return { title: `Oldest Players in Main Draw at ${tournamentName}` };
}

export default async function Page({ params }: any) {
  const p = await params;
  const { id } = p;
  const tournamentName = await getTournamentName(id);
  const slugId = await getTournamentSlug(id).catch(() => id);
  const label = `Oldest Players in Main Draw at ${tournamentName}`;
  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';
  return (
    <div className="w-full mx-auto text-white relative">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${site}/` }, { '@type': 'ListItem', position: 2, name: 'Tournaments', item: `${site}/tournaments` }, { '@type': 'ListItem', position: 3, name: tournamentName, item: `${site}/tournaments/${slugId}` }, { '@type': 'ListItem', position: 4, name: 'Records', item: `${site}/tournaments/${slugId}/records` }, { '@type': 'ListItem', position: 5, name: 'Ages', item: `${site}/tournaments/${slugId}/records/ages/main` }, { '@type': 'ListItem', position: 6, name: 'Oldest in Draw', item: `${site}/tournaments/${slugId}/records/ages/main/oldest` }] }) }} />
      <ViewRecordsCTA id={id} className="absolute top-4 left-4 z-50" />
      <div className="pt-14 px-2">
        <RecordsBreadcrumb slugId={slugId} tournamentName={tournamentName} crumbs={[{ label: 'Ages', href: `/tournaments/${slugId}/records/ages/main` }, { label: 'Oldest in Draw' }]} />
      </div>
      <h1 className="text-3xl font-extrabold mb-4 text-center mx-0">{label}</h1>
      <AgesFull id={id} section="main" which="oldest" />
    </div>
  );
}
