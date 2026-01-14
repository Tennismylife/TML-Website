// app/api/records/timespan/route.tsx

import { NextRequest, NextResponse } from "next/server";
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ });
  } catch (error) {
    console.error("Error fetching timespan:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}