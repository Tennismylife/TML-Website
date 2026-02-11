import React from 'react';
import CountFull from '../../_components/CountFull';

export default async function TitlesModalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Render same content as full page; will be injected into layout 'modal' slot when navigated via intercepted route
  return (
    <div className="w-full mx-auto text-white">
      <main>
        <h2 className="text-3xl font-extrabold mb-4 text-center mx-0">{`Titles`}</h2>
        {/* @ts-ignore */}
        <CountFull id={id} section="titles" />
      </main>
    </div>
  );
}
