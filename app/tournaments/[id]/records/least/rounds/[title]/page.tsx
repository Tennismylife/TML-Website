import LeastFull from '@/app/tournaments/[id]/records/least/_components/LeastFull';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import TournamentHeader from '../../../../TournamentHeader';
import { getTournamentName, makeTitle, makeLeastLabel } from '@/lib/recordMetadata';

export async function generateMetadata({ params }: { params: Promise<{ id: string; title: string }> }) {
  const p = await params;
  const { id, title } = p;
  const tournamentName = await getTournamentName(id);
  const label = makeLeastLabel(String(title));
  return { title: makeTitle(label, tournamentName) };
}

export default async function Page({ params }: any) {
  const p = await params;
  const { id, title } = p;
  return (
    <div className="w-full mx-auto text-white relative">
      <Link
        href={`/tournaments/${id}/records`}
        className="group relative inline-flex items-center gap-3 px-5 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black text-sm md:text-base rounded-full shadow-2xl hover:shadow-yellow-500/50 transform hover:scale-105 transition-all duration-300 overflow-hidden absolute top-4 left-4"
        title="View Records of the Tournament"
        aria-label="View Records of the Tournament"
      >
        <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-1000" />
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-2 transition-transform" />
        <span className="uppercase">VIEW RECORDS</span>
      </Link>

      <div className="mb-6">
        <TournamentHeader id={Number(id)} />
      </div>

      <main>
        <LeastFull id={id} title={title} />
      </main>
    </div>
  );
}