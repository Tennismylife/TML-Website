import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { clearInProcessRecordsCache } from '@/lib/recordsPrefetchThrottle';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret');
  const expected = process.env.REVALIDATE_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  const tag = searchParams.get('tag');
  const type = searchParams.get('type'); // 'layout' per invalidare tutti i path figli

  if (path) {
    if (type === 'layout' || type === 'page') {
      revalidatePath(path, type);
    } else {
      revalidatePath(path);
    }
    return NextResponse.json({ revalidated: true, path, type: type ?? 'page' });
  }

  const resolvedTag = tag ?? 'records';
  if (resolvedTag === 'records') clearInProcessRecordsCache();
  revalidateTag(resolvedTag, {});
  return NextResponse.json({ revalidated: true, tag: resolvedTag });
}
