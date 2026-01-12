// POST-only probe that does NOT read body — returns received headers immediately.
export async function POST(req: Request) {
  try {
    const headers: Record<string, string | null> = {};
    for (const [k, v] of req.headers.entries()) headers[k] = v;
    return new Response(JSON.stringify({ ok: true, headers }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function GET() { return new Response(null, { status: 204 }); }
