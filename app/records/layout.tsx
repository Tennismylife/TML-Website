import type { Metadata } from 'next';
import React from 'react';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const url = `${siteUrl}/records`;

export const metadata: Metadata = {
  title: 'Records — Tennismylife',
  description: 'Browse tennis records: wins, streaks, ages and more.',
  openGraph: {
    title: 'Records — Tennismylife',
    description: 'Browse tennis records: wins, streaks, ages and more.',
    url,
    type: 'website',
  },
  alternates: { canonical: url },
};

import RoundOnEntriesModalOutletRecords from '@/components/RoundOnEntriesModalOutletRecords';

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  return <>
    {children}
    <RoundOnEntriesModalOutletRecords />
  </>;
}
