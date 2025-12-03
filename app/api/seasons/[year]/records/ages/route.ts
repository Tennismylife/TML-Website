import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, context: any) {
  try {
    // support both Next.js versions where params can be a Promise or an object
    const params = await context?.params;
    const yearRaw = String(params?.year ?? '');
    const year = parseInt(yearRaw, 10);

    if (isNaN(year)) {
      return NextResponse.json({ error: 'Invalid year parameter' }, { status: 400 });
    }

    // ...existing code that uses `year` and `request` goes here...

    // Placeholder minimal successful response (replace with real payload)
    return NextResponse.json({ year });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
