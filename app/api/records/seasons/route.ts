import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Your logic here
  const data = { message: 'Seasons endpoint working!' };
  return NextResponse.json(data);
}
