import TournamentPage from '@/app/tournaments/[id]/records/page';

export default async function Page({ params }: any) {
  const p = await params;
  const { id } = p;
  // Render the full Tournament records page (client) so the page includes header, tabs, H1 and the AgesSection
  // Pass params as a resolved promise so the client component receives the same shape it expects
  // @ts-ignore - TournamentPage is a client component
  return <TournamentPage params={Promise.resolve({ id })} />;
}
