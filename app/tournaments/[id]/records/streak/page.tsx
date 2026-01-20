import TournamentPage from '@/app/tournaments/[id]/records/page';
import { getTournamentName } from '@/lib/recordMetadata';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const tournamentName = await getTournamentName(p.id);
  // Title required by product: "{[Tournament Name]} Longest Winning Strreaks ! Tennis Records"
  return { title: `${tournamentName} Longest Winning Strreaks ! Tennis Records` } as any;
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Render a server-side H1 above the interactive client component so tests and crawlers
  // can see the page title immediately and so the heading is visible above the header.
  const tournamentName = await getTournamentName(id);
  return (
    <main className="w-full mx-auto pt-0 pb-8 px-0 text-white" style={{ backgroundColor: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(6px)', minHeight: '100vh' }}>
      <h1 className="relative z-50 mt-0 text-4xl md:text-5xl font-extrabold mb-6 text-center text-white">{`${tournamentName} | Longest Winning Streaks`}</h1>
      <TournamentPage params={Promise.resolve({ id, tab: 'streak' })} />
    </main>
  );
}
