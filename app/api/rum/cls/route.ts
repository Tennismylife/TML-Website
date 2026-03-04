import { NextResponse } from 'next/server';

// RUM CLS endpoint disabled
export async function POST() {
  return NextResponse.json({ ok: false }, { status: 404 });
}
