import { Metadata } from 'next';
import { metadataBase } from '@/lib/site';
import { generateRecordDescription } from '@/lib/generateRecordDescription';
import RoundsOnEntriesServer from '@/app/records/RoundsOnEntries/RoundsOnEntries.server';

type Props = {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = (await searchParams) ?? {};

  const toArray = (v?: string | string[] | undefined) => v === undefined ? [] : Array.isArray(v) ? v : [v];
  const selectedSurfaces = new Set(toArray(sp.surface ?? sp['surface[]']).map(
    s => typeof s === 'string' ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s
  ));
  const selectedLevels = new Set(toArray(sp.level ?? sp['level[]']));
  const selectedRounds = typeof sp.round === 'string' ? sp.round : '';
  const selectedBestOf = sp.bestOf ? Number(sp.bestOf) : null;

  const desc = generateRecordDescription(
    'roundsonentries',
    { roundsonentries: 'titles' },
    selectedSurfaces,
    selectedLevels,
    selectedRounds,
    selectedBestOf
  );

  const ogImage = new URL('/og/site-preview.png', metadataBase).toString();

  return {
    title: { absolute: `${desc || 'Titles on entries'} | Tennis Records` },
    description: desc || 'Titles on entries records',
    openGraph: {
      title: `${desc || 'Titles on entries'} | Tennis Records`,
      description: desc || 'Titles on entries records',
      images: [ogImage],
      siteName: 'TennisMyLife',
    },
    twitter: {
      title: `${desc || 'Titles on entries'} | Tennis Records`,
      description: desc || 'Titles on entries records',
      images: [ogImage],
    },
  };
}

export default async function TitlesPage() {
  // Render titles full page
  return <RoundsOnEntriesServer searchParams={{}} serverProps={{ sub: 'titles' }} />;
}
