import AgesFull from '@/app/tournaments/[id]/records/ages/_components/AgesFull';
import { getTournamentName, getTournamentSlug } from '@/lib/getTournamentName';
import { makeTitle } from '@/lib/recordMetadata';
import ViewRecordsCTA from '../../../ViewRecordsCTA';
import RecordsBreadcrumb from '../../../RecordsBreadcrumb';

export async function generateMetadata({ params }: { params: Promise<{ id: string; title: string }> }) {
  const p = await params;
  const { id, title } = p;
  const tournamentName = await getTournamentName(id);
  const label = `Oldest Players in ${String(title)}`;
  return { title: makeTitle(label, tournamentName) };
}

export default async function Page({ params }: any) {
  const p = await params;
  const { id, title } = p;
  const tournamentName = await getTournamentName(id);
  const slugId = await getTournamentSlug(id).catch(() => id);
  const site = process.env.SITE_URL?.replace(/\/+$/, '') || 'https://stats.tennismylife.org';
  return (
    <div className="w-full mx-auto text-white relative">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${site}/` }, { '@type': 'ListItem', position: 2, name: 'Tournaments', item: `${site}/tournaments` }, { '@type': 'ListItem', position: 3, name: tournamentName, item: `${site}/tournaments/${slugId}` }, { '@type': 'ListItem', position: 4, name: 'Records', item: `${site}/tournaments/${slugId}/records` }, { '@type': 'ListItem', position: 5, name: 'Ages', item: `${site}/tournaments/${slugId}/records/ages` }, { '@type': 'ListItem', position: 6, name: 'Oldest by Round', item: `${site}/tournaments/${slugId}/records/ages/oldestrounds` }, { '@type': 'ListItem', position: 7, name: String(title).toUpperCase(), item: `${site}/tournaments/${slugId}/records/ages/oldestrounds/${encodeURIComponent(String(title))}` }] }) }} />
      <ViewRecordsCTA id={id} className="absolute top-4 left-4 z-50" />
      <div className="pt-14 px-2">
        <RecordsBreadcrumb slugId={slugId} tournamentName={tournamentName} crumbs={[{ label: 'Ages', href: `/tournaments/${slugId}/records/ages` }, { label: 'Oldest by Round', href: `/tournaments/${slugId}/records/ages/oldestrounds` }, { label: String(title).toUpperCase() }]} />
      </div>
      <AgesFull id={id} section="oldestrounds" title={title} />
    </div>
  );
}