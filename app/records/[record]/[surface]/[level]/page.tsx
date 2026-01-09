import SlugPage from '../../../[...slug]/page';

type PageProps = {
  params: Promise<{
    record: string;
    surface: string;
    level: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const p = await params;
  const slug = [p.record, p.surface, p.level];

  return SlugPage({
    params: Promise.resolve({ slug }),
    searchParams: searchParams ?? Promise.resolve({}),
  });
}
