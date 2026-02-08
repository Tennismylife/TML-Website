import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Sanitize and limit size
    const payload = {
      receivedAt: new Date().toISOString(),
      url: body.url || null,
      userAgent: body.userAgent || null,
      cls: typeof body.cls === 'number' ? body.cls : null,
      entries: Array.isArray(body.entries) ? body.entries.slice(0, 50) : [],
      final: Boolean(body.final),
      clientTs: body.ts || null,
    };

    // Log to console for immediate visibility
    console.info('RUM CLS payload:', JSON.stringify(payload));

    // Append to a local JSONL file in tmp for quick analysis (best-effort)
    try {
      const tmpDir = path.join(process.cwd(), 'tmp');
      await fs.mkdir(tmpDir, { recursive: true });
      const file = path.join(tmpDir, 'rum-cls.jsonl');
      await fs.appendFile(file, JSON.stringify(payload) + '\n');
    } catch (e) {
      console.warn('Failed to write RUM CLS file:', e);
    }

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (err) {
    console.error('Error in RUM CLS endpoint:', err);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
