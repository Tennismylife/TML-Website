import { NextRequest, NextResponse } from "next/server";
import { prismaForTour } from "@/lib/prisma";
import type { Tour } from "@/lib/tour-path";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id || id.length > 160) {
    return NextResponse.json({ error: "Invalid player identifier" }, { status: 400 });
  }

  const where = { OR: [{ slug: id.toLowerCase() }, { id }, { id: id.toUpperCase() }] };
  const tours: Tour[] = ["ATP", "WTA"];
  const players = await Promise.all(tours.map((tour) =>
    prismaForTour(tour).player.findFirst({ where, select: { id: true } })
  ));
  return NextResponse.json({ tours: tours.filter((_, index) => players[index] !== null) });
}
