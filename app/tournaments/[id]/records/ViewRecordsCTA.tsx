import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getTournamentSlug } from '@/lib/getTournamentName';

export default async function ViewRecordsCTA({ id, className = '' }: { id: string; className?: string }) {
  const slugId = await getTournamentSlug(id);
  return (
    <Link
      href={`/tournaments/${slugId}/records`}
      className={`group relative inline-flex items-center gap-3 px-5 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black text-sm md:text-base rounded-full shadow-2xl hover:shadow-yellow-500/50 transform hover:scale-105 transition-all duration-300 overflow-hidden absolute top-4 left-4 z-50 ${className}`}
      title="View Records of the Tournament"
      aria-label="View Records of the Tournament"
    >
      <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-full transition-transform duration-1000" />
      <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-2 transition-transform" />
      <span className="uppercase">VIEW RECORDS</span>
    </Link>
  );
}
