import { generateMetadata as generateSlugMetadata } from '../../../[...slug]/page';
import { Metadata } from 'next';
import RoundsOnEntriesServer from '@/app/records/RoundsOnEntries/RoundsOnEntries.server';

type Props = {
  params: Promise<{ title: string }>;
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { title } = await params;
  const sp = (await (searchParams ?? Promise.resolve({}))) as Record<string, string | string[] | undefined>;
  return generateSlugMetadata({
    params: Promise.resolve({ slug: ['roundsonentries', 'round'] }),
    searchParams: Promise.resolve({ ...sp, round: title }),
  });
}

export default async function RoundPage({ params }: { params: Promise<{ title: string }> }) {
  const { title } = await params;
  return <RoundsOnEntriesServer searchParams={{ round: title }} />;
}
