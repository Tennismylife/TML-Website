import type { Metadata } from 'next';
import React from 'react';
import TournamentClient from './TournamentClient';

function humanizeId(id: string) {
  return id.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const name = humanizeId(params.id);  const title = `${name} — Tournament | TML`;
  const description = `Tournament page for ${name} — results, past champions and records.`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = `${siteUrl}/tournaments/${params.id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'website',
    },
    alternates: { canonical: url },
  };
}

export default function TournamentPage(props: any) {
  const params = props?.params ?? {};
  const name = humanizeId(params.id);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = `${siteUrl}/tournaments/${params.id}`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SportsEvent',
            name,
            url,
          }),
        }}
      />
      <TournamentClient id={params.id} />
    </>
  );
}
