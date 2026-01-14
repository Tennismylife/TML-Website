import { redirect } from 'next/navigation';

export default function ModalPage({ params }: any) {
  const { id } = params;
  // Redirect modal to canonical Titles oldest modal/page
  redirect(`/tournaments/${id}/records/ages/titles/oldest`);
}