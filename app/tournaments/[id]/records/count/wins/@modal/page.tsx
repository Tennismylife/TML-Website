import React from 'react';
import CountFull from '../../_components/CountFull';

export default async function WinsModalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="w-full mx-auto p-8 text-white">
      <main>
        <h1 className="text-3xl font-extrabold mb-4">{`Wins`}</h1>
        {/* @ts-ignore */}
        <CountFull id={id} section="wins" />
      </main>
    </div>
  );
}
