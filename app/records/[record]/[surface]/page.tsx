import SlugPage from '../../[...slug]/page';

export default async function Page({ params, searchParams }: { params: { record: string; surface: string } | Promise<{ record: string; surface: string }>; searchParams: Record<string, string | string[] | undefined> }) {
  // `params` may be a thenable in the App Router; await it safely before accessing properties
  const p = (params && typeof (params as any)?.then === 'function') ? await (params as any) : (params || {} as { record: string; surface: string });
  const slug = [p.record, p.surface];
  return await SlugPage({ params: { slug }, searchParams });
}