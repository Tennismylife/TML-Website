import React from 'react';
import { Metadata } from 'next';
import { metadataBase } from '../../lib/site';
import RoundOnEntriesModalOutletRecords from '@/components/RoundOnEntriesModalOutletRecords';

export const metadata: Metadata = {
  title: 'Tennis Records',
  description: 'Browse tennis records: wins, streaks, ages and more.',
  openGraph: {
    title: 'Tennis Records – TennisMyLife',
    description: 'Browse tennis records: wins, streaks, ages and more.',
    images: [new URL('/og/site-preview.png', metadataBase).toString()],
    siteName: 'TennisMyLife',
  },
  twitter: {
    title: 'Tennis Records – TennisMyLife',
    description: 'Browse tennis records: wins, streaks, ages and more.',
    images: [new URL('/og/site-preview.png', metadataBase).toString()],
  },
};

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  return <>
    {children}
    <RoundOnEntriesModalOutletRecords />
  </>;
}
