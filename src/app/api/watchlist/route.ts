import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const watchlist = await prisma.watchlist.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(watchlist);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { anilistId, title, image, status } = body;

  const item = await prisma.watchlist.upsert({
    where: { userId_anilistId: { userId: session.user.id, anilistId } },
    update: { status, updatedAt: new Date() },
    create: { userId: session.user.id, anilistId, title, image, status: status || "PLANNING" },
  });
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const anilistId = parseInt(searchParams.get("anilistId") || "0");

  await prisma.watchlist.deleteMany({
    where: { userId: session.user.id, anilistId },
  });
  return NextResponse.json({ success: true });
}
