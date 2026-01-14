import React from 'react';
import CountFull from '../../_components/CountFull';

export default async function EntriesModalPage({ params }: { params: { id: string } }) {
  const { id } = params;

  return (
    <div className="w-full mx-auto p-8 text-white">
      <main>
        <h1 className="text-3xl font-extrabold mb-4">{`Entries`}</h1>
        {/* @ts-ignore */}
        <CountFull id={id} section="entries" />
      </main>
    </div>
  );
}
