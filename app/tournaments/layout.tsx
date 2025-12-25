import type { Metadata } from 'next';
import React from 'react';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const url = `${siteUrl}/tournaments`;

export const metadata: Metadata = {
  title: 'Tournaments — TML',
  description: 'Tournament listings, past champions and records.',
  openGraph: {
    title: 'Tournaments — TML',
    description: 'Tournament listings, past champions and records.',
    url,
    type: 'website',
  },
  alternates: { canonical: url },
};

export default function TournamentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
