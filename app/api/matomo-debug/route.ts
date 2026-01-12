// Temporary debug route to echo POST body and selected headers for remote diagnostics
export async function POST(req: Request) {
  try {
    const text = await req.text().catch(() => '');
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch (e) { body = { _raw: text }; }

    const headers: Record<string,string|null> = {
      'user-agent': req.headers.get('user-agent'),
      'x-forwarded-for': req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || req.headers.get('x-original-ip') || null,
      'referer': req.headers.get('referer') || req.headers.get('referrer') || null,
    };

    return new Response(JSON.stringify({ ok: true, body, headers }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function GET() { return new Response(null, { status: 204 }); }