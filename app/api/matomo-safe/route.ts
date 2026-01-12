// Temporary safe endpoint: accepts POST and always returns 204 quickly.
// Used as a fallback when /api/matomo returns 5xx in production.
export async function POST(req: Request) {
  try {
    // Very small, non-blocking acknowledgement. No parsing, no external calls.
    return new Response(null, { status: 204 });
  } catch (e) {
    return new Response(null, { status: 204 });
  }
}

export async function GET() { return new Response(null, { status: 204 }); }
