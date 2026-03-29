// /tournaments/[id]/records/count is not a valid standalone URL.
// The "Counts" tab lives at /tournaments/[id]/records (the hub).
// This file exists solely to redirect any direct hits (crawlers, old links, etc.).
import { redirect } from 'next/navigation';
import { getTournamentSlug } from '@/lib/getTournamentName';

export default async function CountRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const slugId = await getTournamentSlug(id).catch(() => id);
  redirect(`/tournaments/${slugId}/records`);
}
