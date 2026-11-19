import React from 'react';
import { Metadata } from 'next';
import { metadataBase } from '../../lib/site';
import RoundOnEntriesModalOutletRecords from '@/components/RoundOnEntriesModalOutletRecords';
import { getTour } from '@/lib/tour';
import { RecordsTourProvider } from './AtpRecordCommentary';

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

export default async function RecordsLayout({ children }: { children: React.ReactNode }) {
  const tour = await getTour();
  return <RecordsTourProvider tour={tour}>
    {children}
    <RoundOnEntriesModalOutletRecords />
  </RecordsTourProvider>;
}
