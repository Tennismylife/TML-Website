import type { Metadata } from 'next';
import { generateRecordDescription } from '../../lib/generateRecordDescription';

export async function generateMetadata({ searchParams }: { searchParams: Record<string, any> }): Promise<Metadata> {
  const selectedRecord = searchParams?.record ?? null;
  const subtab = searchParams?.subtab ?? null;
  const selectedSurfaces = new Set(Array.isArray(searchParams?.surface) ? searchParams.surface : (searchParams?.surface ? [searchParams.surface] : []));
  const selectedLevels = new Set(Array.isArray(searchParams?.level) ? searchParams.level : (searchParams?.level ? [searchParams.level] : []));
  const selectedRounds = searchParams?.round ?? '';
  const selectedBestOf = searchParams?.bestOf ? Number(searchParams.bestOf) : null;

  const defaultSubTabs: Record<string, string> = {
    ages: 'oldest',
    timespan: 'entries',
    roundsonentries: 'titles',
    same: 'wins',
    seasons: 'wins',
    atage: 'wins',
    ageofnth: 'wins',
    neededto: 'titles',
    counterseasons: 'round',
    streak: 'wins',
    h2h: 'count',
  };

  const activeSubTabs: Record<string, string> = { ...defaultSubTabs };
  if (selectedRecord && subtab) activeSubTabs[selectedRecord] = subtab;

  const description = generateRecordDescription(selectedRecord, activeSubTabs, selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf);
  const title = description ? `${description} | Tennis Records` : 'Records | Tennis Records';
  const url = '/records' + (new URLSearchParams(searchParams as any).toString() ? '?' + new URLSearchParams(searchParams as any).toString() : '');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'TML',
    },
    twitter: {
      title,
      description,
    },
  };
}
