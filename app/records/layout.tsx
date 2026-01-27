import React from 'react';
import RoundOnEntriesModalOutletRecords from '@/components/RoundOnEntriesModalOutletRecords';

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  return <>
    {children}
    <RoundOnEntriesModalOutletRecords />
  </>;
}
