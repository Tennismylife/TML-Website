import { redirect } from 'next/navigation';

export default function Page({ params }: any) {
  const { id } = params;
  // Server-side redirect to the canonical "main" page which renders the full header, tabs and content
  redirect(`/tournaments/${id}/records/ages/main`);
}
