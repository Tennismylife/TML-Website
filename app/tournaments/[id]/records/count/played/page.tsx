import React from 'react';
import CountFull from '../_components/CountFull';
import TournamentHeader from '../../../TournamentHeader';

export default async function PlayedPage({ params }: { params: { id: string } }) {
  const { id } = params;

  return (
    <div className="w-full mx-auto p-8 text-white">
      <div className="mb-6">
        <TournamentHeader id={Number(id)} />
      </div>

      <main>
        <h1 className="text-3xl font-extrabold mb-4">{`Played`}</h1>
        <CountFull id={id} section="played" />
      </main>
    </div>
  );
}
