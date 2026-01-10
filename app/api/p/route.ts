// app/api/p/route.ts
import { handleGa4Post, GET as GA_GET } from '../_ga4/handler';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  return handleGa4Post(req);
}
