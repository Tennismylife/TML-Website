import type { Metadata } from 'next';
import React from 'react';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const url = `${siteUrl}/ranking`;

export const metadata: Metadata = {
  title: 'Rankings — TML',
  description: 'Latest ATP rankings and historical ranking tables.',
  openGraph: {
    title: 'Rankings — TML',
    description: 'Latest ATP rankings and historical ranking tables.',
    url,
    type: 'website',
  },
  alternates: { canonical: url },
};

export default function RankingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
