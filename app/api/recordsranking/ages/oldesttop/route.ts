import { NextResponse } from "next/server";
import { getOldestTop } from "@/lib/recordsranking";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const top = Number(url.searchParams.get("top") ?? NaN);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 100)));

    if (!Number.isInteger(top) || top < 1) {
      return NextResponse.json({ error: "Param 'top' non valido" }, { status: 400 });
    }

    const data = await getOldestTop(top, limit);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching oldest at Top-X:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
