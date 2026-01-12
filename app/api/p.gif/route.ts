// app/api/p.gif/route.ts - removed
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Removed' }, { status: 410 });
}
