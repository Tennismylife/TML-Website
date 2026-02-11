import React from 'react';
import CountFull from '../../_components/CountFull';

export default async function EntriesModalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="w-full mx-auto text-white">
      <main>
        <h2 className="text-3xl font-extrabold mb-4 text-center mx-0">{`Entries`}</h2>
        {/* @ts-ignore */}
        <CountFull id={id} section="entries" />
      </main>
    </div>
  );
}
