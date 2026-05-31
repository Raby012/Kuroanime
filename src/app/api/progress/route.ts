import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { anilistId, episode, season } = await req.json();

  const progress = await prisma.watchProgress.upsert({
    where: { userId_anilistId: { userId: session.user.id, anilistId } },
    update: { episode, season, updatedAt: new Date() },
    create: { userId: session.user.id, anilistId, episode, season: season || 1 },
  });
  return NextResponse.json(progress);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(null);

  const { searchParams } = new URL(req.url);
  const anilistId = parseInt(searchParams.get("anilistId") || "0");

  const progress = await prisma.watchProgress.findUnique({
    where: { userId_anilistId: { userId: session.user.id, anilistId } },
  });
  return NextResponse.json(progress);
}
