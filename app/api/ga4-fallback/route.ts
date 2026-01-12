// app/api/ga4-fallback/route.ts - removed
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Removed' }, { status: 410 });
}
