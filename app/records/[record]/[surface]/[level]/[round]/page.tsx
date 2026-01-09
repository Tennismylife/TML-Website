import SlugPage from '../../../../[...slug]/page';

export default async function Page({ params, searchParams }: { params: { record: string; surface: string; level: string; round: string }; searchParams: Record<string, string | string[] | undefined> }) {
  const slug = [params.record, params.surface, params.level, params.round];
  return await SlugPage({ params: { slug }, searchParams });
}