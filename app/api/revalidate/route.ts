import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret');
  const expected = process.env.REVALIDATE_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  const tag = searchParams.get('tag');

  if (path) {
    revalidatePath(path);
    return NextResponse.json({ revalidated: true, path });
  }

  const resolvedTag = tag ?? 'records';
  revalidateTag(resolvedTag, {});
  return NextResponse.json({ revalidated: true, tag: resolvedTag });
}
