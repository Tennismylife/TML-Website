import { generateMetadata as generateSlugMetadata } from '../../[...slug]/page';
import { Metadata } from 'next';
import RoundsOnEntriesServer from '@/app/records/RoundsOnEntries/RoundsOnEntries.server';

type Props = {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return generateSlugMetadata({
    params: Promise.resolve({ slug: ['roundsonentries', 'titles'] }),
    searchParams: searchParams ?? Promise.resolve({}),
  });
}

export default async function TitlesPage() {
  return <RoundsOnEntriesServer searchParams={{}} serverProps={{ sub: 'titles' }} />;
}
