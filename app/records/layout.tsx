import type { Metadata } from 'next';
import React from 'react';
import { metadataBase } from '@/lib/site';

const url = new URL('/records', metadataBase).toString();
const title = 'Records | Tennis Records';
const description = 'Browse tennis records: wins, streaks, ages and more.';

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url,
    type: 'website',
    siteName: 'TML',
  },
  twitter: {
    title,
    description,
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
