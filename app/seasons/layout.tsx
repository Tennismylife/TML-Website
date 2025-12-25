import type { Metadata } from 'next';
import React from 'react';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const url = `${siteUrl}/seasons`;

export const metadata: Metadata = {
  title: 'Seasons — TML',
  description: 'Season summaries, stats and records by year.',
  openGraph: {
    title: 'Seasons — TML',
    description: 'Season summaries, stats and records by year.',
    url,
    type: 'website',
  },
  alternates: { canonical: url },
};

export default function SeasonsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
