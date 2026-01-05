import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Tournaments — TML',
  description: 'Tournament listings, past champions and records.',
  alternates: {
    canonical: '/tournaments',
  },
  openGraph: {
    title: 'Tournaments — TML',
    description: 'Tournament listings, past champions and records.',
    url: '/tournaments',
    type: 'website',
  },
};

export default function TournamentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
