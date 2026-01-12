// app/api/_events/collect/route.ts - removed
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Removed' }, { status: 410 });
}
