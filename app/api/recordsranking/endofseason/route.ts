// File: app/api/recordsranking/agesendoftheseason/route.ts
import type { NextRequest } from 'next/server';

// Funzione GET vuota
export async function GET(req: NextRequest) {
  return new Response(null, { status: 204 }); // 204 No Content
}

// Se vuoi, puoi anche aggiungere POST o altri metodi vuoti
export async function POST(req: NextRequest) {
  return new Response(null, { status: 204 });
}
