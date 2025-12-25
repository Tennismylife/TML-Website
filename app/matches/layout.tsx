import type { Metadata } from 'next';
import React from 'react';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const url = `${siteUrl}/matches`;

export const metadata: Metadata = {
  title: 'Matches — TML',
  description: 'Latest match results, scores and schedules.',
  openGraph: {
    title: 'Matches — TML',
    description: 'Latest match results, scores and schedules.',
    url,
    type: 'website',
  },
  alternates: { canonical: url },
};

export default function MatchesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
