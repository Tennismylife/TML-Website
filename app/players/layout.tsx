import type { Metadata } from 'next';
import React from 'react';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const url = `${siteUrl}/players`;

export const metadata: Metadata = {
  title: 'Players — TML',
  description: 'Browse player profiles, stats and head-to-heads.',
  openGraph: {
    title: 'Players — TML',
    description: 'Browse player profiles, stats and head-to-heads.',
    url,
    type: 'website',
  },
  alternates: { canonical: url },
};

export default function PlayersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
