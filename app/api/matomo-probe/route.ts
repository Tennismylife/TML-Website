// Temporary POST probe endpoint: safely echoes parsed JSON body and headers.
export async function POST(req: Request) {
  try {
    const text = await req.text().catch(() => '');
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch (e) {
      body = { _raw: text };
    }

    const headers: Record<string, string | null> = {};
    for (const [k, v] of req.headers.entries()) headers[k] = v;

    return new Response(JSON.stringify({ ok: true, body, headers }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function GET() {
  return new Response(null, { status: 204 });
}
