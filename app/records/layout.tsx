import React from 'react';
import { Metadata } from 'next';
import { metadataBase } from '../../lib/site';
import RoundOnEntriesModalOutletRecords from '@/components/RoundOnEntriesModalOutletRecords';

export const metadata: Metadata = {
  title: 'Tennis Records',
  description: 'Browse tennis records: wins, streaks, ages and more.',
  openGraph: {
    images: [new URL('/og/site-preview.png', metadataBase).toString()],
    siteName: 'TennisMyLife',
  },
  twitter: {
    images: [new URL('/og/site-preview.png', metadataBase).toString()],
  },
};

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  return <>
    {children}
    <RoundOnEntriesModalOutletRecords />
  </>;
}
