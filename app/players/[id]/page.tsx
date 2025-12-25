import type { Metadata } from 'next';
import React from 'react';
import PlayerClient from './PlayerClient';

function humanizeId(id: string) {
  return id.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const resolvedParams = await params;
  const name = humanizeId(resolvedParams.id);
  const title = `${name} — Player Profile | TML`;
  const description = `Player profile and statistics for ${name} on TML.`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = `${siteUrl}/players/${resolvedParams.id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'profile',
    },
    alternates: { canonical: url },
  };
}

export default async function PlayerPage(props: any) {
  const params = (await props.params) ?? {};
  const name = humanizeId(params.id ?? '');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = `${siteUrl}/players/${params.id}`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name,
            url,
          }),
        }}
      />
      <PlayerClient params={params} />
    </>
  );
}
