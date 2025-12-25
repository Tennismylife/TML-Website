import type { Metadata } from 'next';
import React from 'react';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const url = `${siteUrl}/statistics`;

export const metadata: Metadata = {
  title: 'Statistics — TML',
  description: 'Player and match statistics across seasons and tournaments.',
  openGraph: {
    title: 'Statistics — TML',
    description: 'Player and match statistics across seasons and tournaments.',
    url,
    type: 'website',
  },
  alternates: { canonical: url },
};

export default function StatisticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
