import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Statistics',
};

export default function StatisticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
