import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Records — TML',
  description: 'Browse tennis records: wins, streaks, ages and more.',
  openGraph: {
    title: 'Records — TML',
    description: 'Browse tennis records: wins, streaks, ages and more.',
    url: '/records',
    type: 'website',
  },
  alternates: { canonical: '/records' },
};

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
