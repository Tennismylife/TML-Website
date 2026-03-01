import { redirect } from 'next/navigation';
import { getTournamentSlug } from '@/lib/getTournamentName';

export default async function Page({ params }: any) {
  const { id } = params;
  const slugId = await getTournamentSlug(id);
  // Server-side redirect to the canonical "main" page which renders the full header, tabs and content
  redirect(`/tournaments/${slugId}/records/ages/main`);
}
