import { redirect } from 'next/navigation';

export default function Page({ params }: any) {
  const { id } = params;
  // Redirect to canonical Titles youngest page
  redirect(`/tournaments/${id}/records/ages/titles/youngest`);
}