import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'tmp', 'season-debug.json');

export async function GET() {
  try {
    if (fs.existsSync(FILE)) {
      const raw = fs.readFileSync(FILE, 'utf-8');
      const parsed = JSON.parse(raw || 'null');
      return NextResponse.json({ debug: parsed });
    }
  } catch (e) {}
  return NextResponse.json({ debug: null });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); } catch (e) {}
    fs.writeFileSync(FILE, JSON.stringify({ ...body, _ts: new Date().toISOString() }, null, 2), 'utf-8');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return new NextResponse(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
}
