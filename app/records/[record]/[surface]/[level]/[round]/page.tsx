import SlugPage, { generateMetadata as generateSlugMetadata } from '../../../../[...slug]/page';
import { Metadata } from 'next';

type PageProps = {
  params: Promise<{
    record: string;
    surface: string;
    level: string;
    round: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const p = await params;
  const slug = [p.record, p.surface, p.level, p.round];

  return generateSlugMetadata({
    params: Promise.resolve({ slug }),
    searchParams: searchParams ?? Promise.resolve({}),
  });
}

export default async function Page({ params, searchParams }: PageProps) {
  const p = await params;
  const slug = [p.record, p.surface, p.level, p.round];

  return SlugPage({
    params: Promise.resolve({ slug }),
    searchParams: searchParams ?? Promise.resolve({}),
  });
}