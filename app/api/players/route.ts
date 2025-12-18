// app/api/players/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const slug = searchParams.get("slug") || searchParams.get("name");

    if (!id && !slug) {
      return NextResponse.json(
        { error: "Missing 'id' or 'slug' parameter" },
        { status: 400 }
      );
    }

    // Try find by id first
    let player = id ? await prisma.player.findUnique({
      where: { id },
      select: {
        id: true,
        player: true,
        atpname: true,
        coaches: true,
        ioc: true,
        hand: true,
        backhand: true,
        birthdate: true,
        height: true,
        weight: true,
        turnedpro: true,
        birthplace: true,
      },
    }) : null;

    // If not found by id, allow lookup by slug/name (slug format 'first-last')
    if (!player && slug) {
      const lookupName = slug.replace(/-/g, " ");
      player = await prisma.player.findFirst({
        where: { atpname: { equals: lookupName, mode: "insensitive" } },
        select: {
          id: true,
          player: true,
          atpname: true,
          coaches: true,
          ioc: true,
          hand: true,
          backhand: true,
          birthdate: true,
          height: true,
          weight: true,
          turnedpro: true,
          birthplace: true,
        },
      });
    }

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    return NextResponse.json(player);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
